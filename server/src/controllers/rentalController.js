import Item from "../models/Item.js";
import RentalRequest from "../models/RentalRequest.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import Conversation from "../models/Conversation.js";
import asyncHandler from "../utils/asyncHandler.js";
import { notifyUser, notifyAdmins } from "../utils/notificationHelper.js";
import { getSetting } from "../utils/settingsHelper.js";
import emailService from "../services/emailService.js";
import { baseLayout } from "../templates/baseLayout.js";
import { createRefund } from "../services/paymentService.js";
import { createAndStoreInvoice } from "../services/invoiceService.js";

const populateRequest = (query) =>
  query
    .populate("item")
    .populate("owner", "name email campus location ratingsAverage ratingsCount avatarUrl balance")
    .populate("renter", "name email campus location ratingsAverage ratingsCount avatarUrl balance")
    .populate("poc", "name email campus location");

const getRentalDurationDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const milliseconds = end.getTime() - start.getTime();
  const days = Math.ceil(milliseconds / (1000 * 60 * 60 * 24)) || 1;
  return Math.max(days, 1);
};

export const createRentalRequest = asyncHandler(async (req, res) => {
  const {
    itemId,
    startDate,
    endDate,
    message,
    paymentMethod = "online",
    requestType = "rental",
    deliveryAddress = "",
    paymentReference = "",
    couponCode = "",
  } = req.body;

  const normalizedRequestType = requestType === "purchase" ? "purchase" : "rental";

  if (!itemId) {
    res.status(400);
    throw new Error("Item is required");
  }

  if (normalizedRequestType === "rental" && (!startDate || !endDate)) {
    res.status(400);
    throw new Error("Start date and end date are required for rentals");
  }

  const item = await Item.findById(itemId);
  if (!item) {
    res.status(404);
    throw new Error("Item not found");
  }

  if (item.owner.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error("You cannot place an order for your own item");
  }

  if (item.availabilityStatus === "sold") {
    res.status(400);
    throw new Error("Item has already been sold");
  }

  if (item.availabilityStatus === "rented") {
    res.status(400);
    throw new Error("Item is already rented");
  }

  const existingPendingRequest = await RentalRequest.findOne({
    item: item._id,
    renter: req.user._id,
    status: { $in: ["Payment Successful", "POC Assigned", "Picked Up", "Out For Delivery"] },
  });

  if (existingPendingRequest) {
    res.status(409);
    throw new Error("You already have an active booking or order for this item");
  }

  const basePrice =
    normalizedRequestType === "purchase"
      ? item.salePrice ?? item.rentalPrice ?? item.price
      : getRentalDurationDays(startDate, endDate) * (item.rentalPrice ?? item.salePrice ?? item.price);

  if (!Number.isFinite(basePrice) || basePrice < 0) {
    res.status(400);
    throw new Error("Invalid total price");
  }

  // Validate coupon if supplied
  let discountAmount = 0;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });
    if (!coupon) {
      res.status(400);
      throw new Error("Invalid coupon code.");
    }
    if (!coupon.isActive) {
      res.status(400);
      throw new Error("This coupon is no longer active.");
    }
    if (new Date(coupon.expiryDate) < new Date()) {
      res.status(400);
      throw new Error("This coupon has expired.");
    }

    if (coupon.discountType === "percentage") {
      discountAmount = (basePrice * coupon.value) / 100;
    } else {
      discountAmount = coupon.value;
    }
    discountAmount = Math.min(discountAmount, basePrice);
  }

  const totalPrice = basePrice - discountAmount;

  const renter = await User.findById(req.user._id);

  const isDirectPayment = paymentReference && (
    paymentReference.startsWith("pay_") ||
    paymentReference.startsWith("RENTED-SANDBOX-") ||
    paymentReference.startsWith("order_")
  );

  // Prevent duplicate checkout payment submissions
  if (paymentMethod !== "cod" && paymentReference) {
    const duplicate = await RentalRequest.findOne({
      $or: [{ paymentReference }, { dummyPaymentReference: paymentReference }]
    });
    if (duplicate) {
      res.status(400);
      throw new Error("This payment reference has already been used to checkout");
    }
  }

  // Payments (online + UPI apps): debit renter wallet immediately for escrow holding unless paid directly via Razorpay.
  if (paymentMethod !== "cod" && !isDirectPayment) {
    if (renter.balance < totalPrice) {
      res.status(400);
      throw new Error(`Insufficient wallet balance. You need Rs. ${totalPrice} (Your Balance: Rs. ${renter.balance})`);
    }
    renter.balance -= totalPrice;
    await renter.save();
  }

  // Generate QR Codes
  const pickupQrCode = "P-" + Math.floor(100000 + Math.random() * 900000);
  const deliveryQrCode = "D-" + Math.floor(100000 + Math.random() * 900000);

  const initialStatus = "Payment Successful";

  const request = await RentalRequest.create({
    requestType: normalizedRequestType,
    item: item._id,
    owner: item.owner,
    renter: renter._id,
    startDate: normalizedRequestType === "rental" ? startDate : null,
    endDate: normalizedRequestType === "rental" ? endDate : null,
    message: message || "",
    paymentMethod,
    status: initialStatus,
    totalPrice,
    dummyPaymentStatus: paymentMethod === "cod" ? "cod_pending" : "captured",
    dummyPaymentReference: paymentReference || (paymentMethod === "cod" ? `COD-${Date.now()}` : `REF-${Date.now()}`),
    paymentReference: paymentReference || (paymentMethod === "cod" ? `COD-${Date.now()}` : `REF-${Date.now()}`),
    deliveryAddress: deliveryAddress || renter.location,
    pickupQrCode,
    deliveryQrCode,
    trackingStatus: initialStatus,
    trackingHistory: [{ status: initialStatus, location: "Order Placed" }],
    couponCode: couponCode || "",
  });

  // Automatically create a secure context-locked conversation for this order
  await Conversation.create({
    item: item._id,
    rentalRequest: request._id,
    participants: [renter._id, item.owner],
    lastMessage: `Order placed. Chat initialized for ${normalizedRequestType === "purchase" ? "purchase" : "rental"}.`,
    lastMessageAt: new Date(),
    status: "active",
    unreadCount: {
      [renter._id.toString()]: 0,
      [item.owner.toString()]: 0
    }
  });

  // Link transactions / Create new wallet payouts
  if (paymentMethod !== "cod") {
    if (isDirectPayment && paymentReference.startsWith("pay_")) {
      const tx = await Transaction.findOne({ paymentId: paymentReference });
      if (tx) {
        tx.order = request._id;
        await tx.save();
      }
    } else {
      await Transaction.create({
        user: renter._id,
        order: request._id,
        amount: totalPrice,
        type: "payment",
        status: "completed",
        paymentId: paymentReference || `pay_wallet_${Date.now()}`,
        gateway: paymentReference.startsWith("RENTED-SANDBOX-") ? "sandbox" : "wallet",
        escrowStatus: "held",
        paidAt: new Date(),
      });
    }
  }

  item.availabilityStatus = normalizedRequestType === "purchase" ? "sold" : "rented";
  await item.save();

  // Create notifications
  await notifyUser(item.owner, "New Order Received", `A student has placed an order for your listing: "${item.title}". Please accept it to proceed.`);
  await notifyUser(renter._id, "Order Placed Successfully", `Your order for "${item.title}" has been created. Status: ${initialStatus}.`);
  await notifyAdmins("New Platform Order Created", `Order ID ${request._id} placed by ${renter.name} for Rs. ${totalPrice}.`);

  // Send email alerts
  try {
    const owner = await User.findById(item.owner);
    if (owner && owner.email) {
      await emailService.sendSellerNotification(owner.email, request, item, "new_order");
    }
    if (renter && renter.email) {
      await emailService.sendOrderConfirmation(renter.email, request, item);
    }
    if (totalPrice >= 2000) {
      await emailService.sendAdminAlert(
        "High-Value Order Placed",
        `Order ID ${request._id} was placed by ${renter.name} for Rs. ${totalPrice}.`
      );
    }
  } catch (err) {
    console.error("Failed to send order placement emails:", err.message);
  }

  // Auto-generate invoice PDF
  try {
    const fullOrder = await populateRequest(RentalRequest.findById(request._id));
    await createAndStoreInvoice(fullOrder);
  } catch (invoiceErr) {
    console.error("[Invoice] Auto-generation failed:", invoiceErr.message);
  }

  const populatedRequest = await populateRequest(RentalRequest.findById(request._id));
  res.status(201).json(populatedRequest);
});

