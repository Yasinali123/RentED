import express from "express";

import { createItem, getItemById, getItems, getMyItems, toggleWishlist, updateItem, deleteItem } from "../controllers/itemController.js";
import { protect, optionalProtect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", optionalProtect, getItems);
router.get("/mine", protect, getMyItems);
router.get("/:id", getItemById);
router.post("/:id/wishlist", protect, toggleWishlist);
router.patch("/:id", protect, updateItem);
router.delete("/:id", protect, deleteItem);
router.post("/", protect, createItem);

export default router;

