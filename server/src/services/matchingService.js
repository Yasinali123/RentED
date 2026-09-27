import User from "../models/User.js";
import Item from "../models/Item.js";

/**
 * Service to match potential sellers/users who might have the requested item.
 * Scoring system:
 * - Same College: +50
 * - Same Location / City: +30
 * - Listed similar item / keyword match: +100
 * - Listed item in same category: +40
 * - Role seller/poc: +20
 *
 * MAX_NOTIFICATION_RECIPIENTS = 20
 */
export const findMatchingSellersForDemand = async (wantedItem, maxLimit = 20) => {
  try {
    const requesterId = wantedItem.requestedBy ? wantedItem.requestedBy._id || wantedItem.requestedBy : null;

    // 1. Fetch potential active users (excluding the requester)
    const potentialUsers = await User.find({
      _id: { $ne: requesterId },
      isSuspended: { $ne: true },
    }).lean();

    if (!potentialUsers || potentialUsers.length === 0) {
      return [];
    }

    // 2. Fetch all active items to inspect previous listing patterns
    const activeItems = await Item.find({
      availabilityStatus: "available",
      isApproved: true,
    }).select("owner title category collegeName city location tags").lean();

    // Map owner -> listed items
    const ownerItemsMap = {};
    activeItems.forEach((item) => {
      const ownerIdStr = item.owner.toString();
      if (!ownerItemsMap[ownerIdStr]) {
        ownerItemsMap[ownerIdStr] = [];
      }
      ownerItemsMap[ownerIdStr].push(item);
    });

    const searchKeywords = wantedItem.normalizedItemName.split(" ").filter((k) => k.length > 2);

    // 3. Calculate match score for each user
    const scoredUsers = potentialUsers.map((user) => {
      let score = 0;
      const userCollege = (user.collegeName || user.college || "").toLowerCase();
      const userCity = (user.city || user.location || "").toLowerCase();
      const demandCollege = (wantedItem.collegeName || wantedItem.college || "").toLowerCase();
      const demandCity = (wantedItem.city || wantedItem.location || "").toLowerCase();

      // Same college score
      if (demandCollege && userCollege && (userCollege.includes(demandCollege) || demandCollege.includes(userCollege))) {
        score += 50;
      }

      // Same location/city score
      if (demandCity && userCity && (userCity.includes(demandCity) || demandCity.includes(userCity))) {
        score += 30;
      }

      // Role seller/poc bonus
      if (user.role === "seller" || user.role === "poc") {
        score += 20;
      }

      // Check items listed by this user
      const userItems = ownerItemsMap[user._id.toString()] || [];
      let categoryMatched = false;
      let keywordMatched = false;

      for (const item of userItems) {
        if (!categoryMatched && item.category && wantedItem.category && item.category.toLowerCase() === wantedItem.category.toLowerCase()) {
          score += 40;
          categoryMatched = true;
        }

        const itemTitle = (item.title || "").toLowerCase();
        for (const kw of searchKeywords) {
          if (!keywordMatched && itemTitle.includes(kw)) {
            score += 100;
            keywordMatched = true;
            break;
          }
        }
      }

      return {
        user,
        score,
      };
    });

    // 4. Sort candidates by score descending, filter score > 0
    const matched = scoredUsers
      .filter((u) => u.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxLimit)
      .map((u) => u.user);

    return matched;
  } catch (error) {
    console.error("Matching service error:", error);
    return [];
  }
};