export const getMyRentalRequests = asyncHandler(async (req, res) => {
  const requests = await populateRequest(
    RentalRequest.find({
      $or: [{ owner: req.user._id }, { renter: req.user._id }, { poc: req.user._id }],
    }).sort({ createdAt: -1 }),
  );

  res.json(requests);
});

export const acceptOrder = asyncHandler(async (req, res) => {
  const request = await RentalRequest.findById(req.params.requestId).populate("item");
  if (!request) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (request.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the seller can accept this order");
  }

  request.status = "Seller Accepted";
  request.trackingStatus = "Seller Accepted";
  request.trackingHistory.push({ status: "Seller Accepted", location: "Seller's Location" });
  await request.save();

  await notifyUser(request.renter, "Order Accepted by Seller", `The seller has accepted your order for "${request.item.title}". A campus POC will be assigned shortly.`);
  await notifyAdmins("Order Accepted by Seller", `Order ${request._id} was accepted by the seller.`);

  try {
    const renter = await User.findById(request.renter);
    if (renter && renter.email) {
      await emailService.sendPickupNotification(renter.email, request, request.item, "renter");
    }
  } catch (err) {
    console.error("Failed to send order acceptance email:", err.message);
  }

  // Automatically notify approved campus POCs that a new task is available
  try {
    const campusPocs = await User.find({ role: "poc", isPocApproved: true, collegeName: request.item.collegeName });
    for (const poc of campusPocs) {
      await notifyUser(
        poc._id,
        "New Campus Pickup Available",
        `Seller ${req.user.name} has accepted an order for "${request.item.title}". Claim this task to collect it.`,
        "available_task"
      );
    }
  } catch (err) {
    console.error("Failed to notify campus POCs on order accept:", err.message);
  }

  res.json(await populateRequest(RentalRequest.findById(request._id)));
});

