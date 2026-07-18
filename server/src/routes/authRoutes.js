import express from "express";

import {
  getMe,
  login,
  signup,
  googleLogin,
  forgotPassword,
  verifyOtp,
  sendSignupOtp,
  verifySignupOtp,
  getAllUsers,
  updateUserStatus,
  addBalance,
  updateProfile,
  verifyEmail,
  refresh,
  logout,
  listSessions,
  revokeSession,
  logoutOtherSessions,
  logoutAllSessions,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadAvatar } from "../middleware/upload.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/send-signup-otp", sendSignupOtp);
router.post("/verify-signup-otp", verifySignupOtp);
router.post("/login", login);
router.post("/google", googleLogin);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/verify-email", verifyEmail);
router.post("/refresh", refresh);
router.post("/logout", logout);

router.get("/users", protect, getAllUsers);
router.patch("/users/:userId/status", protect, updateUserStatus);
router.get("/me", protect, getMe);
router.post("/add-balance", protect, addBalance);
router.patch("/profile", protect, uploadAvatar, updateProfile);

router.get("/sessions", protect, listSessions);
router.delete("/sessions/:sessionId", protect, revokeSession);
router.post("/sessions/logout-other", protect, logoutOtherSessions);
router.post("/sessions/logout-all", protect, logoutAllSessions);

export default router;

