import WantedItem from "../models/WantedItem.js";
import Item from "../models/Item.js";
import Notification from "../models/Notification.js";
import asyncHandler from "../utils/asyncHandler.js";
import { normalizeItemName } from "../utils/normalizeItem.js";
import { validateContent } from "../utils/contentModeration.js";
import { findMatchingSellersForDemand } from "../services/matchingService.js";
import { sendDemandNotificationEmail } from "../services/emailService.js";

/**
 * @desc Search existing inventory before creating a demand request
 * @route POST /api/wanted-items/search
 * @access Public / Optional Auth
 */
export const searchInventory = asyncHandler(async (req, res) => {
  const { query, category, requestType, collegeName, city } = req.body;

  if (!query || !query.trim()) {
    return res.json({ found: false, items: [] });
  }

  const cleanQuery = query.trim();

  // Content Moderation check
  const moderation = validateContent(cleanQuery);
  if (!moderation.isValid) {
    res.status(400);
    throw new Error(moderation.reason);
  }

  const normalizedStr = normalizeItemName(cleanQuery);
  const keywords = normalizedStr.split(" ").filter((k) => k.length > 1);

  const queryConditions = {
    availabilityStatus: "available",
    isApproved: { $ne: false },
  };

  // Listing type compatibility
  if (requestType === "RENT") {
    queryConditions.listingType = { $in: ["rent", "both"] };
  } else if (requestType === "BUY") {
    queryConditions.listingType = { $in: ["sale", "both"] };
  }

  if (category && category !== "Other") {
    queryConditions.category = category;
  }

  // Regex array for title, description, tags
  const regexConditions = keywords.map((word) => ({
    $or: [
      { title: { $regex: word, $options: "i" } },
      { description: { $regex: word, $options: "i" } },
      { tags: { $regex: word, $options: "i" } },
      { brand: { $regex: word, $options: "i" } },
    ],
  }));

  if (regexConditions.length > 0) {
    queryConditions.$and = regexConditions;
  }

  let items = await Item.find(queryConditions)
    .populate("owner", "name collegeName location avatarUrl ratingsAverage")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // If no items found with strict criteria, try broader title regex search
  if (items.length === 0) {
    delete queryConditions.category;
    delete queryConditions.$and;
    queryConditions.title = { $regex: cleanQuery.replace(/[^a-zA-Z0-9\s]/g, ""), $options: "i" };

    items = await Item.find(queryConditions)
      .populate("owner", "name collegeName location avatarUrl ratingsAverage")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
  }

  return res.json({
    found: items.length > 0,
    count: items.length,
    items,
  });
});

/**
 * @desc Create a new Demand Request / Wanted Item
 * @route POST /api/wanted-items
 * @access Private
 */
export const createDemandRequest = asyncHandler(async (req, res) => {
  const {
    itemName,
    category = "Books",
    requestType = "RENT",
    description = "",
    quantity = 1,
    preferredCondition = "Any",
    college,
    collegeName,
    location,
    city,
    state,
  } = req.body;

  if (!itemName || !itemName.trim()) {
    res.status(400);
    throw new Error("Item name is required.");
  }

  const rawItemName = itemName.trim();

  // Content Moderation check on Item Name & Description
  const itemModeration = validateContent(rawItemName);
  if (!itemModeration.isValid) {
    res.status(400);
    throw new Error(itemModeration.reason);
  }

  if (description && description.trim()) {
    const descModeration = validateContent(description.trim());
    if (!descModeration.isValid) {
      res.status(400);
      throw new Error(descModeration.reason);
    }
  }
  const normalized = normalizeItemName(rawItemName);

  // User Profile Defaults
  const userCollege = collegeName || college || req.user.collegeName || req.user.college || "";
  const userLocation = location || req.user.location || "";
  const userCity = city || req.user.city || "";
  const userState = state || req.user.state || "";

  // Anti-Spam Check: Check for active duplicate request by same user
  const existingActive = await WantedItem.findOne({
    requestedBy: req.user._id,
    normalizedItemName: normalized,
    requestType,
    status: "ACTIVE",
  });

  if (existingActive) {
    res.status(400);
    throw new Error("You already have an active request for this item.");
  }

  // Create WantedItem record
  const wantedItem = await WantedItem.create({
    requestedBy: req.user._id,
    itemName: rawItemName,
    normalizedItemName: normalized,
    category,
    requestType: ["BUY", "RENT"].includes(requestType) ? requestType : "RENT",
    description: description.trim(),
    quantity: Number(quantity) || 1,
    preferredCondition,
    college: userCollege,
    collegeName: userCollege,
    location: userLocation,
    city: userCity,
    state: userState,
    status: "ACTIVE",
  });

  // Run Matching Engine to find candidate sellers/users
  const matchedSellers = await findMatchingSellersForDemand(wantedItem, 20);
  const matchedUserIds = matchedSellers.map((u) => u._id);

  wantedItem.matchedUsers = matchedUserIds;
  wantedItem.notifiedUsers = matchedUserIds;
  await wantedItem.save();

  // Trigger Notifications (Email + In-App) asynchronously in background
  let notificationCount = 0;
  for (const seller of matchedSellers) {
    if (seller.email) {
      try {
        await sendDemandNotificationEmail(seller.email, seller.name, wantedItem);
        notificationCount++;
      } catch (emailErr) {
        console.error(`Failed sending demand email to ${seller.email}:`, emailErr.message);
      }
    }

    // Create in-app notification
    try {
      await Notification.create({
        user: seller._id,
        title: `Someone is looking for ${wantedItem.itemName}`,
        message: `A student at ${userCollege || "your campus"} needs ${wantedItem.itemName} for ${wantedItem.requestType}. Tap to view.`,
        type: "info",
      });
    } catch (notifErr) {
      console.error(`Failed creating in-app notification for seller ${seller._id}:`, notifErr.message);
    }
  }

  res.status(201).json({
    success: true,
    message: `Demand request created! ${notificationCount} relevant RentED users have been notified.`,
    wantedItem,
    notifiedCount: notificationCount,
  });
});

