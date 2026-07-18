import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalRequest",
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["deposit", "payment", "release_to_seller", "commission", "refund", "withdrawal"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "held"],
      default: "completed",
    },
    paymentId: {
      type: String,
      default: "",
    },
    razorpayOrderId: {
      type: String,
      default: "",
    },
    signature: {
      type: String,
      default: "",
    },
    method: {
      type: String,
      default: "",
    },
    gateway: {
      type: String,
      default: "razorpay",
    },
    currency: {
      type: String,
      default: "INR",
    },
    commission: {
      type: Number,
      default: 0,
    },
    sellerAmount: {
      type: Number,
      default: 0,
    },
    platformAmount: {
      type: Number,
      default: 0,
    },
    escrowStatus: {
      type: String,
      enum: ["held", "released", "refunded", "none"],
      default: "none",
    },
    paidAt: {
      type: Date,
    },
    releasedAt: {
      type: Date,
    },
    refundStatus: {
      type: String,
      default: "",
    },
    refundId: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
