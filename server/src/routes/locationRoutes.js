import express from "express";
import {
  reverseGeocode,
  getNearbyItems,
  getNearbyColleges,
  saveUserLocation,
  saveItemLocation
} from "../controllers/locationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply auth middleware to protect geocoding and updates
router.use(protect);

router.post("/reverse-geocode", reverseGeocode);
router.get("/nearby-items", getNearbyItems);
router.get("/nearby-colleges", getNearbyColleges);
router.post("/save-user-location", saveUserLocation);
router.post("/save-item-location", saveItemLocation);

export default router;
