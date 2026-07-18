importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyAlrntTn-eas87dScAv__ZDh7jqETCj8-0",
  authDomain: "rented-ff27d.firebaseapp.com",
  projectId: "rented-ff27d",
  storageBucket: "rented-ff27d.firebasestorage.app",
  messagingSenderId: "470490421661",
  appId: "1:470490421661:web:24f611974f6cf9e7f57774"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || "RentEd Alert";
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.message || "You have a new update",
    icon: "/logo-icon.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