export const rejectOrder = asyncHandler(async (req, res) => {
  const request = await RentalRequest.findById(req.params.requestId).populate("item");
  if (!request) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (request.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the seller can reject this order");
  }

  request.status = "Seller Rejected";
  request.trackingStatus = "Seller Rejected";
  request.trackingHistory.push({ status: "Seller Rejected", location: "Seller Rejected Order" });

  // Refund renter if payment was made online
  if (request.paymentMethod !== "cod") {
    const renter = await User.findById(request.renter);
    renter.balance += request.totalPrice;
    await renter.save();

    await Transaction.create({
      user: renter._id,
      amount: request.totalPrice,
      type: "refund",
      status: "completed",
    });
  }

  request.item.availabilityStatus = "available";
  await request.item.save();
  await request.save();

  await notifyUser(request.renter, "Order Rejected", `We're sorry, the seller rejected your order for "${request.item.title}". Any money debited has been refunded to your wallet.`);
  await notifyAdmins("Order Rejected", `Order ${request._id} rejected. Refund processed.`);

  try {
    const renter = await User.findById(request.renter);
    if (renter && renter.email) {
      await emailService.sendOrderCancelledEmail(renter.email, request, request.item, "seller");
      if (request.paymentMethod !== "cod") {
        await emailService.sendRefundEmail(renter.email, request, request.item);
      }
    }
  } catch (err) {
    console.error("Failed to send order rejection email:", err.message);
  }

  res.json(await populateRequest(RentalRequest.findById(request._id)));
});

