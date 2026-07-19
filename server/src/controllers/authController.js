import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";
import LoginHistory from "../models/LoginHistory.js";
import asyncHandler from "../utils/asyncHandler.js";
import cloudinary from "../config/cloudinary.js";
import otpService from "../services/otpService.js";
import emailService from "../services/emailService.js";
import { validatePassword } from "../utils/passwordValidator.js";
import { parseUserAgent } from "../utils/userAgent.js";
import { logSecurityEvent } from "../utils/logger.js";
import {
  generateAccessToken,
  generateRefreshToken,
  sendTokenCookies,
  clearTokenCookies,
  verifyRefreshToken,
} from "../utils/token.js";

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
  latitude: user.latitude,
  longitude: user.longitude,
  college: user.college,
  institution: user.institution,
  district: user.district,
  address: user.address,
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

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
export const signup = asyncHandler(async (req, res) => {
  const { name, email, phone, password, collegeId, country, state, city, institutionType, collegeName, campus, location, geometry, avatarUrl, role, verificationToken } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPhone = String(phone || "").trim();

  if (!name || !normalizedEmail || !normalizedPhone || !password || !collegeId || !state || !city || !institutionType || !collegeName) {
    res.status(400);
    throw new Error("Please provide all required fields");
  }

  // Enforce strong password validation
  const passwordError = validatePassword(password);
  if (passwordError) {
    res.status(400);
    throw new Error(passwordError);
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    res.status(409);
    throw new Error("Email already in use");
  }

  // Verify verificationToken if provided
  let preVerified = false;
  if (verificationToken) {
    try {
      const decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);
      if (decoded.email === normalizedEmail && decoded.verified) {
        preVerified = true;
      }
    } catch (err) {
      console.error("[authController:signup] Verification token verification failed:", err.message);
    }
  }

  const passwordHash = await bcrypt.hash(password, 12); // cost 12
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
    isEmailVerified: preVerified, // Pre-verified if verificationToken matched
    verifiedCollegeId: preVerified,
    isPocApproved: role === "poc" ? false : true,
  });

  if (preVerified) {
    // Send Welcome Email
    try {
      await emailService.sendWelcomeEmail(user.email, user.name);
    } catch (err) {
      console.error("Failed to send welcome email:", err.message);
    }

    // Set active session tokens & cookies
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const { browser, os, device } = parseUserAgent(req.headers["user-agent"]);
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";

    await Session.create({
      userId: user._id,
      refreshToken,
      ipAddress,
      userAgent: req.headers["user-agent"] || "",
      browser,
      os,
      device,
    });

    await LoginHistory.create({
      userId: user._id,
      ipAddress,
      userAgent: req.headers["user-agent"] || "",
      browser,
      os,
      device,
      loginTime: new Date(),
    });

    await logSecurityEvent({
      userId: user._id,
      email: user.email,
      action: "email_changed",
      details: "User registered and logged in with pre-verified email.",
      req,
    });

    sendTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({
      success: true,
      needsVerification: false,
      user: sanitizeUser(user),
      accessToken,
      message: "Registration successful! Welcome to RentED.",
    });
  } else {
    // Generate and send email verification OTP
    const otp = await otpService.createOtp(user.email, "signup");
    await emailService.sendOTPEmail(user.email, otp, "signup");

    res.status(201).json({
      success: true,
      needsVerification: true,
      email: user.email,
      message: "Registration successful! A 6-digit verification code has been sent to your email.",
    });
  }
});

