import bcrypt from "bcryptjs";

import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import generateToken from "../utils/generateToken.js";
import cloudinary from "../config/cloudinary.js";
import otpService from "../services/otpService.js";
import emailService from "../services/emailService.js";

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  role: user.role || "student",
  collegeId: user.collegeId,
  verifiedCollegeId: user.verifiedCollegeId,
  country: user.country,
  state: user.state,
  city: user.city,
  institutionType: user.institutionType,
  collegeName: user.collegeName,
  campus: user.campus,
  location: user.location,
  geometry: user.geometry,
  avatarUrl: user.avatarUrl,
  ratingsAverage: user.ratingsAverage,
  ratingsCount: user.ratingsCount,
  balance: user.balance || 0,
  isSuspended: user.isSuspended || false,
  isPocApproved: user.isPocApproved || false,
  wishlist: user.wishlist || [],
  membership: user.membership || "free",
  username: user.username || "",
  bio: user.bio || "",
  course: user.course || "",
  studentId: user.studentId || "",
  twoFactorEnabled: user.twoFactorEnabled || false,
  notifications: user.notifications || {},
  preferredDistance: user.preferredDistance || "Same City",
  academicProfile: user.academicProfile || {},
  appearance: user.appearance || {},
  deliveryPreferences: user.deliveryPreferences || {},
  rentalPreferences: user.rentalPreferences || {},
  marketplacePreferences: user.marketplacePreferences || {},
});

export const signup = asyncHandler(async (req, res) => {
  const { name, email, phone, password, collegeId, country, state, city, institutionType, collegeName, campus, location, geometry, avatarUrl, role } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPhone = String(phone || "").trim();

  if (!name || !normalizedEmail || !normalizedPhone || !password || !collegeId || !state || !city || !institutionType || !collegeName) {
    res.status(400);
    throw new Error("Please provide all required fields");
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    res.status(409);
    throw new Error("Email already in use");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: normalizedEmail,
    phone: normalizedPhone,
    passwordHash,
    collegeId,
    country: country || "India",
    state,
    city,
    institutionType,
    collegeName,
    campus,
    location,
    geometry,
    avatarUrl: avatarUrl || "",
    role: role || "student",
    verifiedCollegeId: true,
    isPocApproved: role === "poc" ? false : true,
  });

  try {
    await emailService.sendWelcomeEmail(user.email, user.name);
  } catch (err) {
    console.error("Failed to send welcome email:", err.message);
  }

  res.status(201).json({
    token: generateToken(user._id),
    user: sanitizeUser(user),
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  if (user.isSuspended) {
    res.status(403);
    throw new Error("Your account has been suspended by the administrator");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  res.json({
    token: generateToken(user._id),
    user: sanitizeUser(user),
  });
});

export const getMe = asyncHandler(async (req, res) => {
  if (req.user.isSuspended) {
    res.status(403);
    throw new Error("Your account has been suspended");
  }
  res.json({ user: sanitizeUser(req.user) });
});

export const googleLogin = asyncHandler(async (req, res) => {
  const { email, name, avatarUrl } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    res.status(400);
    throw new Error("Email is required");
  }

  let user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    // Create new student user on Google Login
    const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);
    user = await User.create({
      name: name || email.split("@")[0],
      email: normalizedEmail,
      passwordHash,
      collegeId: "G-" + Math.floor(1000 + Math.random() * 9000),
      country: "India",
      state: "Gujarat",
      city: "Ahmedabad",
      institutionType: "Engineering",
      collegeName: "Ahmedabad Design Campus",
      avatarUrl: avatarUrl || "",
      role: "student",
      verifiedCollegeId: true,
      balance: 1000,
    });
  }

  if (user.isSuspended) {
    res.status(403);
    throw new Error("Your account has been suspended by the administrator");
  }

  res.json({
    token: generateToken(user._id),
    user: sanitizeUser(user),
  });
});

