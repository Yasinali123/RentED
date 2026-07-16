import Review from "../models/Review.js";
import RentalRequest from "../models/RentalRequest.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";

const updateUserRatings = async (userId) => {
  const [ratingSummary] = await Review.aggregate([
    { $match: { reviewee: userId } },
    {
      $group: {
        _id: "$reviewee",
        avgRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  await User.findByIdAndUpdate(userId, {
    ratingsAverage: ratingSummary?.avgRating || 0,
    ratingsCount: ratingSummary?.reviewCount || 0,
  });
};

const updatePocRatings = async (pocId) => {
  try {
    const completedOrders = await RentalRequest.find({ poc: pocId });
    const orderIds = completedOrders.map(o => o._id);
    const pocReviews = await Review.find({ 
      rentalRequest: { $in: orderIds }, 
      pocRating: { $exists: true, $ne: null } 
    });
    
    const reviewCount = pocReviews.length;
    const avgRating = reviewCount > 0 
      ? pocReviews.reduce((sum, r) => sum + r.pocRating, 0) / reviewCount 
      : 0;

    await User.findByIdAndUpdate(pocId, {
      ratingsAverage: Number(avgRating.toFixed(1)),
      ratingsCount: reviewCount,
    });
  } catch (err) {
    console.error("Failed to update POC ratings:", err.message);
  }
};

export const createReview = asyncHandler(async (req, res) => {
  const { rentalRequestId, rating, comment, pocRating, pocComment } = req.body;
  const normalizedRating = Number(rating);

  const request = await RentalRequest.findById(rentalRequestId);
  if (!request) {
    res.status(404);
    throw new Error("Request not found");
  }

  if (request.status.toLowerCase() !== "completed") {
    res.status(400);
    throw new Error("Reviews are only available after a completed transaction");
  }

  const isParticipant =
    request.owner.toString() === req.user._id.toString() ||
    request.renter.toString() === req.user._id.toString();

  if (!isParticipant) {
    res.status(403);
    throw new Error("You cannot review this transaction");
  }

  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    res.status(400);
    throw new Error("Rating must be a whole number from 1 to 5");
  }

  const existingReview = await Review.findOne({
    reviewer: req.user._id,
    rentalRequest: request._id,
  });
  if (existingReview) {
    res.status(409);
    throw new Error("You have already reviewed this transaction");
  }

  const revieweeId =
    request.owner.toString() === req.user._id.toString() ? request.renter : request.owner;

  const review = await Review.create({
    reviewer: req.user._id,
    reviewee: revieweeId,
    item: request.item,
    rentalRequest: request._id,
    rating: normalizedRating,
    comment: comment || "",
    pocRating: pocRating ? Number(pocRating) : undefined,
    pocComment: pocComment || "",
  });

  await updateUserRatings(revieweeId);

  if (pocRating && request.poc) {
    await updatePocRatings(request.poc);
  }

  const populatedReview = await Review.findById(review._id)
    .populate("reviewer", "name avatarUrl")
    .populate("reviewee", "name avatarUrl")
    .populate("item", "title");

  res.status(201).json(populatedReview);
});

export const getUserReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ reviewee: req.params.userId })
    .populate("reviewer", "name avatarUrl")
    .populate("item", "title")
    .sort({ createdAt: -1 });

  res.json(reviews);
});
