import Item from "../models/Item.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getNearbySuggestions = asyncHandler(async (req, res) => {
  const suggestions = await Item.find({
    owner: { $ne: req.user._id },
    availabilityStatus: "available",
    $or: [{ location: req.user.location }, { campus: req.user.campus }],
  })
    .populate("owner", "name campus location")
    .sort({ createdAt: -1 })
    .limit(6);

  res.json(suggestions);
});

