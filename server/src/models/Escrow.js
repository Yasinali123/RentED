import mongoose from "mongoose";

const escrowSchema = new mongoose.Schema(
  {
    rentalRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalRequest",
      required: true,
      unique: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    poc: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    itemPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformCommission: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    sellerEarnings: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    pocEarnings: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    platformDeliveryShare: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["locked", "released", "refunded", "disputed"],
      default: "locked",
    },
    autoReleaseAt: {
      type: Date,
      default: null,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Escrow = mongoose.model("Escrow", escrowSchema);

export default Escrow;
