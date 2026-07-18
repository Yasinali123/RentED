import Item from "../models/Item.js";
import asyncHandler from "../utils/asyncHandler.js";
import cloudinary from "../config/cloudinary.js";

const itemOwnerProjection =
  "name email campus location ratingsAverage ratingsCount avatarUrl verifiedCollegeId country state city institutionType collegeName geometry";
const validListingTypes = new Set(["rent", "sale", "both"]);

const normalizeOptionalMoney = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
};

export const createItem = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    price,
    rentalPrice,
    salePrice,
    listingType = "both",
    category,
    location,
    condition,
    brand,
    details,
    campus,
    tags,
  } = req.body;

  if (!title || !description || !category) {
    res.status(400);
    throw new Error("Missing required item fields");
  }

  const parseArrayField = (field) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === "string") {
      if (field.startsWith("[") && field.endsWith("]")) {
        try {
          return JSON.parse(field);
        } catch (e) {}
      }
      return field.split(",").map(item => item.trim()).filter(Boolean);
    }
    return [];
  };

  const normalizedRentalPrice = normalizeOptionalMoney(rentalPrice ?? price);
  const normalizedSalePrice = normalizeOptionalMoney(salePrice);
  
  const images = req.files
    ? req.files.map((file) => ({ url: file.path, publicId: file.filename }))
    : [];

  const normalizedDetails = parseArrayField(details)
    .map((detail) => String(detail || "").trim())
    .filter(Boolean)
    .slice(0, 6);

  const normalizedTags = parseArrayField(tags)
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .slice(0, 10);

  const hasRentalPrice = normalizedRentalPrice !== null;
  const hasSalePrice = normalizedSalePrice !== null;
  const normalizedListingType = validListingTypes.has(listingType)
    ? listingType
    : hasRentalPrice && hasSalePrice
      ? "both"
      : hasRentalPrice
        ? "rent"
        : hasSalePrice
          ? "sale"
          : "";

  if (!hasRentalPrice && !hasSalePrice) {
    res.status(400);
    throw new Error("Add at least one valid price for rent or sale");
  }

  if (normalizedRentalPrice !== null && (!Number.isFinite(normalizedRentalPrice) || normalizedRentalPrice < 0)) {
    res.status(400);
    throw new Error("A valid rental price is required");
  }

  if (normalizedSalePrice !== null && (!Number.isFinite(normalizedSalePrice) || normalizedSalePrice < 0)) {
    res.status(400);
    throw new Error("A valid sale price is required");
  }

  if (!normalizedListingType) {
    res.status(400);
    throw new Error("Listing type must be rent, sale, or both");
  }

  if (normalizedListingType === "rent" && !hasRentalPrice) {
    res.status(400);
    throw new Error("A rental listing needs a rental price");
  }

  if (normalizedListingType === "sale" && !hasSalePrice) {
    res.status(400);
    throw new Error("A sale listing needs a sale price");
  }

  if (normalizedListingType === "both" && (!hasRentalPrice || !hasSalePrice)) {
    res.status(400);
    throw new Error("A rent and buy listing needs both rental and sale prices");
  }

  if (images.length < 2) {
    res.status(400);
    throw new Error("Please upload at least 2 photos of the item for verification");
  }

  const item = await Item.create({
    owner: req.user._id,
    title: String(title).trim(),
    description: String(description).trim(),
    price: normalizedRentalPrice ?? normalizedSalePrice,
    listingType: normalizedListingType,
    rentalPrice: normalizedRentalPrice,
    salePrice: normalizedSalePrice,
    category,
    country: req.user.country || "India",
    state: req.user.state || "",
    city: req.user.city || "",
    collegeName: req.user.collegeName || "",
    location: String(location || req.user.location || "").trim(),
    campus: String(campus || req.user.campus || "").trim(),
    geometry: req.user.geometry,
    images: images,
    condition: condition || "Good",
    brand: String(brand || "").trim(),
    details: normalizedDetails,
    tags: normalizedTags,
  });

  const populatedItem = await item.populate("owner", itemOwnerProjection);
  res.status(201).json(populatedItem);
});

