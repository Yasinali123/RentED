import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import { 
  getCoupons, 
  createCoupon, 
  toggleCoupon, 
  deleteCoupon, 
  validateCoupon 
} from "../controllers/couponController.js";

const router = express.Router();

// Helper admin checker middleware
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403);
    throw new Error("Access denied: Admin role required.");
  }
};

// General verification route for checking out
router.post("/validate", protect, validateCoupon);

// Admin-only management routes
router.get("/", protect, adminOnly, getCoupons);
router.post("/", protect, adminOnly, createCoupon);
router.patch("/:id/toggle", protect, adminOnly, toggleCoupon);
router.delete("/:id", protect, adminOnly, deleteCoupon);

export default router;
