import express from "express";

import { getMe, login, signup, googleLogin, forgotPassword, verifyOtp, getAllUsers, updateUserStatus, addBalance, updateProfile } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/google", googleLogin);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.get("/users", protect, getAllUsers);
router.patch("/users/:userId/status", protect, updateUserStatus);
router.get("/me", protect, getMe);
router.post("/add-balance", protect, addBalance);
router.patch("/profile", protect, updateProfile);

export default router;

