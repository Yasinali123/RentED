import mongoose from "mongoose";

const loginHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    browser: {
      type: String,
      default: "",
    },
    os: {
      type: String,
      default: "",
    },
    device: {
      type: String,
      default: "",
    },
    loginTime: {
      type: Date,
      default: Date.now,
    },
    logoutTime: {
      type: Date,
      default: null,
    },
    location: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const LoginHistory = mongoose.model("LoginHistory", loginHistorySchema);
export default LoginHistory;
