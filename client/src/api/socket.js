import { io } from "socket.io-client";

const DEFAULT_SERVER_URL = "https://rented-backend.onrender.com";

const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/api\/?$/, "");
  }

  if (typeof window !== "undefined") {
    const isNative =
      window.location.protocol === "capacitor:" ||
      window.location.protocol === "file:" ||
      window.location.hostname === "localhost";
    if (!isNative && window.location.origin) {
      return window.location.origin;
    }
  }

  return DEFAULT_SERVER_URL;
};

const SOCKET_URL = getSocketUrl();

let socket = null;

export const getSocket = () => {
  if (socket) return socket;

  const token = localStorage.getItem("rented_token");
  if (!token) return null;

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ["websocket", "polling"],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (s && !s.connected) {
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
