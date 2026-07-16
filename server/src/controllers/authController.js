import bcrypt from "bcryptjs";

import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import generateToken from "../utils/generateToken.js";

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
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
  const { name, email, password, collegeId, country, state, city, institutionType, collegeName, campus, location, geometry, avatarUrl, role } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!name || !normalizedEmail || !password || !collegeId || !state || !city || !institutionType || !collegeName) {
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

const otpStore = new Map();

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    res.status(404);
    throw new Error("User not found with this email");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(normalizedEmail, { otp, expires: Date.now() + 10 * 60 * 1000 });

  res.json({
    success: true,
    message: "OTP generated",
    otp,
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const record = otpStore.get(normalizedEmail);
  if (!record || record.otp !== otp || record.expires < Date.now()) {
    res.status(400);
    throw new Error("Invalid or expired OTP");
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  otpStore.delete(normalizedEmail);

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

  // Fields allowed for user self-edit
  const allowedUpdates = [
    "name", "username", "bio", "email", "phone", "collegeName", "course",
    "studentId", "twoFactorEnabled", "notifications", "preferredDistance",
    "academicProfile", "appearance", "deliveryPreferences", "rentalPreferences",
    "marketplacePreferences", "avatarUrl", "country", "state", "city", "institutionType", "campus", "location"
  ];

  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

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
