import express from "express";
import { getColleges, createCollege, deleteCollege } from "../controllers/collegeController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET is public for signup registration datalist suggestions
router.get("/", getColleges);

// POST and DELETE require admin authentication
router.post("/", protect, createCollege);
router.delete("/:id", protect, deleteCollege);

export default router;