/**
 * @desc Get current user's demand requests
 * @route GET /api/wanted-items/my
 * @access Private
 */
export const getMyDemandRequests = asyncHandler(async (req, res) => {
  const requests = await WantedItem.find({ requestedBy: req.user._id })
    .populate("fulfilledBy", "name email phone collegeName avatarUrl")
    .populate("fulfilledItem")
    .sort({ createdAt: -1 })
    .lean();

  res.json(requests);
});

/**
 * @desc Get relevant active demand requests for sellers/students (with aggregation counts)
 * @route GET /api/wanted-items/relevant
 * @access Private / Optional
 */
export const getRelevantDemandRequests = asyncHandler(async (req, res) => {
  const userCollege = req.user?.collegeName || req.user?.college || "";
  const userCity = req.user?.city || "";

  // Query active demands
  const filter = { status: { $in: ["ACTIVE", "MATCHED"] } };

  if (req.query.category && req.query.category !== "all") {
    filter.category = req.query.category;
  }

  const demands = await WantedItem.find(filter)
    .populate("requestedBy", "name collegeName avatarUrl ratingsAverage")
    .populate("fulfilledItem", "title price rentalPrice salePrice image")
    .sort({ createdAt: -1 })
    .lean();

  // Aggregate requests by normalizedItemName to present student demand counts
  const aggregatedMap = {};
  demands.forEach((item) => {
    const key = item.normalizedItemName;
    if (!aggregatedMap[key]) {
      aggregatedMap[key] = {
        normalizedItemName: key,
        displayTitle: item.itemName,
        category: item.category,
        totalRequests: 0,
        buyCount: 0,
        rentCount: 0,
        colleges: new Set(),
        sampleRequest: item,
        requestsList: [],
      };
    }

    aggregatedMap[key].totalRequests += 1;
    if (item.requestType === "BUY") aggregatedMap[key].buyCount += 1;
    if (item.requestType === "RENT") aggregatedMap[key].rentCount += 1;
    if (item.collegeName) aggregatedMap[key].colleges.add(item.collegeName);
    aggregatedMap[key].requestsList.push(item);
  });

  const aggregatedList = Object.values(aggregatedMap).map((agg) => ({
    ...agg,
    colleges: Array.from(agg.colleges),
  }));

  res.json({
    demands,
    aggregated: aggregatedList,
  });
});

/**
 * @desc Admin route: Get all demand requests
 * @route GET /api/wanted-items/all
 * @access Private (Admin)
 */
export const getAllDemandRequests = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied: Admins only.");
  }

  const requests = await WantedItem.find({})
    .populate("requestedBy", "name email collegeName role")
    .populate("fulfilledBy", "name email")
    .populate("fulfilledItem", "title price")
    .sort({ createdAt: -1 })
    .lean();

  res.json(requests);
});

/**
 * @desc Get single demand request by ID
 * @route GET /api/wanted-items/:id
 * @access Public / Private
 */
export const getDemandRequestById = asyncHandler(async (req, res) => {
  const item = await WantedItem.findById(req.params.id)
    .populate("requestedBy", "name collegeName avatarUrl location city")
    .populate("fulfilledBy", "name email phone collegeName")
    .populate("fulfilledItem")
    .lean();

  if (!item) {
    res.status(404);
    throw new Error("Demand request not found.");
  }

  res.json(item);
});

/**
 * @desc Cancel a demand request
 * @route POST /api/wanted-items/:id/cancel
 * @access Private
 */
export const cancelDemandRequest = asyncHandler(async (req, res) => {
  const item = await WantedItem.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error("Demand request not found.");
  }

  if (item.requestedBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Unauthorized to cancel this demand request.");
  }

  item.status = "CANCELLED";
  await item.save();

  res.json({ success: true, message: "Demand request cancelled.", item });
});

/**
 * @desc Manually fulfill demand request with listing item ID
 * @route POST /api/wanted-items/:id/fulfill
 * @access Private
 */
export const fulfillDemandRequest = asyncHandler(async (req, res) => {
  const { itemId } = req.body;
  const wantedItem = await WantedItem.findById(req.params.id);

  if (!wantedItem) {
    res.status(404);
    throw new Error("Demand request not found.");
  }

  const item = await Item.findById(itemId);
  if (!item) {
    res.status(404);
    throw new Error("Target listing item not found.");
  }

  wantedItem.status = "FULFILLED";
  wantedItem.fulfilledBy = req.user._id;
  wantedItem.fulfilledItem = item._id;
  wantedItem.responseCount += 1;
  await wantedItem.save();

  // Notify the requester
  try {
    await Notification.create({
      user: wantedItem.requestedBy,
      title: `Listing Found for ${wantedItem.itemName}!`,
      message: `${req.user.name} has created a listing "${item.title}" matching your requested item. Tap to view.`,
      type: "info",
    });
  } catch (err) {
    console.error("Notification creation failed:", err.message);
  }

  res.json({ success: true, message: "Demand request marked as fulfilled.", wantedItem });
});

/**
 * @desc Delete a demand request
 * @route DELETE /api/wanted-items/:id
 * @access Private
 */
export const deleteDemandRequest = asyncHandler(async (req, res) => {
  const item = await WantedItem.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error("Demand request not found.");
  }

  if (item.requestedBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Unauthorized to delete this request.");
  }

  await WantedItem.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Demand request deleted." });
});
