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

const WithdrawalRequest = mongoose.model("WithdrawalRequest", withdrawalRequestSchema);

export default WithdrawalRequest;
