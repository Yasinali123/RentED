import express from "express";
import { getNotifications, markRead, deleteNotification } from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getNotifications);
router.post("/read-all", markRead);
router.delete("/:id", deleteNotification);

export default router;
