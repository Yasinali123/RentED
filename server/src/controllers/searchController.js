import Item from "../models/Item.js";
import User from "../models/User.js";
import SearchQuery from "../models/SearchQuery.js";
import asyncHandler from "../utils/asyncHandler.js";

// Helper to wrap matched query substrings in HTML strong tags
const highlightMatch = (text, query) => {
  if (!text || !query) return text;
  const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  return text.replace(regex, "<strong>$1</strong>");
};

// @desc    Get autocomplete suggestions for a query
// @route   GET /api/search/suggestions
// @access  Public
export const getSuggestions = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();

  // If query is empty, return popular and trending search terms
  if (!q) {
    const popularRecords = await SearchQuery.find({}).sort({ count: -1 }).limit(5);
    const trendingRecords = await SearchQuery.find({}).sort({ updatedAt: -1 }).limit(5);

    return res.json({
      suggestions: [],
      popular: popularRecords.map((r) => r.query),
      trending: trendingRecords.map((r) => r.query),
    });
  }

  // 1. Query matching available items (Name/Book Name)
  const items = await Item.find({
    title: { $regex: q, $options: "i" },
    availabilityStatus: "available",
    isApproved: { $ne: false },
  })
    .limit(8)
    .select("title category collegeName");

  // 2. Query matching categories
  const categories = await Item.distinct("category", {
    category: { $regex: q, $options: "i" },
    availabilityStatus: "available",
    isApproved: { $ne: false },
  });

  // 3. Query matching colleges
  const colleges = await Item.distinct("collegeName", {
    collegeName: { $regex: q, $options: "i" },
    availabilityStatus: "available",
    isApproved: { $ne: false },
  });

  // 4. Query matching sellers
  const sellers = await User.find({
    name: { $regex: q, $options: "i" },
    role: { $in: ["seller", "student"] },
  })
    .limit(3)
    .select("name");

  // 5. Query matching tags
  const tags = await Item.distinct("tags", {
    tags: { $regex: q, $options: "i" },
    availabilityStatus: "available",
    isApproved: { $ne: false },
  });

  // Assemble and format suggestion payloads
  const suggestionList = [];

  items.forEach((item) => {
    suggestionList.push({
      text: item.title,
      type: "item",
      highlighted: highlightMatch(item.title, q),
    });
  });

  categories.slice(0, 3).forEach((cat) => {
    suggestionList.push({
      text: cat,
      type: "category",
      highlighted: highlightMatch(cat, q),
    });
  });

  colleges.slice(0, 3).forEach((col) => {
    suggestionList.push({
      text: col,
      type: "college",
      highlighted: highlightMatch(col, q),
    });
  });

  sellers.forEach((sel) => {
    suggestionList.push({
      text: sel.name,
      type: "seller",
      highlighted: highlightMatch(sel.name, q),
    });
  });

  tags.slice(0, 4).forEach((tag) => {
    suggestionList.push({
      text: tag,
      type: "tag",
      highlighted: highlightMatch(tag, q),
    });
  });

  // De-duplicate matching suggestions (case-insensitive deduplication)
  const uniqueSuggestions = [];
  const seenKeys = new Set();

  for (const s of suggestionList) {
    const key = `${s.type}:${s.text.toLowerCase().trim()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueSuggestions.push(s);
    }
  }

  res.json({
    suggestions: uniqueSuggestions.slice(0, 10),
  });
});

// @desc    Log search query keywords
// @route   POST /api/search/log
// @access  Public
export const logSearchQuery = asyncHandler(async (req, res) => {
  const queryTerm = String(req.body.query || "").trim();

  if (queryTerm && queryTerm.length >= 2) {
    const normalized = queryTerm.toLowerCase();
    await SearchQuery.findOneAndUpdate(
      { query: normalized },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );
  }

  res.json({ success: true });
});
