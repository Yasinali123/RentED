import bcrypt from "bcryptjs";
import Otp from "../models/Otp.js";
import generateOTP from "../utils/generateOTP.js";

export const createOtp = async (email, type) => {
  const otp = generateOTP();
  const hashedOtp = await bcrypt.hash(otp, 10);

  // Remove any existing OTP of the same type for this email
  await Otp.deleteMany({ email: email.toLowerCase(), type });

  // Save new OTP
  await Otp.create({
    email: email.toLowerCase(),
    hashedOtp,
    type,
  });

  return otp;
};

export const verifyOtp = async (email, type, rawOtp) => {
  const otpRecord = await Otp.findOne({ email: email.toLowerCase(), type });
  if (!otpRecord) return false;

  const isMatch = await bcrypt.compare(rawOtp, otpRecord.hashedOtp);
  if (isMatch) {
    // Delete OTP immediately after verification to prevent reuse
    await Otp.deleteOne({ _id: otpRecord._id });
    return true;
  }

  return false;
};

export default {
  createOtp,
  verifyOtp,
};