// @desc    Log in user & set secure cookies
// @route   POST /api/auth/login
// @access  Public
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

  // Check account lockout status
  if (user.lockUntil && user.lockUntil > Date.now()) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
    res.status(403);
    throw new Error(`Your account has been locked due to consecutive wrong password attempts. Please try again in ${minutesLeft} minutes.`);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    
    if (user.failedLoginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lock
      await user.save();

      // Log lockout audit
      await logSecurityEvent({
        userId: user._id,
        email: user.email,
        action: "failed_login",
        details: "Account locked after 5 consecutive failed password attempts.",
        req,
      });

      // Send email warning alert
      try {
        await emailService.sendEmail({
          to: user.email,
          subject: "RentED Security Warning: Account Locked 🚨",
          html: `
            <h3>Security Alert: Account Temporarily Locked</h3>
            <p>Hello ${user.name},</p>
            <p>Your RentED account has been temporarily locked for 15 minutes after 5 consecutive failed login attempts.</p>
            <p>If this was not you, please contact support immediately or reset your password once the lock expires.</p>
          `,
        });
      } catch (err) {
        console.error("Failed to send account lock warning email:", err.message);
      }

      res.status(403);
      throw new Error("Invalid credentials. Account locked for 15 minutes.");
    } else {
      await user.save();

      await logSecurityEvent({
        userId: user._id,
        email: user.email,
        action: "failed_login",
        details: `Failed password attempt ${user.failedLoginAttempts} of 5.`,
        req,
      });

      res.status(401);
      throw new Error("Invalid credentials");
    }
  }

  if (user.isSuspended) {
    res.status(403);
    throw new Error("Your account has been suspended by the administrator");
  }

  if (!user.isEmailVerified) {
    // Re-send verification code
    const otp = await otpService.createOtp(user.email, "signup");
    await emailService.sendOTPEmail(user.email, otp, "signup");

    res.status(403).json({
      needsVerification: true,
      email: user.email,
      message: "Your email address is not verified. Please verify your email first. A new OTP has been sent.",
    });
    return;
  }

  // Reset lock metrics
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  // Create session tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  const { browser, os, device } = parseUserAgent(req.headers["user-agent"]);
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";

  // Save session record
  await Session.create({
    userId: user._id,
    refreshToken,
    ipAddress,
    userAgent: req.headers["user-agent"] || "",
    browser,
    os,
    device,
  });

  // Record login history
  await LoginHistory.create({
    userId: user._id,
    ipAddress,
    userAgent: req.headers["user-agent"] || "",
    browser,
    os,
    device,
    loginTime: new Date(),
  });

  // Log audit event
  await logSecurityEvent({
    userId: user._id,
    email: user.email,
    action: "login",
    details: `User successfully logged in via Browser: ${browser}, OS: ${os}, Device: ${device}`,
    req,
  });

  sendTokenCookies(res, accessToken, refreshToken);

  res.json({
    user: sanitizeUser(user),
    accessToken,
  });
});

// @desc    Verify signup email OTP and activate account
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  console.log(`[authController:verifyEmail] Received request to verify email: "${normalizedEmail}", otp: "${otp}"`);
  if (!normalizedEmail || !otp) {
    res.status(400);
    throw new Error("Email and verification code are required");
  }

  const isValid = await otpService.verifyOtp(normalizedEmail, "signup", otp);
  if (!isValid) {
    console.log(`[authController:verifyEmail] Verification failed for email: "${normalizedEmail}"`);
    res.status(400);
    throw new Error("Invalid or expired verification code");
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.isEmailVerified = true;
  user.verifiedCollegeId = true; // Activate profile
  await user.save();

  // Send Welcome Email
  try {
    await emailService.sendWelcomeEmail(user.email, user.name);
  } catch (err) {
    console.error("Failed to send welcome email:", err.message);
  }

  // Set active session tokens & cookies
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  const { browser, os, device } = parseUserAgent(req.headers["user-agent"]);
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";

  await Session.create({
    userId: user._id,
    refreshToken,
    ipAddress,
    userAgent: req.headers["user-agent"] || "",
    browser,
    os,
    device,
  });

  await LoginHistory.create({
    userId: user._id,
    ipAddress,
    userAgent: req.headers["user-agent"] || "",
    browser,
    os,
    device,
    loginTime: new Date(),
  });

  await logSecurityEvent({
    userId: user._id,
    email: user.email,
    action: "email_changed",
    details: "User successfully verified email OTP and activated account.",
    req,
  });

  sendTokenCookies(res, accessToken, refreshToken);

  res.json({
    success: true,
    message: "Email verified and account activated successfully!",
    user: sanitizeUser(user),
    accessToken,
  });
});

