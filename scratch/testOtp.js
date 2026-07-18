import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDb } from "../server/src/config/db.js";
import Otp from "../server/src/models/Otp.js";
import otpService from "../server/src/services/otpService.js";

const test = async () => {
  await connectDb();
  console.log("Connected to MongoDB for testing.");

  const email = "test-otp@college.edu";
  const type = "signup";

  // Create OTP
  console.log("Creating OTP...");
  const otp = await otpService.createOtp(email, type);
  console.log("Created OTP:", otp);

  // Find record in DB
  const record = await Otp.findOne({ email, type });
  console.log("OTP Record in DB:", record);

  if (record) {
    console.log("Hashed OTP in DB:", record.hashedOtp);
    const isMatch = await bcrypt.compare(otp, record.hashedOtp);
    console.log("Direct bcrypt compare match:", isMatch);

    // Verify OTP using service
    const isValid = await otpService.verifyOtp(email, type, otp);
    console.log("Service verifyOtp isValid:", isValid);
  } else {
    console.log("No record found in DB!");
  }

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
};

test().catch(console.error);