export const claimDeliveryTask = asyncHandler(async (req, res) => {
  const request = await RentalRequest.findById(req.params.requestId).populate("item");
  if (!request) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (req.user.role !== "poc") {
    res.status(403);
    throw new Error("Only verified POCs can claim delivery tasks");
  }

  request.poc = req.user._id;
  request.status = "POC Assigned";
  request.trackingStatus = "POC Assigned";
  request.trackingHistory.push({ status: "POC Assigned", location: `Assigned to POC: ${req.user.name}` });
  await request.save();

  // Automatically add POC to the conversation
  const conversation = await Conversation.findOne({ rentalRequest: request._id });
  if (conversation) {
    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      conversation.participants.push(req.user._id);
      if (conversation.unreadCount) {
        conversation.unreadCount.set(req.user._id.toString(), 0);
      }
      conversation.lastMessage = `POC ${req.user.name} added to the chat.`;
      conversation.lastMessageAt = new Date();
      await conversation.save();
    }
  }

  await notifyUser(request.renter, "POC Assigned", `Your POC "${req.user.name}" has been assigned to deliver your order.`);
  await notifyUser(request.owner, "POC Assigned", `POC "${req.user.name}" has claimed this pickup. Please prepare the item for pickup.`);

  try {
    const renter = await User.findById(request.renter);
    const seller = await User.findById(request.owner);
    const poc = req.user;

    const populatedOrder = {
      ...request.toObject(),
      poc: {
        name: poc.name,
        phone: poc.phone,
      }
    };

    if (renter && renter.email) {
      await emailService.sendPickupNotification(renter.email, populatedOrder, request.item, "renter");
    }
    if (seller && seller.email) {
      await emailService.sendPickupNotification(seller.email, populatedOrder, request.item, "seller");
    }
    if (poc && poc.email) {
      await emailService.sendPickupNotification(poc.email, populatedOrder, request.item, "poc");
    }
  } catch (err) {
    console.error("Failed to send POC assignment emails:", err.message);
  }

  res.json(await populateRequest(RentalRequest.findById(request._id)));
});

export const schedulePickup = asyncHandler(async (req, res) => {
  const request = await RentalRequest.findById(req.params.requestId).populate("item");
  if (!request) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (request.poc?.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the assigned POC can schedule this pickup");
  }

  request.status = "Pickup Scheduled";
  request.trackingStatus = "Pickup Scheduled";
  request.trackingHistory.push({ status: "Pickup Scheduled", location: "Scheduled for collection" });
  await request.save();

  await notifyUser(request.owner, "Collection Pickup Scheduled", `The POC has scheduled the pickup. Please keep the item ready.`);
  res.json(await populateRequest(RentalRequest.findById(request._id)));
});

export const verifyPickup = asyncHandler(async (req, res) => {
  const { qrCode } = req.body;
  const request = await RentalRequest.findById(req.params.requestId).populate("item");
  if (!request) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (request.poc?.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the assigned POC can verify this pickup");
  }

  if (request.pickupQrCode !== qrCode) {
    res.status(400);
    throw new Error("Invalid Pickup QR Code");
  }

  request.status = "Picked Up";
  request.trackingStatus = "Picked Up";
  request.trackingHistory.push({ status: "Picked Up", location: "Collected from Seller" });
  await request.save();

  await notifyUser(request.owner, "Item Handed Over", `You have successfully handed over "${request.item.title}" to the POC.`);
  await notifyUser(request.renter, "Item Picked Up", `The POC has picked up your item from the seller and is heading your way.`);

  try {
    const renter = await User.findById(request.renter);
    if (renter && renter.email) {
      await emailService.sendDeliveryConfirmation(renter.email, request, request.item, "Picked Up");
    }
  } catch (err) {
    console.error("Failed to send pickup email:", err.message);
  }

  res.json(await populateRequest(RentalRequest.findById(request._id)));
});

export const startDelivery = asyncHandler(async (req, res) => {
  const request = await RentalRequest.findById(req.params.requestId).populate("item");
  if (!request) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (request.poc?.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the assigned POC can initiate delivery");
  }

  request.status = "Out For Delivery";
  request.trackingStatus = "Out For Delivery";
  request.trackingHistory.push({ status: "Out For Delivery", location: "Out for campus delivery" });
  await request.save();

  await notifyUser(request.renter, "Out For Delivery", `Your order is out for delivery with POC ${req.user.name}. Keep your Delivery QR Code ready.`);

  try {
    const renter = await User.findById(request.renter);
    if (renter && renter.email) {
      await emailService.sendDeliveryConfirmation(renter.email, request, request.item, "Out For Delivery");
    }
  } catch (err) {
    console.error("Failed to send out-for-delivery email:", err.message);
  }

  res.json(await populateRequest(RentalRequest.findById(request._id)));
});

