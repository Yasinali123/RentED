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
        "Electronics",
        "Hostel Essentials",
        "Furniture",
        "Room / PG Listings"
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
      required: true,
      trim: true,
      default: "India",
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    collegeName: {
      type: String,
      required: true,
      trim: true,
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

const Item = mongoose.model("Item", itemSchema);

export default Item;
