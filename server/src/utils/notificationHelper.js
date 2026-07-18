import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendPushNotification } from "../services/notificationService.js";

export const notifyUser = async (userId, title, message, type = "general") => {
  try {
    await Notification.create({
      user: userId,
      title,
      message,
      type,
    });
    
    // Dispatch FCM push alert
    await sendPushNotification(userId, title, message, { type });
  } catch (error) {
    console.error("Failed to create notification:", error.message);
  }
};

export const notifyAdmins = async (title, message, type = "general") => {
  try {
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await notifyUser(admin._id, title, message, type);
    }
  } catch (error) {
    console.error("Failed to notify admins:", error.message);
  }
};
