import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { notificationApi } from "./api/client";

const firebaseConfig = {
  apiKey: "AIzaSyAlrntTn-eas87dScAv__ZDh7jqETCj8-0",
  authDomain: "rented-ff27d.firebaseapp.com",
  projectId: "rented-ff27d",
  storageBucket: "rented-ff27d.firebasestorage.app",
  messagingSenderId: "470490421661",
  appId: "1:470490421661:web:24f611974f6cf9e7f57774",
  measurementId: "G-753CX83Z3E"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export const requestForToken = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      // Retrieve registration token
      const currentToken = await getToken(messaging);
      if (currentToken) {
        console.log("FCM Registration Token acquired:", currentToken);
        await notificationApi.saveFcmToken({ token: currentToken });
        return currentToken;
      } else {
        console.log("No registration token generated.");
      }
    } else {
      console.log("Permission not granted for notifications.");
    }
  } catch (err) {
    console.error("FCM Token request failed:", err);
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
