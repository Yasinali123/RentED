import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    hashedOtp: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["signup", "reset"],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 300, // Auto-delete document after 5 minutes (300 seconds)
    },
  },
  { timestamps: true }
);

const Otp = mongoose.model("Otp", otpSchema);

export default Otp;
