import express from "express";
import { getSuggestions, logSearchQuery } from "../controllers/searchController.js";

const router = express.Router();

router.get("/suggestions", getSuggestions);
router.post("/log", logSearchQuery);

export default router;
