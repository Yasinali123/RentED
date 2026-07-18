import mongoose from "mongoose";

const geocodeCacheSchema = new mongoose.Schema(
  {
    lat: {
      type: Number,
      required: true,
    },
    lon: {
      type: Number,
      required: true,
    },
    result: {
      type: Object,
      required: true,
    },
  },
  { timestamps: true }
);

// Create compound index for lat and lon for fast lookups
geocodeCacheSchema.index({ lat: 1, lon: 1 }, { unique: true });

// Set expiration for cached results (7 days = 604800 seconds)
geocodeCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

const GeocodeCache = mongoose.model("GeocodeCache", geocodeCacheSchema);

export default GeocodeCache;
