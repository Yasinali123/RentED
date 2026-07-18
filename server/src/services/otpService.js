import bcrypt from "bcryptjs";
import Otp from "../models/Otp.js";
import generateOTP from "../utils/generateOTP.js";

export const createOtp = async (email, type) => {
  const otp = generateOTP();
  console.log(`[OTP Log] Generated ${type} OTP for ${email}: ${otp}`);
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
  const normalizedEmail = email.toLowerCase();
  console.log(`[OTP Service] Verifying ${type} OTP for ${normalizedEmail}. Entered code: ${rawOtp}`);
  const otpRecord = await Otp.findOne({ email: normalizedEmail, type });
  if (!otpRecord) {
    console.log(`[OTP Service] No OTP record found in DB for ${normalizedEmail} and type ${type}`);
    return false;
  }

  const isMatch = await bcrypt.compare(String(rawOtp || ""), otpRecord.hashedOtp);
  console.log(`[OTP Service] Hashed OTP comparison result: ${isMatch}`);
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
