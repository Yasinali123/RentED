import mongoose from "mongoose";

const searchQuerySchema = new mongoose.Schema(
  {
    query: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    count: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

searchQuerySchema.index({ count: -1 });
searchQuerySchema.index({ updatedAt: -1 });

const SearchQuery = mongoose.model("SearchQuery", searchQuerySchema);
export default SearchQuery;
