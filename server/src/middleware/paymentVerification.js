import { verifyPaymentSignature } from "../services/paymentService.js";

export const verifyRazorpaySignatureMiddleware = (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400);
    return next(new Error("Missing required payment verification fields"));
  }

  const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!isValid) {
    res.status(400);
    return next(new Error("Payment signature verification failed"));
  }

  next();
};
