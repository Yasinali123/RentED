import razorpay from "../config/razorpay.js";
import crypto from "crypto";
import User from "../models/User.js";
import Item from "../models/Item.js";
import Coupon from "../models/Coupon.js";
import Transaction from "../models/Transaction.js";
import WithdrawalRequest from "../models/WithdrawalRequest.js";
import Escrow from "../models/Escrow.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getSetting, getAllPaymentSettings } from "../utils/settingsHelper.js";
import { createRazorpayOrder, verifyPaymentSignature, roundCurrency, fetchRazorpayPayment } from "../services/paymentService.js";
import emailService from "../services/emailService.js";

const getRentalDurationDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const milliseconds = end.getTime() - start.getTime();
  const days = Math.ceil(milliseconds / (1000 * 60 * 60 * 24)) || 1;
  return Math.max(days, 1);
};

// Create Razorpay Order
export const createPaymentIntent = asyncHandler(async (req, res) => {
  const { itemId, amount, requestType, startDate, endDate, couponCode, type } = req.body;

  // Handle wallet deposit order creation
  if (type === "wallet") {
    const depositAmt = roundCurrency(amount);
    if (!depositAmt || depositAmt <= 0) {
      res.status(400);
      throw new Error("Invalid deposit amount");
    }
    try {
      const order = await createRazorpayOrder(depositAmt);
      return res.status(201).json({
        success: true,
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        totalPrice: depositAmt,
      });
    } catch (error) {
      res.status(500);
      throw new Error("Failed to create deposit order: " + error.message);
    }
  }

  // Direct checkout order creation
  if (!itemId) {
    res.status(400);
    throw new Error("itemId is required for checkout");
  }

  const item = await Item.findById(itemId);
  if (!item) {
    res.status(404);
    throw new Error("Item not found");
  }

  const isPurchase = requestType === "purchase";
  const rawBasePrice = isPurchase
    ? (item.salePrice ?? item.rentalPrice ?? item.price)
    : getRentalDurationDays(startDate, endDate) * (item.rentalPrice ?? item.salePrice ?? item.price);

  const basePrice = roundCurrency(rawBasePrice);
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    res.status(400);
    throw new Error("Invalid base price calculated");
  }

  let discountAmount = 0;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });
    if (coupon && coupon.isActive && new Date(coupon.expiryDate) >= new Date()) {
      if (coupon.discountType === "percentage") {
        discountAmount = (basePrice * coupon.value) / 100;
      } else {
        discountAmount = coupon.value;
      }
      discountAmount = Math.min(discountAmount, basePrice);
    }
  }

  discountAmount = roundCurrency(discountAmount);
  const settings = await getAllPaymentSettings();
  const deliveryFee = roundCurrency(settings.delivery_fee || 50);
  const commissionRate = settings.platform_commission_rate || 10;

  const itemPrice = roundCurrency(basePrice - discountAmount);
  const platformCommission = roundCurrency(itemPrice * (commissionRate / 100));
  const sellerEarnings = roundCurrency(itemPrice - platformCommission);
  const totalPrice = roundCurrency(itemPrice + deliveryFee);

  try {
    const order = await createRazorpayOrder(totalPrice);

    res.status(201).json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      itemPrice,
      deliveryFee,
      platformCommission,
      sellerEarnings,
      totalPrice,
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    res.status(500);
    throw new Error("Failed to create Razorpay order: " + error.message);
  }
});