export const verifyDelivery = asyncHandler(async (req, res) => {
  const { qrCode, proofPhoto } = req.body;
  const request = await RentalRequest.findById(req.params.requestId).populate("item");
  if (!request) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (request.poc?.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the assigned POC can verify delivery");
  }

  if (request.deliveryQrCode !== qrCode) {
    res.status(400);
    throw new Error("Invalid Delivery QR Code");
  }

  request.status = "Delivered";
  request.trackingStatus = "Delivered";
  request.proofPhoto = proofPhoto || "";
  request.trackingHistory.push({ status: "Delivered", location: "Handed over to Renter" });
  await request.save();

  await notifyUser(request.renter, "Order Delivered", `Your order has been delivered by the POC. Please click "Confirm Receipt" on your dashboard to release funds.`);
  await notifyUser(request.owner, "Order Delivered to Buyer", `The POC has successfully delivered your item to the buyer.`);
  await notifyAdmins("Order Delivered", `Order ${request._id} has been marked as Delivered.`);

  try {
    const renter = await User.findById(request.renter);
    if (renter && renter.email) {
      await emailService.sendDeliveryConfirmation(renter.email, request, request.item, "Delivered");
    }
  } catch (err) {
    console.error("Failed to send delivered email:", err.message);
  }

  res.json(await populateRequest(RentalRequest.findById(request._id)));
});

export const confirmReceipt = asyncHandler(async (req, res) => {
  const request = await RentalRequest.findById(req.params.requestId).populate("item");
  if (!request) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (request.renter.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the buyer/renter can confirm delivery receipt");
  }

  const isRental = request.requestType === "rental";

  // Calculate platform commission and release remainder to seller wallet
  const commissionRate = await getSetting("commission_rate", 10);
  const commission = request.totalPrice * (commissionRate / 100);
  const payout = request.totalPrice - commission;

  const seller = await User.findById(request.owner);
  seller.balance += payout;
  await seller.save();

  // Update original payment transaction's escrow status
  try {
    const originalTx = await Transaction.findOne({ order: request._id, type: "payment" });
    if (originalTx) {
      originalTx.escrowStatus = "released";
      originalTx.releasedAt = new Date();
      await originalTx.save();
    }
  } catch (err) {
    console.error("Failed to update original transaction escrow status:", err.message);
  }

  // Log transactions
  await Transaction.create({
    user: seller._id,
    order: request._id,
    amount: payout,
    type: "release_to_seller",
    status: "completed",
  });

  await Transaction.create({
    user: req.user._id,
    order: request._id,
    amount: commission,
    type: "commission",
    status: "completed",
  });

  request.status = isRental ? "Rental Active" : "Completed";
  request.trackingStatus = isRental ? "Rental Active" : "Completed";
  request.commissionAmount = commission;
  request.earningsReleased = true;
  request.trackingHistory.push({ status: request.status, location: "Funds Released" });
  await request.save();

  await notifyUser(request.owner, "Earnings Released!", `Rs. ${payout} has been credited to your wallet (after ${commissionRate}% commission of Rs. ${commission}) for selling/renting "${request.item.title}".`);
  await notifyUser(req.user._id, "Order Receipt Confirmed", `Thank you! Funds have been released to the seller.`);
  await notifyAdmins("Earnings Released", `Order ID ${request._id}: released Rs. ${payout} to Seller, commission of Rs. ${commission} earned.`);

  try {
    if (seller && seller.email) {
      const orderWithCommission = {
        ...request.toObject(),
        commissionAmount: commission,
      };
      await emailService.sendSellerNotification(seller.email, orderWithCommission, request.item, "release_to_seller");
    }
  } catch (err) {
    console.error("Failed to send seller payout email:", err.message);
  }

  res.json(await populateRequest(RentalRequest.findById(request._id)));
});

