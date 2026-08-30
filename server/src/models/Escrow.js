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
    platformCommissionRate: {
      type: Number,
      default: 10,
    },
    pocCommissionRate: {
      type: Number,
      default: 5,
    },
    sellerCommissionRate: {
      type: Number,
      default: 85,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    pocPayout: {
      type: Number,
      default: 0,
    },
    sellerPayout: {
      type: Number,
      default: 0,
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

escrowSchema.index({ buyer: 1, createdAt: -1 });
escrowSchema.index({ seller: 1, createdAt: -1 });
escrowSchema.index({ poc: 1 });
escrowSchema.index({ status: 1 });

const Escrow = mongoose.model("Escrow", escrowSchema);

export default Escrow;
