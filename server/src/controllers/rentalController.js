import Item from "../models/Item.js";
import RentalRequest from "../models/RentalRequest.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import asyncHandler from "../utils/asyncHandler.js";
import { notifyUser, notifyAdmins } from "../utils/notificationHelper.js";
import { getSetting } from "../utils/settingsHelper.js";

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

  // Payments (online + UPI apps): debit renter wallet immediately for escrow holding unless paid directly via Razorpay.
  if (paymentMethod !== "cod") {
    const isDirectPayment = paymentReference && (
      paymentReference.startsWith("pay_") ||
      paymentReference.startsWith("RENTED-SANDBOX-") ||
      paymentReference.startsWith("order_")
    );

    if (!isDirectPayment) {
      if (renter.balance < totalPrice) {
        res.status(400);
        throw new Error(`Insufficient wallet balance. You need Rs. ${totalPrice} (Your Balance: Rs. ${renter.balance})`);
      }
      renter.balance -= totalPrice;
      await renter.save();
    }

    // Log the transaction
    await Transaction.create({
      user: renter._id,
      amount: totalPrice,
      type: "payment",
      status: "completed",
    });
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
    deliveryAddress: deliveryAddress || renter.location,
    pickupQrCode,
    deliveryQrCode,
    trackingStatus: initialStatus,
    trackingHistory: [{ status: initialStatus, location: "Order Placed" }],
  });

  item.availabilityStatus = normalizedRequestType === "purchase" ? "sold" : "rented";
  await item.save();

  // Create notifications
  await notifyUser(item.owner, "New Order Received", `A student has placed an order for your listing: "${item.title}". Please accept it to proceed.`);
  await notifyUser(renter._id, "Order Placed Successfully", `Your order for "${item.title}" has been created. Status: ${initialStatus}.`);
  await notifyAdmins("New Platform Order Created", `Order ID ${request._id} placed by ${renter.name} for Rs. ${totalPrice}.`);

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

  await notifyUser(request.renter, "POC Assigned", `Your POC "${req.user.name}" has been assigned to deliver your order.`);
  await notifyUser(request.owner, "POC Assigned", `POC "${req.user.name}" has claimed this pickup. Please prepare the item for pickup.`);

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

  await notifyUser(request.owner, "Order Cancelled", `The order for "${request.item.title}" was cancelled.`);
  await notifyUser(request.renter, "Order Cancelled", `Your order for "${request.item.title}" was cancelled. Refunds processed.`);

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
