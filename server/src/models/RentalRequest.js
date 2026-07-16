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
      enum: ["online", "cod", "gpay", "paytm", "upi"],
      default: "online",
    },
    status: {
      type: String,
      enum: [
        "Pending Payment",
        "Payment Successful",
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
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    dummyPaymentStatus: {
      type: String,
      enum: ["not_started", "authorized", "captured", "cod_pending"],
      default: "not_started",
    },
    dummyPaymentReference: {
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