// @desc    Get currently logged in profile details
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  if (req.user.isSuspended) {
    res.status(403);
    throw new Error("Your account has been suspended");
  }
  
  let token = req.cookies?.accessToken;
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  res.json({ 
    user: sanitizeUser(req.user),
    accessToken: token,
  });
});

// @desc    Google OAuth authenticate endpoint
// @route   POST /api/auth/google
// @access  Public
export const googleLogin = asyncHandler(async (req, res) => {
  const { email, name, avatarUrl } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    res.status(400);
    throw new Error("Email is required");
  }

  let user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const passwordHash = await bcrypt.hash(Math.random().toString(36), 12); // cost 12
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
      isEmailVerified: true, // Google email is pre-verified
      verifiedCollegeId: true,
      balance: 1000,
    });
  }

  if (user.isSuspended) {
    res.status(403);
    throw new Error("Your account has been suspended by the administrator");
  }

  // Create session & cookies
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  const { browser, os, device } = parseUserAgent(req.headers["user-agent"]);
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";

  await Session.create({
    userId: user._id,
    refreshToken,
    ipAddress,
    userAgent: req.headers["user-agent"] || "",
    browser,
    os,
    device,
  });

  await LoginHistory.create({
    userId: user._id,
    ipAddress,
    userAgent: req.headers["user-agent"] || "",
    browser,
    os,
    device,
    loginTime: new Date(),
  });

  await logSecurityEvent({
    userId: user._id,
    email: user.email,
    action: "login",
    details: `User successfully logged in via Google OAuth. Browser: ${browser}, OS: ${os}`,
    req,
  });

  sendTokenCookies(res, accessToken, refreshToken);

  res.json({
    user: sanitizeUser(user),
    accessToken,
  });
});

// @desc    Refresh session and rotate access token cookies
// @route   POST /api/auth/refresh
// @access  Public
export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    res.status(401);
    throw new Error("Session expired. Please log in again.");
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const activeSession = await Session.findOne({
      userId: decoded.userId,
      refreshToken,
      isActive: true,
    });

    if (!activeSession) {
      res.status(401);
      throw new Error("Session has been revoked or is invalid.");
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.isSuspended) {
      res.status(401);
      throw new Error("Account suspended or removed.");
    }

    // Refresh last active timestamp
    activeSession.lastActiveAt = new Date();
    await activeSession.save();

    const newAccessToken = generateAccessToken(user._id);
    sendTokenCookies(res, newAccessToken, refreshToken);

    res.json({ 
      success: true, 
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
    });
  } catch (err) {
    res.status(401);
    throw new Error("Invalid or expired session. Please log in again.");
  }
});

// @desc    Clear cookies and terminate active session
// @route   POST /api/auth/logout
// @access  Public
export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    await Session.deleteOne({ refreshToken });

    if (req.user) {
      const history = await LoginHistory.findOne({ userId: req.user._id, logoutTime: null }).sort({ createdAt: -1 });
      if (history) {
        history.logoutTime = new Date();
        await history.save();
      }

      await logSecurityEvent({
        userId: req.user._id,
        email: req.user.email,
        action: "logout",
        details: "User successfully logged out.",
        req,
      });
    }
  }

  clearTokenCookies(res);
  res.json({ success: true, message: "Successfully logged out" });
});

// @desc    Send sign up pre-registration verification OTP
// @route   POST /api/auth/send-signup-otp
// @access  Public
export const sendSignupOtp = asyncHandler(async (req, res) => {
  const { email, phone } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPhone = String(phone || "").trim();

  if (!normalizedEmail || !normalizedPhone) {
    res.status(400);
    throw new Error("Email and phone number are required");
  }

  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    res.status(409);
    throw new Error("Email already in use");
  }

  const otp = await otpService.createOtp(normalizedEmail, "signup");
  await emailService.sendOTPEmail(normalizedEmail, otp, "signup");

  res.json({
    success: true,
    message: "Signup verification code sent to your email",
  });
});

