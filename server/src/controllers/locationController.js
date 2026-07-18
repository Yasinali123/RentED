import GeocodeCache from "../models/GeocodeCache.js";
import User from "../models/User.js";
import Item from "../models/Item.js";
import asyncHandler from "../utils/asyncHandler.js";

const itemOwnerProjection =
  "name email campus location ratingsAverage ratingsCount avatarUrl verifiedCollegeId country state city institutionType collegeName geometry";

// Round latitude and longitude to 5 decimal places for caching (~1.1 meter accuracy)
const roundCoordinate = (num) => Math.round(Number(num) * 100000) / 100000;

// POST /api/location/reverse-geocode
export const reverseGeocode = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    res.status(400);
    throw new Error("Latitude and Longitude are required");
  }

  const lat = roundCoordinate(latitude);
  const lon = roundCoordinate(longitude);

  // Check MongoDB GeocodeCache
  const cached = await GeocodeCache.findOne({ lat, lon });
  if (cached) {
    return res.json(cached.result);
  }

  try {
    // Query Nominatim OpenStreetMap API
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "RentED-Hyperlocal-App/1.0 (contact@rented.com)"
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim returned status ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.address) {
      res.status(404);
      throw new Error("Unable to reverse geocode these coordinates");
    }

    const address = data.address;
    
    // Parse location details
    const parsedLocation = {
      latitude: lat,
      longitude: lon,
      college: address.amenity || address.university || address.college || address.school || address.office || address.building || "",
      institution: address.university || address.college || address.school || address.amenity || "",
      city: address.city || address.town || address.village || address.suburb || "",
      district: address.district || address.county || address.state_district || "",
      state: address.state || "",
      country: address.country || "India",
      address: data.display_name || ""
    };

    // Save in Cache
    await GeocodeCache.create({
      lat,
      lon,
      result: parsedLocation
    });

    res.json(parsedLocation);
  } catch (err) {
    console.error("Nominatim Reverse Geocoding Error:", err.message);
    res.status(502);
    throw new Error("Failed to connect to Nominatim Geocoding service");
  }
});

// GET /api/location/nearby-items
export const getNearbyItems = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 5000, limit = 20, page = 1, category, q } = req.query;

  if (!lat || !lng) {
    res.status(400);
    throw new Error("Latitude (lat) and Longitude (lng) are required");
  }

  const limitNum = parseInt(limit, 10);
  const skipNum = (parseInt(page, 10) - 1) * limitNum;

  // Build filters dynamically
  const filterQuery = {
    isApproved: { $ne: false },
    availabilityStatus: "available"
  };

  if (category && category !== "All") {
    filterQuery.category = category;
  }

  if (q) {
    filterQuery.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } }
    ];
  }

  // Use MongoDB $geoNear aggregation
  const pipeline = [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [Number(lng), Number(lat)] },
        distanceField: "distance", // Distance in meters
        maxDistance: Number(radius),
        spherical: true,
        query: filterQuery
      }
    },
    { $skip: skipNum },
    { $limit: limitNum }
  ];

  const results = await Item.aggregate(pipeline);

  // Populate owner details manually after aggregation
  const populated = await Item.populate(results, {
    path: "owner",
    select: itemOwnerProjection
  });

  res.json(populated);
});

// GET /api/location/nearby-colleges
export const getNearbyColleges = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 25000 } = req.query;

  if (!lat || !lng) {
    res.status(400);
    throw new Error("Latitude (lat) and Longitude (lng) are required");
  }

  // Aggregate colleges based on nearby items listing coordinates
  const pipeline = [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [Number(lng), Number(lat)] },
        distanceField: "distance",
        maxDistance: Number(radius),
        spherical: true,
        query: { isApproved: { $ne: false } }
      }
    },
    {
      $group: {
        _id: "$collegeName",
        distance: { $min: "$distance" },
        city: { $first: "$city" },
        state: { $first: "$state" }
      }
    },
    { $sort: { distance: 1 } },
    { $limit: 10 }
  ];

  const results = await Item.aggregate(pipeline);
  res.json(results.map(r => ({
    name: r._id,
    distance: r.distance,
    city: r.city,
    state: r.state
  })).filter(r => r.name));
});

// POST /api/location/save-user-location
export const saveUserLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude, college, institution, city, district, state, country, address } = req.body;

  if (!latitude || !longitude) {
    res.status(400);
    throw new Error("Latitude and Longitude are required");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Update user model fields
  user.latitude = Number(latitude);
  user.longitude = Number(longitude);
  user.geometry = {
    type: "Point",
    coordinates: [Number(longitude), Number(latitude)]
  };
  
  if (college) user.college = college;
  if (institution) user.institution = institution;
  if (city) user.city = city;
  if (district) user.district = district;
  if (state) user.state = state;
  if (country) user.country = country;
  if (address) user.address = address;

  // Sync with existing profile address fields
  user.location = address || user.location;
  user.collegeName = college || user.collegeName;

  await user.save();

  res.json({
    success: true,
    message: "Location saved successfully",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      latitude: user.latitude,
      longitude: user.longitude,
      college: user.college,
      city: user.city,
      state: user.state,
      address: user.address,
      geometry: user.geometry
    }
  });
});

// POST /api/location/save-item-location
export const saveItemLocation = asyncHandler(async (req, res) => {
  const { itemId, latitude, longitude, pickupAddress, college, district, city, state, country } = req.body;

  if (!itemId || !latitude || !longitude) {
    res.status(400);
    throw new Error("ItemId, Latitude, and Longitude are required");
  }

  const item = await Item.findById(itemId);
  if (!item) {
    res.status(404);
    throw new Error("Item not found");
  }

  // Security Check: Only the owner of the listing can edit location settings
  if (item.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access Denied: You cannot modify this listing's location");
  }

  item.pickupLatitude = Number(latitude);
  item.pickupLongitude = Number(longitude);
  item.geometry = {
    type: "Point",
    coordinates: [Number(longitude), Number(latitude)]
  };

  if (pickupAddress) item.pickupAddress = pickupAddress;
  if (college) item.college = college;
  if (district) item.district = district;
  if (city) item.city = city;
  if (state) item.state = state;
  if (country) item.country = country;

  // Sync with existing listing text columns
  item.location = pickupAddress || item.location;
  item.collegeName = college || item.collegeName;

  await item.save();

  res.json({
    success: true,
    message: "Item location settings saved successfully",
    item
  });
});
