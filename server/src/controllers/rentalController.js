import Item from "../models/Item.js";
import RentalRequest from "../models/RentalRequest.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import Conversation from "../models/Conversation.js";
import Escrow from "../models/Escrow.js";
import asyncHandler from "../utils/asyncHandler.js";
import { notifyUser, notifyAdmins } from "../utils/notificationHelper.js";
import { getSetting, getAllPaymentSettings } from "../utils/settingsHelper.js";
import emailService from "../services/emailService.js";
import { baseLayout } from "../templates/baseLayout.js";
import { createRefund, roundCurrency, fetchRazorpayPayment } from "../services/paymentService.js";
import { createAndStoreInvoice } from "../services/invoiceService.js";

const populateRequest = (query) =>
  query
    .populate("item")
    .populate("owner", "name email campus location ratingsAverage ratingsCount avatarUrl balance pendingBalance qrCodeUrl upiId")
    .populate("renter", "name email campus location ratingsAverage ratingsCount avatarUrl balance pendingBalance")
    .populate("poc", "name email campus location balance qrCodeUrl upiId")
    .populate("escrow");

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

  const rawBasePrice =
    normalizedRequestType === "purchase"
      ? item.salePrice ?? item.rentalPrice ?? item.price
      : getRentalDurationDays(startDate, endDate) * (item.rentalPrice ?? item.salePrice ?? item.price);

  const basePrice = roundCurrency(rawBasePrice);

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

    const userUses = (coupon.usedBy || []).filter((u) => u.user.toString() === req.user._id.toString()).length;
    const maxUses = coupon.maxUsesPerUser || 1;
    if (userUses >= maxUses) {
      res.status(400);
      throw new Error("You have already used this coupon code.");
    }

    if (coupon.discountType === "percentage") {
      discountAmount = (basePrice * coupon.value) / 100;
    } else {
      discountAmount = coupon.value;
    }
    discountAmount = Math.min(discountAmount, basePrice);
  }

  discountAmount = roundCurrency(discountAmount);
  const settings = await getAllPaymentSettings();
  const deliveryFee = roundCurrency(settings.delivery_fee || 50);
  const commissionRate = settings.platform_commission_rate || 10;
  const pocShareRate = settings.poc_share_rate || 80;

  const itemPrice = roundCurrency(basePrice - discountAmount);
  const platformCommission = roundCurrency(itemPrice * (commissionRate / 100));
  const sellerEarnings = roundCurrency(itemPrice - platformCommission);
  const pocEarnings = roundCurrency(deliveryFee * (pocShareRate / 100));
  const platformDeliveryShare = roundCurrency(deliveryFee - pocEarnings);
  const totalPrice = roundCurrency(itemPrice + deliveryFee);

  const renter = await User.findById(req.user._id);

  // Validate online payment reference security guard
  let isDirectPayment = false;
  let verifiedDirectTx = null;

  if (paymentMethod === "online" && paymentReference) {
    if (paymentReference.startsWith("pay_") || paymentReference.startsWith("order_")) {
      verifiedDirectTx = await Transaction.findOne({
        paymentId: paymentReference,
        user: renter._id,
        status: "completed",
      });
      if (verifiedDirectTx) {
        isDirectPayment = true;
      } else {
        // Double-check with Razorpay SDK
        try {
          const razorpayPayment = await fetchRazorpayPayment(paymentReference);
          if (razorpayPayment && (razorpayPayment.status === "captured" || razorpayPayment.status === "authorized")) {
            isDirectPayment = true;
          }
        } catch (err) {
          console.error("Razorpay payment reference verification failed:", err.message);
        }
      }
    } else if (paymentReference.startsWith("RENTED-SANDBOX-")) {
      isDirectPayment = true;
    }

    if (!isDirectPayment) {
      res.status(400);
      throw new Error("Invalid or unverified online payment reference");
    }
  }

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

  // Handle Wallet / Escrow balance deductions
  if (paymentMethod === "wallet" || (paymentMethod !== "cod" && !isDirectPayment)) {
    if (renter.balance < totalPrice) {
      res.status(400);
      throw new Error(`Insufficient wallet balance. You need Rs. ${totalPrice} (Your Balance: Rs. ${renter.balance})`);
    }
    renter.balance = roundCurrency(renter.balance - totalPrice);
    await renter.save();
  }

  // Generate QR Codes
  const pickupQrCode = "P-" + Math.floor(100000 + Math.random() * 900000);
  const deliveryQrCode = "D-" + Math.floor(100000 + Math.random() * 900000);

  const initialStatus = paymentMethod === "cod" ? "COD Pending" : "Pending Pickup";
  const finalPaymentMethod = paymentMethod === "wallet" ? "wallet" : (paymentMethod === "cod" ? "cod" : "online");
  const finalPaymentRef = paymentReference || (paymentMethod === "wallet" ? `pay_wallet_${Date.now()}` : (paymentMethod === "cod" ? `COD-${Date.now()}` : `REF-${Date.now()}`));

  const request = await RentalRequest.create({
    requestType: normalizedRequestType,
    item: item._id,
    owner: item.owner,
    renter: renter._id,
    startDate: normalizedRequestType === "rental" ? startDate : null,
    endDate: normalizedRequestType === "rental" ? endDate : null,
    message: message || "",
    paymentMethod: finalPaymentMethod,
    status: initialStatus,
    itemPrice,
    deliveryFee,
    totalPrice,
    commissionAmount: platformCommission,
    sellerEarnings,
    pocEarnings,
    platformDeliveryShare,
    paymentReference: finalPaymentRef,
    deliveryAddress: deliveryAddress || renter.location,
    pickupQrCode,
    deliveryQrCode,
    trackingStatus: initialStatus,
    trackingHistory: [{ status: initialStatus, location: "Order Placed" }],
    couponCode: couponCode || "",
  });

  // Create Escrow System record for online/wallet payments
  if (paymentMethod !== "cod") {
    const escrow = await Escrow.create({
      rentalRequest: request._id,
      buyer: renter._id,
      seller: item.owner,
      itemPrice,
      deliveryFee,
      totalAmount: totalPrice,
      platformCommission,
      sellerEarnings,
      pocEarnings,
      platformDeliveryShare,
      status: "locked",
    });
    request.escrow = escrow._id;
    await request.save();

    // Lock funds in Seller pending balance
    const seller = await User.findById(item.owner);
    if (seller) {
      seller.pendingBalance = roundCurrency((seller.pendingBalance || 0) + sellerEarnings);
      await seller.save();
    }
  }

  // Record coupon redemption
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });
    if (coupon) {
      coupon.usedBy = coupon.usedBy || [];
      coupon.usedBy.push({ user: renter._id, order: request._id, usedAt: new Date() });
      await coupon.save();
    }
  }

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
    if (isDirectPayment && verifiedDirectTx) {
      verifiedDirectTx.order = request._id;
      await verifiedDirectTx.save();
    } else {
      await Transaction.create({
        user: renter._id,
        order: request._id,
        amount: totalPrice,
        type: "payment",
        status: "completed",
        paymentId: finalPaymentRef,
        gateway: paymentMethod === "wallet" ? "wallet" : (finalPaymentRef.startsWith("RENTED-SANDBOX-") ? "sandbox" : "razorpay"),
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

  if ((request.failedPickupAttempts || 0) >= 5) {
    res.status(400);
    throw new Error("Maximum pickup verification attempts exceeded (5/5). Please contact Admin support.");
  }

  if (request.pickupQrCode !== qrCode) {
    request.failedPickupAttempts = (request.failedPickupAttempts || 0) + 1;
    await request.save();
    res.status(400);
    throw new Error(`Invalid Pickup QR Code (Attempt ${request.failedPickupAttempts}/5)`);
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

  if ((request.failedDeliveryAttempts || 0) >= 5) {
    res.status(400);
    throw new Error("Maximum delivery verification attempts exceeded (5/5). Please contact Admin support.");
  }

  if (request.deliveryQrCode !== qrCode) {
    request.failedDeliveryAttempts = (request.failedDeliveryAttempts || 0) + 1;
    await request.save();
    res.status(400);
    throw new Error(`Invalid Delivery QR Code (Attempt ${request.failedDeliveryAttempts}/5)`);
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

  if (request.renter.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Only the buyer/renter or admin can confirm delivery receipt");
  }

  if (request.earningsReleased) {
    res.status(400);
    throw new Error("Funds for this order have already been released");
  }

  const isRental = request.requestType === "rental";

  const settings = await getAllPaymentSettings();
  const deliveryFee = request.deliveryFee || settings.delivery_fee || 50;
  const commissionRate = settings.platform_commission_rate || 10;
  const pocShareRate = settings.poc_share_rate || 80;

  const itemPrice = request.itemPrice || (request.totalPrice - deliveryFee);
  const platformCommission = request.commissionAmount || (itemPrice * (commissionRate / 100));
  const sellerEarnings = request.sellerEarnings || (itemPrice - platformCommission);
  const pocEarnings = request.pocEarnings || (deliveryFee * (pocShareRate / 100));
  const platformDeliveryShare = request.platformDeliveryShare || (deliveryFee - pocEarnings);

  // Release earnings to seller
  const seller = await User.findById(request.owner);
  if (seller) {
    seller.balance = (seller.balance || 0) + sellerEarnings;
    seller.pendingBalance = Math.max(0, (seller.pendingBalance || 0) - sellerEarnings);
    await seller.save();
  }

  // Release delivery fee share to POC if assigned
  if (request.poc) {
    const pocUser = await User.findById(request.poc);
    if (pocUser) {
      pocUser.balance = (pocUser.balance || 0) + pocEarnings;
      await pocUser.save();

      // Transaction log for POC
      await Transaction.create({
        user: pocUser._id,
        order: request._id,
        amount: pocEarnings,
        type: "delivery_income",
        status: "completed",
        paidAt: new Date(),
      });
    }
  }

  // Update Escrow record
  const escrow = await Escrow.findOne({ rentalRequest: request._id });
  if (escrow) {
    escrow.status = "released";
    escrow.releasedAt = new Date();
    await escrow.save();
  }

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

  // Log transactions for Seller, Item Commission, and Delivery Commission
  await Transaction.create({
    user: request.owner,
    order: request._id,
    amount: sellerEarnings,
    type: "release_to_seller",
    status: "completed",
    paidAt: new Date(),
  });

  await Transaction.create({
    user: req.user._id,
    order: request._id,
    amount: platformCommission,
    type: "commission",
    status: "completed",
    paidAt: new Date(),
  });

  await Transaction.create({
    user: req.user._id,
    order: request._id,
    amount: platformDeliveryShare,
    type: "delivery_commission",
    status: "completed",
    paidAt: new Date(),
  });

  request.status = isRental ? "Rental Active" : "Completed";
  request.trackingStatus = isRental ? "Rental Active" : "Completed";
  request.commissionAmount = platformCommission;
  request.sellerEarnings = sellerEarnings;
  request.pocEarnings = pocEarnings;
  request.platformDeliveryShare = platformDeliveryShare;
  request.earningsReleased = true;
  request.trackingHistory.push({ status: request.status, location: "Funds Released" });
  await request.save();

  await notifyUser(request.owner, "Earnings Released!", `Rs. ${sellerEarnings} has been credited to your wallet for "${request.item.title}".`);
  if (request.poc) {
    await notifyUser(request.poc, "Delivery Fee Credited!", `Rs. ${pocEarnings} delivery income credited to your wallet for order ${request._id}.`);
  }
  await notifyUser(request.renter, "Order Receipt Confirmed", `Thank you! Escrow funds have been released.`);
  await notifyAdmins("Escrow Released", `Order ID ${request._id}: released Rs. ${sellerEarnings} to Seller, Rs. ${pocEarnings} to POC, Rs. ${platformCommission + platformDeliveryShare} to Platform Revenue.`);

  try {
    if (seller && seller.email) {
      const orderWithCommission = {
        ...request.toObject(),
        commissionAmount: platformCommission,
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

  // Unlock seller's pending balance if held
  const seller = await User.findById(request.owner);
  if (seller && request.paymentMethod !== "cod") {
    seller.pendingBalance = Math.max(0, roundCurrency((seller.pendingBalance || 0) - request.sellerEarnings));
    await seller.save();
  }

  // Release Escrow record
  const escrow = await Escrow.findOne({ rentalRequest: request._id });
  if (escrow) {
    escrow.status = "refunded";
    await escrow.save();
  }

  // Release coupon redemption if applied
  if (request.couponCode) {
    const coupon = await Coupon.findOne({ code: request.couponCode.trim().toUpperCase() });
    if (coupon && coupon.usedBy) {
      coupon.usedBy = coupon.usedBy.filter((u) => u.order?.toString() !== request._id.toString());
      await coupon.save();
    }
  }

  // Refund buyer if payment was online/wallet or if COD cash was already collected
  if (request.paymentMethod !== "cod" || request.codCollected) {
    const renter = await User.findById(request.renter);
    const originalTx = await Transaction.findOne({ order: request._id, type: "payment" });

    if (
      originalTx &&
      originalTx.gateway === "razorpay" &&
      originalTx.paymentId &&
      originalTx.paymentId.startsWith("pay_") &&
      !originalTx.paymentId.startsWith("pay_wallet_")
    ) {
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
        renter.balance = roundCurrency((renter.balance || 0) + request.totalPrice);
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
      if (renter) {
        renter.balance = roundCurrency((renter.balance || 0) + request.totalPrice);
        await renter.save();
      }

      await Transaction.create({
        user: request.renter,
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

      const isNewPocAssignment = !oldPoc || oldPoc.toString() !== pocUser._id.toString();
      request.poc = pocUser._id;

      if (["Seller Accepted", "Pending Pickup", "Payment Successful", "COD Pending", "Order Placed", "Pending"].includes(request.status)) {
        request.status = "POC Assigned";
        request.trackingStatus = "POC Assigned";
        request.trackingHistory.push({ status: "POC Assigned", location: `POC dispatcher ${pocUser.name} assigned by Admin` });
      }

      // Notify the newly assigned POC, renter, and seller
      if (isNewPocAssignment) {
        await notifyUser(
          pocUser._id,
          "New Delivery Task Assigned",
          `Admin assigned you to deliver order #${request._id.toString().slice(-6).toUpperCase()} for "${request.item.title}". Open your POC Dashboard to start collection.`,
          "assigned_task"
        );
        await notifyUser(
          request.renter,
          "POC Courier Assigned",
          `Campus POC ${pocUser.name} has been assigned to deliver your order for "${request.item.title}".`
        );
        await notifyUser(
          request.owner,
          "POC Assigned for Pickup",
          `Campus POC ${pocUser.name} has been assigned to collect "${request.item.title}" from you.`
        );

        try {
          if (pocUser.email) {
            await emailService.sendPickupNotification(pocUser.email, request, request.item, "poc");
          }
        } catch (err) {
          console.error("Failed to send POC assignment email:", err.message);
        }
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
      conversation.lastMessage = `POC ${newPocUser.name} assigned to order chat by Admin.`;
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

// POC Collect COD Cash
export const collectCodCash = asyncHandler(async (req, res) => {
  const request = await RentalRequest.findById(req.params.requestId).populate("item");
  if (!request) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (request.poc?.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Only the assigned POC can mark cash as collected");
  }

  request.codCollected = true;
  request.trackingHistory.push({ status: "COD Collected", location: `Cash of Rs. ${request.totalPrice} collected by POC` });
  await request.save();

  await notifyAdmins("COD Cash Collected", `POC ${req.user.name} collected Rs. ${request.totalPrice} for Order ID ${request._id}. Please verify cash to release payouts.`);
  await notifyUser(request.renter, "Cash Received", `POC ${req.user.name} has recorded cash collection of Rs. ${request.totalPrice}.`);

  res.json(await populateRequest(RentalRequest.findById(request._id)));
});

// Admin Verify COD Cash & Trigger Release
export const verifyCodCash = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied: Admins only");
  }

  const request = await RentalRequest.findById(req.params.requestId).populate("item");
  if (!request) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (request.codVerifiedByAdmin) {
    res.status(400);
    throw new Error("COD cash for this order has already been verified");
  }

  const settings = await getAllPaymentSettings();
  const deliveryFee = request.deliveryFee || settings.delivery_fee || 50;
  const commissionRate = settings.platform_commission_rate || 10;
  const pocShareRate = settings.poc_share_rate || 80;

  const itemPrice = request.itemPrice || (request.totalPrice - deliveryFee);
  const platformCommission = request.commissionAmount || (itemPrice * (commissionRate / 100));
  const sellerEarnings = request.sellerEarnings || (itemPrice - platformCommission);
  const pocEarnings = request.pocEarnings || (deliveryFee * (pocShareRate / 100));
  const platformDeliveryShare = request.platformDeliveryShare || (deliveryFee - pocEarnings);

  // Credit Seller Wallet
  const seller = await User.findById(request.owner);
  if (seller) {
    seller.balance = (seller.balance || 0) + sellerEarnings;
    await seller.save();
  }

  // Credit POC Wallet
  if (request.poc) {
    const pocUser = await User.findById(request.poc);
    if (pocUser) {
      pocUser.balance = (pocUser.balance || 0) + pocEarnings;
      await pocUser.save();

      await Transaction.create({
        user: pocUser._id,
        order: request._id,
        amount: pocEarnings,
        type: "delivery_income",
        status: "completed",
        paidAt: new Date(),
      });
    }
  }

  // Record Transactions
  await Transaction.create({
    user: request.owner,
    order: request._id,
    amount: sellerEarnings,
    type: "release_to_seller",
    status: "completed",
    paidAt: new Date(),
  });

  await Transaction.create({
    user: req.user._id,
    order: request._id,
    amount: platformCommission,
    type: "commission",
    status: "completed",
    paidAt: new Date(),
  });

  await Transaction.create({
    user: req.user._id,
    order: request._id,
    amount: platformDeliveryShare,
    type: "delivery_commission",
    status: "completed",
    paidAt: new Date(),
  });

  request.codCollected = true;
  request.codVerifiedByAdmin = true;
  request.earningsReleased = true;
  request.status = request.requestType === "rental" ? "Rental Active" : "Completed";
  request.trackingStatus = request.status;
  request.trackingHistory.push({ status: "COD Verified", location: `Admin verified cash of Rs. ${request.totalPrice}. Funds distributed.` });
  await request.save();

  await notifyUser(request.owner, "COD Earnings Released!", `Rs. ${sellerEarnings} credited to your wallet for Order ID ${request._id}.`);
  if (request.poc) {
    await notifyUser(request.poc, "Delivery Fee Credited!", `Rs. ${pocEarnings} delivery earnings credited to your wallet for Order ID ${request._id}.`);
  }

  res.json(await populateRequest(RentalRequest.findById(request._id)));
});