export const requestReturn = asyncHandler(async (req, res) => {
  const request = await RentalRequest.findById(req.params.requestId).populate("item");
  if (!request) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (request.renter.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the renter can request a return");
  }

  if (request.requestType !== "rental") {
    res.status(400);
    throw new Error("Return requests can only be made for rental items");
  }

  request.status = "Return Requested";
  request.trackingStatus = "Return Requested";
  request.trackingHistory.push({ status: "Return Requested", location: "Renter initiated rental return" });
  await request.save();

  await notifyUser(request.owner, "Return Requested", `The renter has initiated a return for your rental item: "${request.item.title}". A POC will claim this pickup.`);
  if (request.poc) {
    await notifyUser(request.poc, "Return Requested", `Renter has initiated return for "${request.item.title}". Please pick it up from the renter.`);
  }

  res.json(await populateRequest(RentalRequest.findById(request._id)));
});

export const verifyReturn = asyncHandler(async (req, res) => {
  const request = await RentalRequest.findById(req.params.requestId).populate("item");
  if (!request) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (request.poc?.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the assigned POC can collect this return");
  }

  request.status = "Returned";
  request.trackingStatus = "Returned";
  request.trackingHistory.push({ status: "Returned", location: "Collected and handed back to Seller" });
  await request.save();

  await notifyUser(request.owner, "Item Returned to College", `The POC has collected the rental item from the renter and is delivering it back to you.`);
  await notifyUser(request.renter, "Item Collected", `The POC has collected the rental item. Thank you!`);

  res.json(await populateRequest(RentalRequest.findById(request._id)));
});

export const completeReturn = asyncHandler(async (req, res) => {
  const request = await RentalRequest.findById(req.params.requestId).populate("item");
  if (!request) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (request.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the seller/owner can complete the return");
  }

  request.status = "Completed";
  request.trackingStatus = "Completed";
  request.item.availabilityStatus = "available";
  request.trackingHistory.push({ status: "Completed", location: "Return inspected and Completed" });
  
  await request.item.save();
  await request.save();

  await notifyUser(request.renter, "Rental Closed", `The seller has confirmed receipt of "${request.item.title}". Your rental is now closed.`);
  await notifyAdmins("Rental Return Completed", `Rental order ${request._id} marked as fully Completed.`);

  try {
    const renter = await User.findById(request.renter);
    if (renter && renter.email) {
      const subject = `Rental Closed: ${request.item.title}`;
      const content = `
        <h2>Rental Closed Successfully! 🎉</h2>
        <p>Hi ${renter.name},</p>
        <p>The seller has inspected and confirmed receipt of the rental item <b>"${request.item.title}"</b>. Your rental transaction is now fully closed.</p>
        <div class="card">
          <div class="card-title">Rental Details</div>
          <p>🛍️ <b>Item</b>: ${request.item.title}</p>
          <p>💰 <b>Total Price Paid</b>: Rs. ${request.totalPrice}</p>
          <p>✅ <b>Status</b>: Fully Closed & Returned</p>
        </div>
        <p>Thank you for using RentED! We look forward to seeing you borrow or share more campus resources soon.</p>
      `;
      await emailService.sendEmail({ to: renter.email, subject, html: baseLayout(subject, content) });
    }
  } catch (err) {
    console.error("Failed to send rental closed email:", err.message);
  }

  res.json(await populateRequest(RentalRequest.findById(request._id)));
});