// @desc    Verify signup pre-registration OTP
// @route   POST /api/auth/verify-signup-otp
// @access  Public
export const verifySignupOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  console.log(`[authController:verifySignupOtp] Received request to verify email: "${normalizedEmail}", otp: "${otp}"`);
  if (!normalizedEmail || !otp) {
    res.status(400);
    throw new Error("Email and verification code are required");
  }

  const isValid = await otpService.verifyOtp(normalizedEmail, "signup", otp);
  if (!isValid) {
    console.log(`[authController:verifySignupOtp] Verification failed for email: "${normalizedEmail}"`);
    res.status(400);
    throw new Error("Invalid or expired verification code");
  }

  const verificationToken = jwt.sign(
    { email: normalizedEmail, verified: true },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  console.log(`[authController:verifySignupOtp] Verification succeeded. Generated token: ${verificationToken.substring(0, 15)}...`);
  res.json({
    success: true,
    message: "Contact details verified successfully",
    verificationToken,
  });
});

// @desc    Forgot Password OTP request
// @route   POST /api/auth/forgot-password
// @access  Public
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

// @desc    Verify OTP and change password
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !otp || !newPassword) {
    res.status(400);
    throw new Error("Email, verification code, and new password are required");
  }

  // Validate reset password complexity
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    res.status(400);
    throw new Error(passwordError);
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

  user.passwordHash = await bcrypt.hash(newPassword, 12); // cost 12
  await user.save();

  // Send Password Reset confirmation email
  try {
    await emailService.sendPasswordResetConfirmationEmail(normalizedEmail, user.name);
  } catch (err) {
    console.error("Failed to send password reset confirmation email:", err.message);
  }

  await logSecurityEvent({
    userId: user._id,
    email: user.email,
    action: "password_changed",
    details: "User changed password via verification OTP reset.",
    req,
  });

  res.json({
    success: true,
    message: "Password reset successful! You can now log in.",
  });
});

// @desc    List active sessions
// @route   GET /api/auth/sessions
// @access  Private
export const listSessions = asyncHandler(async (req, res) => {
  const currentToken = req.cookies?.refreshToken;
  const sessions = await Session.find({ userId: req.user._id, isActive: true }).sort({ updatedAt: -1 });

  const mappedSessions = sessions.map((s) => ({
    _id: s._id,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    browser: s.browser,
    os: s.os,
    device: s.device,
    loginTime: s.createdAt,
    isCurrent: s.refreshToken === currentToken,
  }));

  res.json(mappedSessions);
});

// @desc    Revoke specific device session
// @route   DELETE /api/auth/sessions/:sessionId
// @access  Private
export const revokeSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await Session.findOne({ _id: sessionId, userId: req.user._id });

  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }

  const currentToken = req.cookies?.refreshToken;
  const isCurrent = session.refreshToken === currentToken;

  await session.deleteOne();

  if (isCurrent) {
    clearTokenCookies(res);
  }

  await logSecurityEvent({
    userId: req.user._id,
    email: req.user.email,
    action: "admin_action",
    details: `Revoked active session ${sessionId} (Current device: ${isCurrent})`,
    req,
  });

  res.json({ success: true, message: "Session revoked successfully", loggedOut: isCurrent });
});

// @desc    Revoke all other device sessions
// @route   POST /api/auth/sessions/logout-other
// @access  Private
export const logoutOtherSessions = asyncHandler(async (req, res) => {
  const currentToken = req.cookies?.refreshToken;
  if (!currentToken) {
    res.status(401);
    throw new Error("Session expired.");
  }

  await Session.deleteMany({ userId: req.user._id, refreshToken: { $ne: currentToken } });

  await logSecurityEvent({
    userId: req.user._id,
    email: req.user.email,
    action: "admin_action",
    details: "Revoked all other active sessions (logout other devices).",
    req,
  });

  res.json({ success: true, message: "Logged out from all other devices successfully" });
});