// Verify signature & record transactions
export const verifyPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    itemId,
    requestType,
    startDate,
    endDate,
    couponCode,
    type,
    amount,
  } = req.body;

  // Verify HMAC signature
  const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!isValid) {
    res.status(400);
    throw new Error("Payment signature verification failed");
  }

  // Prevent duplicate verification
  const existingTx = await Transaction.findOne({ paymentId: razorpay_payment_id });
  if (existingTx && existingTx.status === "completed") {
    if (type === "wallet") {
      const user = await User.findById(req.user._id);
      return res.json({
        success: true,
        message: "Deposit already processed",
        balance: user.balance,
        paymentReference: razorpay_payment_id,
      });
    }
    return res.json({
      success: true,
      message: "Payment already verified",
      paymentReference: razorpay_payment_id,
      transactionId: existingTx._id,
    });
  }

  // Fetch official payment details from Razorpay to prevent amount tampering
  let paymentMethodUsed = "online";
  let fetchedPayment = null;
  try {
    fetchedPayment = await fetchRazorpayPayment(razorpay_payment_id);
    paymentMethodUsed = fetchedPayment.method || "online";
  } catch (err) {
    console.error("Failed to fetch Razorpay payment details:", err.message);
  }

  if (fetchedPayment && fetchedPayment.status !== "captured" && fetchedPayment.status !== "authorized") {
    res.status(400);
    throw new Error(`Razorpay payment is in invalid status (${fetchedPayment.status})`);
  }

  // Process deposit
  if (type === "wallet") {
    let depositAmount = Number(amount);
    // Overwrite client-provided amount with actual captured Razorpay amount if fetched
    if (fetchedPayment && fetchedPayment.amount) {
      depositAmount = fetchedPayment.amount / 100;
    }
    depositAmount = roundCurrency(depositAmount);

    if (!depositAmount || depositAmount <= 0) {
      res.status(400);
      throw new Error("Invalid deposit amount");
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    user.balance = roundCurrency((user.balance || 0) + depositAmount);
    await user.save();

    await Transaction.create({
      user: user._id,
      amount: depositAmount,
      type: "deposit",
      status: "completed",
      paymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      signature: razorpay_signature,
      method: paymentMethodUsed,
      gateway: "razorpay",
      currency: "INR",
      paidAt: new Date(),
    });

    try {
      await emailService.sendEmail({
        to: user.email,
        subject: `Wallet Deposit Successful: Rs. ${depositAmount}`,
        html: `<h3>Deposit Confirmed</h3><p>Hi ${user.name}, your deposit of Rs. ${depositAmount} was successfully credited to your RentED wallet.</p><p>Transaction ID: ${razorpay_payment_id}</p>`,
      });
    } catch (err) {
      console.error("Failed to send deposit email:", err.message);
    }

    return res.json({
      success: true,
      message: `Successfully deposited Rs. ${depositAmount}.`,
      balance: user.balance,
      paymentReference: razorpay_payment_id,
    });
  }

  // Direct checkout payment processing
  const item = await Item.findById(itemId);
  if (!item) {
    res.status(404);
    throw new Error("Item not found");
  }

  const isPurchase = requestType === "purchase";
  const rawBasePrice = isPurchase
    ? (item.salePrice ?? item.rentalPrice ?? item.price)
    : getRentalDurationDays(startDate, endDate) * (item.rentalPrice ?? item.salePrice ?? item.price);
  const basePrice = roundCurrency(rawBasePrice);

  let discountAmount = 0;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });
    if (coupon && coupon.isActive && new Date(coupon.expiryDate) >= new Date()) {
      if (coupon.discountType === "percentage") {
        discountAmount = (basePrice * coupon.value) / 100;
      } else {
        discountAmount = coupon.value;
      }
      discountAmount = Math.min(discountAmount, basePrice);
    }
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
  
  let totalPrice = roundCurrency(itemPrice + deliveryFee);
  if (fetchedPayment && fetchedPayment.amount) {
    totalPrice = roundCurrency(fetchedPayment.amount / 100);
  }

  const transaction = await Transaction.create({
    user: req.user._id,
    amount: totalPrice,
    type: "payment",
    status: "completed",
    paymentId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id,
    signature: razorpay_signature,
    method: paymentMethodUsed,
    gateway: "razorpay",
    currency: "INR",
    commission: platformCommission,
    sellerAmount: sellerEarnings,
    platformAmount: roundCurrency(platformCommission + platformDeliveryShare),
    escrowStatus: "held",
    paidAt: new Date(),
  });

  return res.json({
    success: true,
    message: "Payment verified successfully",
    paymentReference: razorpay_payment_id,
    transactionId: transaction._id,
    itemPrice,
    deliveryFee,
    platformCommission,
    sellerEarnings,
    pocEarnings,
    platformDeliveryShare,
    totalPrice,
  });
});

// Razorpay Webhook Parser
export const handleWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "rented_webhook_secret_123";
  const signature = req.headers["x-razorpay-signature"];

  if (signature) {
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if (digest !== signature) {
      return res.status(400).json({ status: "invalid_signature" });
    }
  }

  const event = req.body.event;
  const payload = req.body.payload;

  console.log(`[Razorpay Webhook] Received event: ${event}`);

  if (event === "payment.captured") {
    const payment = payload.payment.entity;
    const paymentId = payment.id;

    const transaction = await Transaction.findOne({ paymentId });
    if (transaction) {
      transaction.status = "completed";
      if (transaction.escrowStatus === "none") {
        transaction.escrowStatus = "held";
      }
      await transaction.save();
    }
  } else if (event === "payment.failed") {
    const payment = payload.payment.entity;
    const paymentId = payment.id;

    const transaction = await Transaction.findOne({ paymentId });
    if (transaction) {
      transaction.status = "failed";
      transaction.escrowStatus = "none";
      await transaction.save();
    }
  } else if (event === "refund.processed") {
    const refund = payload.refund.entity;
    const paymentId = refund.payment_id;
    const refundId = refund.id;

    const transaction = await Transaction.findOne({ paymentId });
    if (transaction) {
      transaction.refundId = refundId;
      transaction.refundStatus = "processed";
      transaction.escrowStatus = "refunded";
      await transaction.save();
    }
  }

  res.json({ status: "ok" });
});

