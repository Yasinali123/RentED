import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import asyncHandler from "../utils/asyncHandler.js";

// Initialize Razorpay if keys are available
const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

export const createPaymentIntent = asyncHandler(async (req, res) => {
  const { itemId, amount, paymentMethod = "online" } = req.body;

  if (!amount) {
    res.status(400);
    throw new Error("Amount is required");
  }

  const razorpay = getRazorpayInstance();

  if (razorpay) {
    try {
      const options = {
        amount: Math.round(amount * 100), // in paise
        currency: "INR",
        receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      };

      const order = await razorpay.orders.create(options);

      return res.status(201).json({
        isSandbox: false,
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        paymentReference: order.id,
      });
    } catch (error) {
      console.error("Razorpay order creation error:", error);
      res.status(500);
      throw new Error("Failed to create Razorpay order: " + error.message);
    }
  } else {
    // Sandbox fallback
    const reference = `RENTED-SANDBOX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    return res.status(201).json({
      isSandbox: true,
      orderId: reference,
      amount: Math.round(amount * 100),
      currency: "INR",
      paymentReference: reference,
      message: "Sandbox payment order created",
    });
  }
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    amount,
    type, // "wallet" or "direct"
  } = req.body;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  const isSandbox = !keyId || !keySecret;

  if (!isSandbox) {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400);
      throw new Error("Missing required verification fields");
    }

    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac("sha256", keySecret)
      .update(text)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      res.status(400);
      throw new Error("Payment signature verification failed");
    }
  }

  const finalPaymentId = isSandbox
    ? razorpay_payment_id || `pay_sandbox_${Date.now()}`
    : razorpay_payment_id;

  // Process verified payment
  if (type === "wallet") {
    if (!amount || amount <= 0) {
      res.status(400);
      throw new Error("Invalid deposit amount");
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    user.balance = (user.balance || 0) + Number(amount);
    await user.save();

    await Transaction.create({
      user: user._id,
      amount: Number(amount),
      type: "deposit",
      status: "completed",
    });

    return res.json({
      success: true,
      message: `Successfully deposited Rs. ${amount}. New Balance: Rs. ${user.balance}.`,
      balance: user.balance,
      paymentReference: finalPaymentId,
    });
  }

  // For direct checkout, verification succeeds and returns paymentReference to the client
  return res.json({
    success: true,
    message: "Payment verified successfully",
    paymentReference: finalPaymentId,
  });
});
