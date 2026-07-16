import express from "express";

import { getNearbySuggestions } from "../controllers/suggestionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/nearby", protect, getNearbySuggestions);

export default router;

