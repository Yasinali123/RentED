import express from "express";
import {
  getNotifications,
  markRead,
  deleteNotification,
  saveFcmToken,
  makeAnnouncement,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getNotifications);
router.post("/read-all", markRead);
router.post("/read", markRead);
router.post("/fcm-token", saveFcmToken);
router.post("/announce", makeAnnouncement);
router.delete("/:id", deleteNotification);

export default router;
