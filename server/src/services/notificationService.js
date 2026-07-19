import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import User from "../models/User.js";

let messaging = null;

try {
  if (getApps().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      const app = initializeApp({
        credential: cert(serviceAccount)
      });
      messaging = getMessaging(app);
      console.log("Firebase Admin SDK successfully initialized via credentials.");
    } else {
      console.log("FIREBASE_SERVICE_ACCOUNT is not set. FCM will execute in Mock Log Mode.");
    }
  } else {
    messaging = getMessaging();
  }
} catch (err) {
  console.error("Failed to initialize Firebase Admin SDK:", err.message);
}

/**
 * Send push notification to a user's registered FCM tokens
 * @param {string} userId - User ID
 * @param {string} title - Alert Title
 * @param {string} message - Alert Message
 * @param {object} [data] - Additional metadata payload
 */
export const sendPushNotification = async (userId, title, message, data = {}) => {
  try {
    const user = await User.findById(userId).select("fcmTokens");
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      console.log(`[Push Notification] User ${userId} has no registered FCM tokens.`);
      return;
    }

    const tokens = user.fcmTokens;

    // Convert all fields in data to strings as required by FCM
    const stringifiedData = {};
    Object.entries(data).forEach(([key, val]) => {
      stringifiedData[key] = String(val);
    });
    stringifiedData.title = title;
    stringifiedData.message = message;

    if (!messaging) {
      console.log(`\n=== FCM PUSH NOTIFICATION (MOCK MODE) ===`);
      console.log(`To User: ${userId}`);
      console.log(`Tokens Count: ${tokens.length}`);
      console.log(`Title: ${title}`);
      console.log(`Body: ${message}`);
      console.log(`Data:`, stringifiedData);
      console.log(`=========================================\n`);
      return;
    }

    console.log(`[FCM Service] Dispatching push notification to user ${userId} (${tokens.length} devices)...`);

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title,
        body: message,
      },
      data: stringifiedData,
    });

    console.log(`[FCM Service] Results: Success=${response.successCount}, Failure=${response.failureCount}`);

    // If some tokens failed, clean up the invalid/expired ones
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (
            errCode === "messaging/invalid-argument" ||
            errCode === "messaging/registration-token-not-registered"
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await User.findByIdAndUpdate(userId, {
          $pull: { fcmTokens: { $in: invalidTokens } }
        });
        console.log(`[FCM Service] Stale user tokens removed:`, invalidTokens);
      }
    }
  } catch (err) {
    console.error("Failed to send push notification:", err.message);
  }
};
