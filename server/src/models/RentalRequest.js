import mongoose from "mongoose";

const rentalRequestSchema = new mongoose.Schema(
  {
    requestType: {
      type: String,
      enum: ["rental", "purchase"],
      default: "rental",
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startDate: {
      type: Date,
      required: function requiredStartDate() {
        return this.requestType === "rental";
      },
      default: null,
    },
    endDate: {
      type: Date,
      required: function requiredEndDate() {
        return this.requestType === "rental";
      },
      default: null,
    },
    message: {
      type: String,
      default: "",
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ["online", "cod", "wallet", "gpay", "paytm", "upi"],
      default: "online",
    },
    status: {
      type: String,
      enum: [
        "Pending Payment",
        "Payment Successful",
        "COD Pending",
        "Pending Pickup",
        "Seller Accepted",
        "Seller Rejected",
        "POC Assigned",
        "Pickup Scheduled",
        "Picked Up",
        "Out For Delivery",
        "Delivered",
        "Rental Active",
        "Return Requested",
        "Returned",
        "Completed",
        "Cancelled",
        "Refund Initiated",
        "Refund Completed"
      ],
      default: "Pending Payment",
    },
    itemPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    commissionAmount: {
      type: Number,
      default: 0,
    },
    sellerEarnings: {
      type: Number,
      default: 0,
    },
    pocEarnings: {
      type: Number,
      default: 0,
    },
    platformDeliveryShare: {
      type: Number,
      default: 0,
    },
    escrow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escrow",
      default: null,
    },
    codCollected: {
      type: Boolean,
      default: false,
    },
    codVerifiedByAdmin: {
      type: Boolean,
      default: false,
    },
    paymentReference: {
      type: String,
      default: "",
    },
    deliveryAddress: {
      type: String,
      default: "",
    },
    trackingStatus: {
      type: String,
      default: "Pending Payment",
    },
    poc: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    pickupQrCode: {
      type: String,
      default: "",
    },
    deliveryQrCode: {
      type: String,
      default: "",
    },
    failedPickupAttempts: {
      type: Number,
      default: 0,
    },
    failedDeliveryAttempts: {
      type: Number,
      default: 0,
    },
    proofPhoto: {
      type: String,
      default: "",
    },
    disputed: {
      type: Boolean,
      default: false,
    },
    disputeReason: {
      type: String,
      default: "",
    },
    disputeStatus: {
      type: String,
      enum: ["none", "pending", "resolved"],
      default: "none",
    },
    commissionAmount: {
      type: Number,
      default: 0,
    },
    earningsReleased: {
      type: Boolean,
      default: false,
    },
    trackingHistory: [
      {
        status: {
          type: String,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        location: {
          type: String,
          default: "",
        },
      },
    ],
  },
  { timestamps: true },
);

const RentalRequest = mongoose.model("RentalRequest", rentalRequestSchema);

export default RentalRequest;
