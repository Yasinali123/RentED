import crypto from "crypto";
import razorpay from "../config/razorpay.js";

/**
 * Creates a new Razorpay order.
 * @param {number} amount - Amount in rupees
 * @returns {Promise<object>} The Razorpay order object
 */
export const createRazorpayOrder = async (amount) => {
  const options = {
    amount: Math.round(amount * 100), // convert to paise
    currency: "INR",
    receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  };
  return await razorpay.orders.create(options);
};

/**
 * Verifies Razorpay payment signature.
 * @param {string} orderId
 * @param {string} paymentId
 * @param {string} signature
 * @returns {boolean} True if signature is valid
 */
export const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const text = `${orderId}|${paymentId}`;
  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(text)
    .digest("hex");
  return generatedSignature === signature;
};

/**
 * Issues a refund for a specific payment ID.
 * @param {string} paymentId
 * @param {number} amount - Amount in rupees to refund (optional for full refund)
 * @returns {Promise<object>} The Razorpay refund object
 */
export const createRefund = async (paymentId, amount = null) => {
  const options = {
    payment_id: paymentId,
  };
  if (amount) {
    options.amount = Math.round(amount * 100); // convert to paise
  }
  return await razorpay.payments.refund(options);
};

export default {
  createRazorpayOrder,
  verifyPaymentSignature,
  createRefund,
};
