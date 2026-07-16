import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    rentalRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalRequest",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
      trim: true,
    },
    pocRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    pocComment: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

reviewSchema.index({ reviewer: 1, rentalRequest: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);

export default Review;
