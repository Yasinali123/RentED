import Notification from "../models/Notification.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { notifyUser } from "../utils/notificationHelper.js";

// @desc    Get current user notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(notifications);
});

// @desc    Mark notification(s) as read
// @route   POST /api/notifications/read
// @access  Private
export const markRead = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (id) {
    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      res.status(404);
      throw new Error("Notification not found");
    }
    return res.json({ success: true, message: "Notification marked as read" });
  }

  await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { isRead: true }
  );
  res.json({ success: true, message: "All notifications marked as read" });
});

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  await notification.deleteOne();
  res.json({ success: true, message: "Notification deleted" });
});

// @desc    Save FCM push notification token
// @route   POST /api/notifications/fcm-token
// @access  Private
export const saveFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400);
    throw new Error("Token is required");
  }

  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { fcmTokens: token },
  });

  res.json({ success: true, message: "FCM registration token saved successfully" });
});

// @desc    Make global admin announcement
// @route   POST /api/notifications/announce
// @access  Private (Admin only)
export const makeAnnouncement = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied: Admins only");
  }

  const { title, message } = req.body;
  if (!title || !message) {
    res.status(400);
    throw new Error("Title and message are required");
  }

  const users = await User.find({ isSuspended: false });
  for (const u of users) {
    await notifyUser(u._id, title, message, "general");
  }

  res.json({ success: true, message: `Announcement successfully broadcast to ${users.length} users.` });
});
