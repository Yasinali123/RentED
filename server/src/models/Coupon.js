import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      default: "flat",
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        order: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "RentalRequest",
          default: null,
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    maxUsesPerUser: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
