import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace("/api", "") 
  : "http://localhost:5000";

let socket = null;

export const getSocket = () => {
  if (socket) return socket;

  const token = localStorage.getItem("rented_token");
  if (!token) return null;

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
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