export const sendSignupOtp = asyncHandler(async (req, res) => {
  const { email, phone } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPhone = String(phone || "").trim();

  if (!normalizedEmail || !normalizedPhone) {
    res.status(400);
    throw new Error("Email and phone number are required");
  }

  // Check if email already in use
  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    res.status(409);
    throw new Error("Email already in use");
  }

  // Generate 6 digit OTP
  const otp = await otpService.createOtp(normalizedEmail, "signup");
  
  // Send email
  await emailService.sendOTPEmail(normalizedEmail, otp, "signup");

  res.json({
    success: true,
    message: "Signup verification code sent to your email",
  });
});

export const verifySignupOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !otp) {
    res.status(400);
    throw new Error("Email and verification code are required");
  }

  const isValid = await otpService.verifyOtp(normalizedEmail, "signup", otp);
  if (!isValid) {
    res.status(400);
    throw new Error("Invalid or expired verification code");
  }

  res.json({
    success: true,
    message: "Contact details verified successfully",
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    res.status(404);
    throw new Error("User not found with this email");
  }

  const otp = await otpService.createOtp(normalizedEmail, "reset");
  await emailService.sendOTPEmail(normalizedEmail, otp, "reset");

  res.json({
    success: true,
    message: "Verification code sent to your email",
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !otp || !newPassword) {
    res.status(400);
    throw new Error("Email, verification code, and new password are required");
  }

  const isValid = await otpService.verifyOtp(normalizedEmail, "reset", otp);
  if (!isValid) {
    res.status(400);
    throw new Error("Invalid or expired verification code");
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  // Send Password Reset confirmation email
  try {
    await emailService.sendPasswordResetConfirmationEmail(normalizedEmail, user.name);
  } catch (err) {
    console.error("Failed to send password reset confirmation email:", err.message);
  }

  res.json({
    success: true,
    message: "Password reset successful! You can now log in.",
  });
});

export const addBalance = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const depositAmount = Number(amount);

  if (!depositAmount || depositAmount <= 0) {
    res.status(400);
    throw new Error("Invalid deposit amount. Amount must be greater than zero.");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.balance = (user.balance || 0) + depositAmount;
  await user.save();

  res.json({
    success: true,
    balance: user.balance,
    message: `Successfully deposited Rs. ${depositAmount}. New Balance: Rs. ${user.balance}.`,
  });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied");
  }
  const users = await User.find({}).select("-passwordHash");
  res.json(users);
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied");
  }
  const { isSuspended, isPocApproved, role, password } = req.body;
  const user = await User.findById(req.params.userId);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (isSuspended !== undefined) user.isSuspended = isSuspended;
  if (isPocApproved !== undefined) user.isPocApproved = isPocApproved;
  if (role !== undefined) user.role = role;
  if (password !== undefined) {
    user.passwordHash = await bcrypt.hash(password, 10);
  }

  await user.save();
  res.json(user);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const parseJsonField = (fieldVal) => {
    if (typeof fieldVal === "string") {
      try {
        return JSON.parse(fieldVal);
      } catch (e) {
        return fieldVal;
      }
    }
    return fieldVal;
  };

  // Fields allowed for user self-edit
  const allowedUpdates = [
    "name", "username", "bio", "email", "phone", "collegeName", "course",
    "studentId", "twoFactorEnabled", "notifications", "preferredDistance",
    "academicProfile", "appearance", "deliveryPreferences", "rentalPreferences",
    "marketplacePreferences", "avatarUrl", "country", "state", "city", "institutionType", "campus", "location"
  ];

  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      if ([
        "notifications", "academicProfile", "appearance",
        "deliveryPreferences", "rentalPreferences", "marketplacePreferences"
      ].includes(field)) {
        user[field] = parseJsonField(req.body[field]);
      } else {
        user[field] = req.body[field];
      }
    }
  });

  // Handle avatar upload if single file attached
  if (req.file) {
    if (user.avatarPublicId) {
      try {
        await cloudinary.uploader.destroy(user.avatarPublicId);
      } catch (err) {
        console.error(`Failed to delete old avatar ${user.avatarPublicId} from Cloudinary:`, err);
      }
    }
    user.avatarUrl = req.file.path;
    user.avatarPublicId = req.file.filename;
  }

  if (req.body.password) {
    user.passwordHash = await bcrypt.hash(req.body.password, 10);
  }

  await user.save();
  res.json({
    success: true,
    user: sanitizeUser(user),
    message: "Profile settings updated successfully"
  });
});