export const cancelRentalRequest = asyncHandler(async (req, res) => {
  const request = await RentalRequest.findById(req.params.requestId).populate("item");
  if (!request) {
    res.status(404);
    throw new Error("Order not found");
  }

  const isRenter = request.renter.toString() === req.user._id.toString();
  const isOwner = request.owner.toString() === req.user._id.toString();

  if (!isRenter && !isOwner) {
    res.status(403);
    throw new Error("You cannot cancel this transaction");
  }

  if (["Picked Up", "Out For Delivery", "Delivered", "Rental Active", "Completed"].includes(request.status)) {
    res.status(400);
    throw new Error("Cannot cancel an order that has already been shipped/completed");
  }

  request.status = "Cancelled";
  request.trackingStatus = "Cancelled";
  request.trackingHistory.push({ status: "Cancelled", location: "Cancelled by User" });

  // Refund buyer if payment was online
  if (request.paymentMethod !== "cod") {
    const renter = await User.findById(request.renter);
    const originalTx = await Transaction.findOne({ order: request._id, type: "payment" });

    if (originalTx && originalTx.paymentId && originalTx.paymentId.startsWith("pay_")) {
      try {
        const refund = await createRefund(originalTx.paymentId, request.totalPrice);
        originalTx.escrowStatus = "refunded";
        originalTx.refundId = refund.id;
        originalTx.refundStatus = "processed";
        await originalTx.save();

        await Transaction.create({
          user: renter._id,
          order: request._id,
          amount: request.totalPrice,
          type: "refund",
          status: "completed",
          paymentId: refund.id,
          gateway: "razorpay",
          refundId: refund.id,
          refundStatus: "processed",
        });
      } catch (err) {
        console.error("Razorpay refund failed, fallback to wallet balance:", err.message);
        renter.balance += request.totalPrice;
        await renter.save();

        await Transaction.create({
          user: renter._id,
          order: request._id,
          amount: request.totalPrice,
          type: "refund",
          status: "completed",
        });
      }
    } else {
      renter.balance += request.totalPrice;
      await renter.save();

      await Transaction.create({
        user: renter._id,
        order: request._id,
        amount: request.totalPrice,
        type: "refund",
        status: "completed",
      });

      if (originalTx) {
        originalTx.escrowStatus = "refunded";
        originalTx.refundStatus = "completed";
        await originalTx.save();
      }
    }
  }

  request.item.availabilityStatus = "available";
  await request.item.save();
  await request.save();

  await notifyUser(request.owner, "Order Cancelled", `The order for "${request.item.title}" was cancelled.`);
  await notifyUser(request.renter, "Order Cancelled", `Your order for "${request.item.title}" was cancelled. Refunds processed.`);

  try {
    const renter = await User.findById(request.renter);
    const seller = await User.findById(request.owner);
    const initiatorRole = isRenter ? "buyer" : "seller";

    if (renter && renter.email) {
      await emailService.sendOrderCancelledEmail(renter.email, request, request.item, initiatorRole);
      if (request.paymentMethod !== "cod") {
        await emailService.sendRefundEmail(renter.email, request, request.item);
      }
    }
    if (seller && seller.email) {
      await emailService.sendOrderCancelledEmail(seller.email, request, request.item, initiatorRole);
    }
  } catch (err) {
    console.error("Failed to send order cancellation emails:", err.message);
  }

  res.json(await populateRequest(RentalRequest.findById(request._id)));
});

