import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { notificationApi } from "./api/client";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

const isFirebaseConfigured = Boolean(firebaseConfig.projectId && firebaseConfig.apiKey);

let app = null;
let messaging = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      messaging = getMessaging(app);
    }
  } catch (err) {
    console.warn("Firebase initialization warning:", err);
  }
}

export { messaging };

export const requestForToken = async () => {
  if (!messaging) {
    console.log("Firebase Messaging is not configured (missing VITE_FIREBASE_PROJECT_ID).");
    return null;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const currentToken = await getToken(messaging);
      if (currentToken) {
        console.log("FCM Registration Token acquired:", currentToken);
        await notificationApi.saveFcmToken({ token: currentToken });
        return currentToken;
      }
    }
  } catch (err) {
    console.warn("FCM Token request failed:", err);
  }
  return null;
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
