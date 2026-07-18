import mongoose from "mongoose";

const securityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Can be null for failed login with invalid email
    },
    email: {
      type: String,
      default: "",
    },
    action: {
      type: String,
      required: true,
      enum: [
        "login",
        "logout",
        "password_changed",
        "email_changed",
        "profile_updated",
        "payment",
        "withdrawal",
        "failed_login",
        "role_change",
        "admin_action",
      ],
    },
    details: {
      type: String,
      default: "",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const SecurityLog = mongoose.model("SecurityLog", securityLogSchema);
export default SecurityLog;
