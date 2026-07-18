import College from "../models/College.js";
import Item from "../models/Item.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Get all colleges
// @route   GET /api/colleges
// @access  Public
export const getColleges = asyncHandler(async (req, res) => {
  const colleges = await College.find({}).sort({ name: 1 });
  res.json(colleges);
});

// @desc    Create a new college
// @route   POST /api/colleges
// @access  Private/Admin
export const createCollege = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied: Admins only");
  }

  const { name, city, state, latitude, longitude } = req.body;

  if (!name || !city || !state) {
    res.status(400);
    throw new Error("Please provide name, city, and state");
  }

  const normalizedName = String(name).trim();
  const existingCollege = await College.findOne({ name: { $regex: new RegExp(`^${normalizedName}$`, "i") } });

  if (existingCollege) {
    res.status(409);
    throw new Error("A college with this name is already registered");
  }

  const college = await College.create({
    name: normalizedName,
    city: String(city).trim(),
    state: String(state).trim(),
    latitude: latitude ? Number(latitude) : undefined,
    longitude: longitude ? Number(longitude) : undefined,
  });

  res.status(201).json(college);
});

// @desc    Delete a college
// @route   DELETE /api/colleges/:id
// @access  Private/Admin
export const deleteCollege = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied: Admins only");
  }

  const college = await College.findById(req.params.id);

  if (!college) {
    res.status(404);
    throw new Error("College not found");
  }

  // Check if college is being referenced by any active listing, to prevent database integrity issues
  const listingsCount = await Item.countDocuments({ collegeName: college.name });
  if (listingsCount > 0) {
    res.status(400);
    throw new Error(`Cannot delete college network: ${listingsCount} listings are currently linked to this campus.`);
  }

  await college.deleteOne();
  res.json({ success: true, message: "College network removed successfully" });
});