// @desc    Revoke all active device sessions
// @route   POST /api/auth/sessions/logout-all
// @access  Private
export const logoutAllSessions = asyncHandler(async (req, res) => {
  await Session.deleteMany({ userId: req.user._id });
  clearTokenCookies(res);

  await logSecurityEvent({
    userId: req.user._id,
    email: req.user.email,
    action: "logout",
    details: "Revoked all active sessions (logout all devices).",
    req,
  });

  res.json({ success: true, message: "Logged out from all devices successfully" });
});

// @desc    Add mock wallet balance
// @route   POST /api/auth/add-balance
// @access  Private
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

  await logSecurityEvent({
    userId: user._id,
    email: user.email,
    action: "payment",
    details: `Deposited Rs. ${depositAmount}. New Balance: Rs. ${user.balance}`,
    req,
  });

  res.json({
    success: true,
    balance: user.balance,
    message: `Successfully deposited Rs. ${depositAmount}. New Balance: Rs. ${user.balance}.`,
  });
});

// @desc    Get all users list
// @route   GET /api/auth/users
// @access  Private/Admin
export const getAllUsers = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied");
  }
  const users = await User.find({}).select("-passwordHash");
  res.json(users);
});

// @desc    Admin update user details
// @route   PATCH /api/auth/users/:userId/status
// @access  Private/Admin
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
  if (role !== undefined) {
    const oldRole = user.role;
    user.role = role;
    await logSecurityEvent({
      userId: user._id,
      email: user.email,
      action: "role_change",
      details: `Role updated from ${oldRole} to ${role} by administrator.`,
      req,
    });
  }
  if (password !== undefined) {
    // Validate password strength during administrator resets
    const passwordError = validatePassword(password);
    if (passwordError) {
      res.status(400);
      throw new Error(passwordError);
    }
    user.passwordHash = await bcrypt.hash(password, 12); // cost 12
    await logSecurityEvent({
      userId: user._id,
      email: user.email,
      action: "password_changed",
      details: "Password reset by administrator.",
      req,
    });
  }

  await user.save();

  await logSecurityEvent({
    userId: user._id,
    email: user.email,
    action: "admin_action",
    details: `User status/profile modified by Admin. Suspended: ${isSuspended}, POC Approved: ${isPocApproved}`,
    req,
  });

  res.json(user);
});

// @desc    Self profile details update
// @route   PATCH /api/auth/profile
// @access  Private
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

  const allowedUpdates = [
    "name", "username", "bio", "email", "phone", "collegeName", "course",
    "studentId", "twoFactorEnabled", "notifications", "preferredDistance",
    "academicProfile", "appearance", "deliveryPreferences", "rentalPreferences",
    "marketplacePreferences", "avatarUrl", "country", "state", "city", "institutionType", "campus", "location"
  ];

  let emailChanged = false;
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (field === "email" && req.body.email.toLowerCase().trim() !== user.email) {
        emailChanged = true;
      }
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
    const passwordError = validatePassword(req.body.password);
    if (passwordError) {
      res.status(400);
      throw new Error(passwordError);
    }
    user.passwordHash = await bcrypt.hash(req.body.password, 12); // cost 12
    await logSecurityEvent({
      userId: user._id,
      email: user.email,
      action: "password_changed",
      details: "User updated account password.",
      req,
    });
  }

  if (emailChanged) {
    await logSecurityEvent({
      userId: user._id,
      email: user.email,
      action: "email_changed",
      details: `User email modified to ${user.email}`,
      req,
    });
  }

  await user.save();

  await logSecurityEvent({
    userId: user._id,
    email: user.email,
    action: "profile_updated",
    details: "User updated profile attributes.",
    req,
  });

  res.json({
    success: true,
    user: sanitizeUser(user),
    message: "Profile settings updated successfully"
  });
});
