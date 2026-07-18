import express from "express";

import { createItem, getItemById, getItems, getMyItems, toggleWishlist, updateItem, deleteItem } from "../controllers/itemController.js";
import { protect, optionalProtect } from "../middleware/authMiddleware.js";
import { uploadPhotos } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/", optionalProtect, getItems);
router.get("/mine", protect, getMyItems);
router.get("/:id", getItemById);
router.post("/:id/wishlist", protect, toggleWishlist);
router.patch("/:id", protect, uploadPhotos, updateItem);
router.delete("/:id", protect, deleteItem);
router.post("/", protect, uploadPhotos, createItem);

export default router;