export const adminUpdateRental = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied: Admins only");
  }

  const request = await RentalRequest.findById(req.params.requestId).populate("item");
  if (!request) {
    res.status(404);
    throw new Error("Order not found");
  }

  const { status, pocId } = req.body;

  if (status !== undefined) {
    request.status = status;
    request.trackingStatus = status;
    request.trackingHistory.push({ status, location: `Status manually updated by Admin` });

    if (["Cancelled", "Completed"].includes(status)) {
      request.item.availabilityStatus = "available";
      await request.item.save();
    } else if (status === "Delivered") {
      request.item.availabilityStatus = "rented";
      await request.item.save();
    }
  }

  const oldPoc = request.poc;

  if (pocId !== undefined) {
    if (pocId === "" || pocId === null) {
      request.poc = null;
    } else {
      const pocUser = await User.findById(pocId);
      if (!pocUser || pocUser.role !== "poc") {
        res.status(400);
        throw new Error("Invalid POC User");
      }
      request.poc = pocUser._id;
      if (request.status === "Seller Accepted") {
        request.status = "POC Assigned";
        request.trackingStatus = "POC Assigned";
        request.trackingHistory.push({ status: "POC Assigned", location: `POC dispatcher assigned by Admin` });
      }
    }
  }

  await request.save();

  // Update conversation participants for POC assignment change
  const conversation = await Conversation.findOne({ rentalRequest: request._id });
  if (conversation) {
    if (!request.poc) {
      // Find and remove any POC participants
      const users = await User.find({ _id: { $in: conversation.participants } });
      const pocs = users.filter(u => u.role === "poc").map(u => u._id.toString());
      if (pocs.length > 0) {
        conversation.participants = conversation.participants.filter(p => !pocs.includes(p.toString()));
        pocs.forEach(pId => conversation.unreadCount.delete(pId));
        conversation.lastMessage = "POC unassigned from order chat.";
        conversation.lastMessageAt = new Date();
        await conversation.save();
      }
    } else if (request.poc && (!oldPoc || oldPoc.toString() !== request.poc.toString())) {
      // Remove any existing POC participants first
      const users = await User.find({ _id: { $in: conversation.participants } });
      const oldPocs = users.filter(u => u.role === "poc").map(u => u._id.toString());
      conversation.participants = conversation.participants.filter(p => !oldPocs.includes(p.toString()));
      oldPocs.forEach(pId => conversation.unreadCount.delete(pId));

      // Add the new POC participant
      conversation.participants.push(request.poc);
      if (conversation.unreadCount) {
        conversation.unreadCount.set(request.poc.toString(), 0);
      }
      
      const newPocUser = await User.findById(request.poc);
      conversation.lastMessage = `POC ${newPocUser.name} assigned to order chat.`;
      conversation.lastMessageAt = new Date();
      await conversation.save();
    }
  }
  res.json(await populateRequest(RentalRequest.findById(request._id)));
});

export const rejectDeliveryTask = asyncHandler(async (req, res) => {
  const request = await RentalRequest.findById(req.params.requestId).populate("item");
  if (!request) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (request.poc?.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the assigned POC can reject this assignment");
  }

  const { reason } = req.body;

  request.poc = null;
  request.status = "Seller Accepted";
  request.trackingStatus = "Seller Accepted";
  request.trackingHistory.push({ 
    status: "Seller Accepted", 
    location: `Rejected by POC (${req.user.name}). Reason: ${reason || "None specified"}` 
  });
  await request.save();

  // Remove POC from conversation
  const conversation = await Conversation.findOne({ rentalRequest: request._id });
  if (conversation) {
    conversation.participants = conversation.participants.filter(
      p => p.toString() !== req.user._id.toString()
    );
    if (conversation.unreadCount) {
      conversation.unreadCount.delete(req.user._id.toString());
    }
    conversation.lastMessage = `POC ${req.user.name} rejected task and left chat.`;
    conversation.lastMessageAt = new Date();
    await conversation.save();
  }

  await notifyAdmins("POC Rejected Assignment", `Order ${request._id} assignment was rejected by POC ${req.user.name}. Reason: "${reason || "None specified"}"`);

  res.json(await populateRequest(RentalRequest.findById(request._id)));
});

export const notifyPocHandover = asyncHandler(async (req, res) => {
  const request = await RentalRequest.findById(req.params.requestId).populate("item");
  if (!request) {
    res.status(404);
    throw new Error("Order not found");
  }

  const seller = await User.findById(request.owner);

  if (request.poc) {
    await notifyUser(
      request.poc,
      "Handover Ready from Seller",
      `Seller ${seller.name} is ready to hand over "${request.item.title}". Please collect the item using OTP code: ${request.pickupQrCode}.`,
      "handover"
    );
  } else {
    const campusPocs = await User.find({ role: "poc", isPocApproved: true, collegeName: request.item.collegeName });
    for (const poc of campusPocs) {
      await notifyUser(
        poc._id,
        "Handover Reminder: Campus Pickup Available",
        `Seller ${seller.name} is waiting to hand over "${request.item.title}" for Order ID ${request._id}. Claim this task to collect it.`,
        "available_task"
      );
    }
  }

  res.json({ success: true, message: "Handover signal sent to POC dispatcher." });
});