export const getItems = asyncHandler(async (req, res) => {
  const {
    q,
    category,
    location,
    campus,
    limit,
    listingType,
    includeUnavailable,
    city,
    collegeName,
    radius,
    lat,
    lng,
    condition,
    verifiedSeller,
    priceMin,
    priceMax,
    availableToday,
    sortBy,
  } = req.query;

  const query = { isApproved: { $ne: false } };

  if (includeUnavailable !== "true") {
    query.availabilityStatus = "available";
  }

  if (q) {
    query.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { tags: { $elemMatch: { $regex: q, $options: "i" } } },
    ];
  }

  if (category && category !== "All") {
    query.category = category;
  }

  if (location) {
    query.location = { $regex: location, $options: "i" };
  }

  if (campus) {
    query.campus = { $regex: campus, $options: "i" };
  }

  if (city) {
    query.city = { $regex: city, $options: "i" };
  }

  if (collegeName) {
    query.collegeName = { $regex: collegeName, $options: "i" };
  }

  if (condition && condition !== "All") {
    query.condition = condition;
  }

  if (availableToday === "true") {
    query.availabilityStatus = "available";
  }

  if (lat && lng && radius) {
    query.geometry = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)],
        },
        $maxDistance: Number(radius) * 1000,
      },
    };
  }

  if (listingType && listingType !== "All") {
    if (listingType === "rent") {
      query.listingType = { $in: ["rent", "both"] };
    } else if (listingType === "sale") {
      query.listingType = { $in: ["sale", "both"] };
    } else if (listingType === "both") {
      query.listingType = "both";
    }
  }

  const parsedLimit = Number.parseInt(limit, 10);
  const itemsQuery = Item.find(query).populate("owner", itemOwnerProjection);

  // Apply sorting options
  if (sortBy === "newest") {
    itemsQuery.sort({ createdAt: -1 });
  } else if (sortBy === "priceLow") {
    itemsQuery.sort({ price: 1 });
  } else if (sortBy === "priceHigh") {
    itemsQuery.sort({ price: -1 });
  } else {
    itemsQuery.sort({ createdAt: -1 });
  }

  if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
    itemsQuery.limit(parsedLimit);
  }

  let items = await itemsQuery;

  // Filter by price range in-memory if needed or directly
  if (priceMin || priceMax) {
    const min = priceMin ? Number(priceMin) : 0;
    const max = priceMax ? Number(priceMax) : Number.MAX_VALUE;
    items = items.filter((item) => {
      const p = item.rentalPrice ?? item.salePrice ?? item.price;
      return p >= min && p <= max;
    });
  }

  // Filter by Verified Seller
  if (verifiedSeller === "true") {
    items = items.filter((item) => item.owner?.verifiedCollegeId === true);
  }

  // Proximity Sorting: Same College -> Same City -> Same State -> Nationwide
  if (req.user) {
    const userCollege = String(req.user.collegeName || "").toLowerCase().trim();
    const userCity = String(req.user.city || "").toLowerCase().trim();
    const userState = String(req.user.state || "").toLowerCase().trim();

    items = items.sort((a, b) => {
      const getScore = (item) => {
        const itemCollege = String(item.collegeName || "").toLowerCase().trim();
        const itemCity = String(item.city || "").toLowerCase().trim();
        const itemState = String(item.state || "").toLowerCase().trim();

        if (userCollege && itemCollege === userCollege) return 0;
        if (userCity && itemCity === userCity) return 1;
        if (userState && itemState === userState) return 2;
        return 3;
      };
      return getScore(a) - getScore(b);
    });
  }

  // Apply sorting by popularity if requested
  if (sortBy === "popularity") {
    items = items.sort((a, b) => (b.owner?.ratingsAverage || 0) - (a.owner?.ratingsAverage || 0));
  }

  res.json(items);
});


export const getItemById = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id).populate("owner", itemOwnerProjection);

  if (!item) {
    res.status(404);
    throw new Error("Item not found");
  }

  res.json(item);
});

export const getMyItems = asyncHandler(async (req, res) => {
  const items = await Item.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.json(items);
});

export const toggleWishlist = asyncHandler(async (req, res) => {
  const user = await req.user.constructor.findById(req.user._id);
  const itemId = req.params.id;

  const itemIndex = user.wishlist.indexOf(itemId);
  if (itemIndex > -1) {
    user.wishlist.splice(itemIndex, 1);
  } else {
    user.wishlist.push(itemId);
  }

  await user.save();
  res.json({ wishlist: user.wishlist });
});

export const updateItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error("Item not found");
  }

  if (item.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Only the owner or an admin can update this listing");
  }

  const parseArrayField = (field) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === "string") {
      if (field.startsWith("[") && field.endsWith("]")) {
        try {
          return JSON.parse(field);
        } catch (e) {}
      }
      return field.split(",").map(item => item.trim()).filter(Boolean);
    }
    return [];
  };

  const fields = [
    "title", "description", "category", "price", "rentalPrice", "salePrice",
    "condition", "brand", "location", "campus", "availabilityStatus",
    "isApproved", "isFeatured"
  ];
  
  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      item[field] = req.body[field];
    }
  });

  if (req.body.details !== undefined) {
    item.details = parseArrayField(req.body.details).slice(0, 6);
  }
  if (req.body.tags !== undefined) {
    item.tags = parseArrayField(req.body.tags).slice(0, 10);
  }

  if (req.body.price === undefined && (req.body.rentalPrice !== undefined || req.body.salePrice !== undefined)) {
    item.price = req.body.rentalPrice ?? req.body.salePrice;
  }

  // Handle new image uploads if files are attached
  if (req.files && req.files.length > 0) {
    // Delete existing old images from Cloudinary
    if (item.images && item.images.length > 0) {
      for (const img of item.images) {
        if (img.publicId) {
          try {
            await cloudinary.uploader.destroy(img.publicId);
          } catch (err) {
            console.error(`Failed to delete image ${img.publicId} from Cloudinary:`, err);
          }
        }
      }
    }
    
    // Save new images
    item.images = req.files.map((file) => ({
      url: file.path,
      publicId: file.filename,
    }));
  }

  await item.save();
  res.json(item);
});

export const deleteItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error("Item not found");
  }

  if (item.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied");
  }

  // Delete all related images from Cloudinary automatically
  if (item.images && item.images.length > 0) {
    for (const img of item.images) {
      if (img.publicId) {
        try {
          await cloudinary.uploader.destroy(img.publicId);
        } catch (err) {
          console.error(`Failed to delete image ${img.publicId} from Cloudinary:`, err);
        }
      }
    }
  }

  await item.deleteOne();
  res.json({ success: true, message: "Item deleted successfully" });
});
