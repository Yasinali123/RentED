import mongoose from "mongoose";

const withdrawalRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    paymentMethodType: {
      type: String,
      enum: ["upi_qr", "upi_id", "bank_account"],
      default: "upi_id",
    },
    bankDetails: {
      type: String,
      required: true,
    },
    upiId: {
      type: String,
      default: "",
    },
    qrCodeUrl: {
      type: String,
      default: "",
    },
    processedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

withdrawalRequestSchema.index({ user: 1, createdAt: -1 });
withdrawalRequestSchema.index({ status: 1 });

const WithdrawalRequest = mongoose.model("WithdrawalRequest", withdrawalRequestSchema);

export default WithdrawalRequest;
