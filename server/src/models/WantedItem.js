import mongoose from "mongoose";

const wantedItemSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedItemName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      enum: [
        "Books",
        "Topper Notes",
        "Medical Books",
        "Law Books",
        "Commerce Books",
        "Engineering Books",
        "Calculators",
        "Lab Equipment",
        "Equipment",
        "Electronics",
        "Hostel Essentials",
        "Furniture",
        "Room / PG Listings",
        "Rooms",
        "Other"
      ],
      default: "Books",
    },
    requestType: {
      type: String,
      enum: ["BUY", "RENT"],
      required: true,
      default: "RENT",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    preferredCondition: {
      type: String,
      enum: ["New", "Like New", "Good", "Fair", "Any"],
      default: "Any",
    },
    college: {
      type: String,
      trim: true,
      default: "",
    },
    collegeName: {
      type: String,
      trim: true,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "MATCHED", "FULFILLED", "EXPIRED", "CANCELLED"],
      default: "ACTIVE",
    },
    matchedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    notifiedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    responseCount: {
      type: Number,
      default: 0,
    },
    fulfilledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    fulfilledItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      default: null,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
    },
  },
  { timestamps: true }
);

wantedItemSchema.index({ normalizedItemName: 1, status: 1 });
wantedItemSchema.index({ requestedBy: 1, status: 1 });
wantedItemSchema.index({ category: 1, status: 1 });
wantedItemSchema.index({ collegeName: 1, status: 1 });
wantedItemSchema.index({ createdAt: -1 });

const WantedItem = mongoose.model("WantedItem", wantedItemSchema);

export default WantedItem;