// Request Withdrawal
export const requestWithdrawal = asyncHandler(async (req, res) => {
  const { amount, bankDetails, upiId, qrCodeUrl, paymentMethodType = "upi_id" } = req.body;

  const settings = await getAllPaymentSettings();
  const minWithdrawal = settings.min_withdrawal_amount || 500;

  const withdrawAmount = roundCurrency(amount);
  if (!withdrawAmount || withdrawAmount <= 0) {
    res.status(400);
    throw new Error("Amount must be greater than zero");
  }

  if (withdrawAmount < minWithdrawal) {
    res.status(400);
    throw new Error(`Minimum withdrawal amount is Rs. ${minWithdrawal}`);
  }

  if (!bankDetails && !upiId && !qrCodeUrl) {
    res.status(400);
    throw new Error("Bank, UPI ID, or QR Code details are required for withdrawal");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const existingPending = await WithdrawalRequest.findOne({
    user: req.user._id,
    status: "pending",
  });
  if (existingPending) {
    res.status(400);
    throw new Error("You already have a pending withdrawal request. Please wait for Admin approval before submitting another.");
  }

  if (user.balance < withdrawAmount) {
    res.status(400);
    throw new Error(`Insufficient wallet balance. Available: Rs. ${user.balance}`);
  }

  // Update user default payout info if supplied
  if (qrCodeUrl) user.qrCodeUrl = qrCodeUrl;
  if (upiId) user.upiId = upiId;
  if (typeof bankDetails === "object") {
    user.bankDetails = { ...user.bankDetails, ...bankDetails };
  }

  // Debit balance upfront
  user.balance = roundCurrency(user.balance - withdrawAmount);
  await user.save();

  const formattedBankDetails = typeof bankDetails === "object"
    ? `Bank: ${bankDetails.bankName || ""}, A/C: ${bankDetails.accountNumber || ""}, IFSC: ${bankDetails.ifscCode || ""}`
    : (bankDetails || upiId || "QR Code Payout");

  const transaction = await Transaction.create({
    user: user._id,
    amount: withdrawAmount,
    type: "withdrawal",
    status: "pending",
    escrowStatus: "none",
  });

  const request = await WithdrawalRequest.create({
    user: user._id,
    amount: withdrawAmount,
    status: "pending",
    paymentMethodType,
    bankDetails: formattedBankDetails,
    upiId: upiId || user.upiId || "",
    qrCodeUrl: qrCodeUrl || user.qrCodeUrl || "",
    transaction: transaction._id,
  });

  transaction.withdrawalRequest = request._id;
  await transaction.save();

  res.status(201).json({
    success: true,
    message: "Withdrawal request submitted successfully.",
    request,
  });
});

// Get Withdrawal Request List
export const getWithdrawals = asyncHandler(async (req, res) => {
  let query = {};
  if (req.user.role !== "admin") {
    query.user = req.user._id;
  }

  const requests = await WithdrawalRequest.find(query)
    .populate("user", "name email collegeName balance qrCodeUrl upiId bankDetails role")
    .sort({ createdAt: -1 });

  res.json(requests);
});

// Process Withdrawal (Admin only)
export const processWithdrawal = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied: Admins only");
  }

  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status update value");
  }

  const request = await WithdrawalRequest.findById(req.params.id);
  if (!request) {
    res.status(404);
    throw new Error("Withdrawal request not found");
  }

  if (request.status !== "pending") {
    res.status(400);
    throw new Error("Withdrawal request has already been processed");
  }

  const user = await User.findById(request.user);

  let transaction = null;
  if (request.transaction) {
    transaction = await Transaction.findById(request.transaction);
  }
  if (!transaction) {
    transaction = await Transaction.findOne({ withdrawalRequest: request._id });
  }
  if (!transaction) {
    transaction = await Transaction.findOne({
      user: request.user,
      amount: request.amount,
      type: "withdrawal",
      status: "pending",
    });
  }

  if (status === "approved") {
    request.status = "approved";
    request.processedAt = new Date();
    await request.save();

    if (transaction) {
      transaction.status = "completed";
      await transaction.save();
    }

    try {
      if (user && user.email) {
        await emailService.sendWithdrawalEmail(user.email, user.name, request.amount, user.balance);
      }
    } catch (err) {
      console.error("Failed to send withdrawal approval email:", err.message);
    }
  } else {
    request.status = "rejected";
    request.processedAt = new Date();
    await request.save();

    if (user) {
      user.balance = roundCurrency((user.balance || 0) + request.amount);
      await user.save();
    }

    if (transaction) {
      transaction.status = "failed";
      await transaction.save();
    }

    try {
      if (user && user.email) {
        await emailService.sendEmail({
          to: user.email,
          subject: `Withdrawal Request Rejected: Rs. ${request.amount}`,
          html: `<h3>Withdrawal Rejected</h3><p>Hi ${user.name}, your withdrawal request of Rs. ${request.amount} was rejected by the admin. The funds have been refunded back to your wallet.</p>`,
        });
      }
    } catch (err) {
      console.error("Failed to send withdrawal rejection email:", err.message);
    }
  }

  res.json({ success: true, message: `Withdrawal request ${status}`, request });
});
