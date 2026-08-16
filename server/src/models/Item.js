import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      min: 0,
      default: null,
    },
    listingType: {
      type: String,
      enum: ["rent", "sale", "both"],
      default: "both",
    },
    rentalPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    salePrice: {
      type: Number,
      min: 0,
      default: null,
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
        "Rooms"
      ],
      required: true,
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    country: {
      type: String,
      trim: true,
      default: "India",
    },
    state: {
      type: String,
      trim: true,
      default: "General",
    },
    city: {
      type: String,
      trim: true,
      default: "General",
    },
    collegeName: {
      type: String,
      trim: true,
      default: "Campus",
    },
    location: {
      type: String,
      trim: true,
    },
    campus: {
      type: String,
      trim: true,
    },
    geometry: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    pickupLatitude: {
      type: Number,
      default: null,
    },
    pickupLongitude: {
      type: Number,
      default: null,
    },
    pickupAddress: {
      type: String,
      trim: true,
      default: "",
    },
    college: {
      type: String,
      trim: true,
      default: "",
    },
    district: {
      type: String,
      trim: true,
      default: "",
    },
    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true }
        }
      ],
      default: [],
      validate: {
        validator: (value) => value.length <= 5,
        message: "You can upload up to 5 photos",
      },
    },
    condition: {
      type: String,
      enum: ["New", "Like New", "Good", "Fair"],
      default: "Good",
    },
    brand: {
      type: String,
      default: "",
      trim: true,
    },
    details: {
      type: [String],
      default: [],
    },
    availabilityStatus: {
      type: String,
      enum: ["available", "pending", "rented", "sold"],
      default: "available",
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

itemSchema.virtual("photos").get(function () {
  return this.images ? this.images.map((img) => img.url) : [];
});

itemSchema.virtual("image").get(function () {
  return this.images && this.images.length > 0 ? this.images[0].url : "";
});

itemSchema.index({ title: "text", description: "text", location: "text", campus: "text", city: "text", collegeName: "text" });
itemSchema.index({ geometry: "2dsphere" });
itemSchema.index({ title: 1 });
itemSchema.index({ category: 1 });
itemSchema.index({ collegeName: 1 });
itemSchema.index({ tags: 1 });
itemSchema.index({ availabilityStatus: 1, isApproved: 1, category: 1 });
itemSchema.index({ owner: 1, createdAt: -1 });
itemSchema.index({ collegeName: 1, availabilityStatus: 1 });
itemSchema.index({ createdAt: -1 });

const Item = mongoose.model("Item", itemSchema);

export default Item;
