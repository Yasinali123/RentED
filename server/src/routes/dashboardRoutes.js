import express from "express";

import { getDashboard, getSystemSettings, updateSystemSettings } from "../controllers/dashboardController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getDashboard);
router.get("/settings", protect, getSystemSettings);
router.post("/settings", protect, updateSystemSettings);

export default router;

