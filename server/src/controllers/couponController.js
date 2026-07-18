import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import { notifyUser } from "../utils/notificationHelper.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Get all coupons (Admin only)
// @route   GET /api/coupons
export const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find({}).sort({ createdAt: -1 });
  res.json(coupons);
});

// @desc    Create a new coupon (Admin only)
// @route   POST /api/coupons
export const createCoupon = asyncHandler(async (req, res) => {
  const { code, discountType, value, expiryDate } = req.body;

  if (!code || !discountType || value === undefined || !expiryDate) {
    res.status(400);
    throw new Error("Please provide all required fields (code, discountType, value, expiryDate).");
  }

  const cleanCode = code.trim().toUpperCase();
  const existing = await Coupon.findOne({ code: cleanCode });
  if (existing) {
    res.status(400);
    throw new Error(`Coupon with code '${cleanCode}' already exists.`);
  }

  const coupon = await Coupon.create({
    code: cleanCode,
    discountType,
    value,
    expiryDate: new Date(expiryDate),
    isActive: true
  });

  // Notify all users about the new coupon
  try {
    const users = await User.find({ isSuspended: false }).select("_id");
    const discLabel = discountType === "percentage" ? `${value}%` : `₹${value}`;
    const expiryStr = new Date(expiryDate).toLocaleDateString();
    for (const u of users) {
      await notifyUser(u._id, "🎉 New Coupon Available!", `Use code ${cleanCode} to get ${discLabel} off! Valid until ${expiryStr}.`, "general");
    }
  } catch (err) {
    console.error("Failed to notify users about new coupon:", err.message);
  }

  res.status(201).json(coupon);
});

// @desc    Toggle coupon active status (Admin only)
// @route   PATCH /api/coupons/:id/toggle
export const toggleCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }

  coupon.isActive = !coupon.isActive;
  await coupon.save();
  res.json(coupon);
});

// @desc    Delete a coupon (Admin only)
// @route   DELETE /api/coupons/:id
export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }

  await coupon.deleteOne();
  res.json({ success: true, message: "Coupon deleted successfully." });
});

// @desc    Validate a coupon code (Renter checkout)
// @route   POST /api/coupons/validate
export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, amount } = req.body;

  if (!code || amount === undefined) {
    res.status(400);
    throw new Error("Please provide coupon code and purchase amount.");
  }

  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
  if (!coupon) {
    res.status(404);
    throw new Error("Invalid coupon code.");
  }

  if (!coupon.isActive) {
    res.status(400);
    throw new Error("This coupon is no longer active.");
  }

  if (new Date(coupon.expiryDate) < new Date()) {
    res.status(400);
    throw new Error("This coupon has expired.");
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = (amount * coupon.value) / 100;
  } else {
    // flat discount
    discountAmount = coupon.value;
  }

  // Cap discount at the amount itself
  discountAmount = Math.min(discountAmount, amount);
  const finalAmount = amount - discountAmount;

  res.json({
    success: true,
    code: coupon.code,
    discountType: coupon.discountType,
    value: coupon.value,
    discountAmount,
    finalAmount,
  });
});
