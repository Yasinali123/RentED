import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { sendPushNotification } from "../services/notificationService.js";

// Store active online users: userId -> { socketId, role, lastSeen }
const onlineUsers = new Map();

// Spam rate limit storage: userId -> lastMessageTimestamp
const rateLimitMap = new Map();

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        const isLocalhost = origin && (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"));
        const allowed = [
          "http://localhost:5173",
          "http://127.0.0.1:5173",
          process.env.CLIENT_URL ? process.env.CLIENT_URL.trim().replace(/\/$/, "") : null,
          process.env.RENDER_EXTERNAL_URL ? process.env.RENDER_EXTERNAL_URL.trim().replace(/\/$/, "") : null,
        ].filter(Boolean);
        if (!origin || isLocalhost || allowed.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  // Socket Connection Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error("Authentication Error: Token missing"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-passwordHash");
      if (!user) {
        return next(new Error("Authentication Error: User not found"));
      }

      if (user.isSuspended) {
        return next(new Error("Authentication Error: Account suspended"));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error("Authentication Error: Invalid or expired token"));
    }
  });

  // Socket Connection handler
  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    const role = socket.user.role;

    // Track user online status
    onlineUsers.set(userId, {
      socketId: socket.id,
      role: role,
      lastSeen: new Date(),
    });

    // Broadcast that user is online
    io.emit("userOnline", { userId, role, status: "online" });

    // Join self room for private targeted notifications/events
    socket.join(`user_${userId}`);

    // Join Conversation Room (Buyer ↔ Seller ↔ POC ↔ Admin)
    socket.on("joinConversation", async ({ conversationId }) => {
      try {
        if (!conversationId) return;

        // Security check: Verify room access authorization
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit("error", { message: "Conversation not found" });
          return;
        }

        const isAuthorized =
          role === "admin" ||
          conversation.participants.some((p) => p.toString() === userId);

        if (!isAuthorized) {
          socket.emit("error", { message: "Security Error: Unauthorized conversation room access rejected." });
          return;
        }

        const roomName = `conversation_${conversationId}`;
        socket.join(roomName);

        // Mark messages in this conversation as seen by this user
        await Message.updateMany(
          { conversation: conversationId, sender: { $ne: socket.user._id }, seenStatus: { $ne: "seen" } },
          { $set: { seenStatus: "seen" }, $addToSet: { seenBy: { user: socket.user._id, seenAt: new Date() } } }
        );

        // Reset unread count for this user
        if (conversation.unreadCount) {
          conversation.unreadCount.set(userId, 0);
          await conversation.save();
        }

        // Notify room that messages are read
        socket.to(roomName).emit("messageSeen", { conversationId, userId });
      } catch (err) {
        console.error("Socket join error:", err.message);
      }
    });

    // Leave Conversation Room
    socket.on("leaveConversation", ({ conversationId }) => {
      if (!conversationId) return;
      socket.leave(`conversation_${conversationId}`);
    });

    // Typing Indicators
    socket.on("typing", ({ conversationId, isTyping }) => {
      if (!conversationId) return;
      socket.to(`conversation_${conversationId}`).emit("typing", {
        conversationId,
        userId,
        name: socket.user.name,
        role: socket.user.role,
        isTyping,
      });
    });

    socket.on("stopTyping", ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation_${conversationId}`).emit("typing", {
        conversationId,
        userId,
        name: socket.user.name,
        role: socket.user.role,
        isTyping: false,
      });
    });

    // Handle Send Message
    socket.on("sendMessage", async ({ conversationId, text, attachments }) => {
      try {
        if (!conversationId) return;

        // Rate-limit spam protection
        const lastMsgTime = rateLimitMap.get(userId) || 0;
        const now = Date.now();
        if (now - lastMsgTime < 500) { // 500ms spam threshold
          socket.emit("error", { message: "Spam warning: You are sending messages too quickly." });
          return;
        }
        rateLimitMap.set(userId, now);

        // Fetch conversation and check access
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit("error", { message: "Conversation not found" });
          return;
        }

        const isAuthorized =
          role === "admin" ||
          conversation.participants.some((p) => p.toString() === userId);

        if (!isAuthorized) {
          socket.emit("error", { message: "Security Error: Unauthorized to send messages in this room." });
          return;
        }

        // Sanitize and validate length
        const sanitizedText = String(text || "").replace(/<[^>]*>/g, "").trim(); // Simple HTML strip
        if (sanitizedText.length > 2000) {
          socket.emit("error", { message: "Message exceeds maximum allowed length of 2000 characters." });
          return;
        }

        if (!sanitizedText && (!attachments || (!attachments.image && !attachments.document))) {
          socket.emit("error", { message: "Cannot send an empty message." });
          return;
        }

        // Save Message to DB (Mirroring text and message fields)
        const messageObj = await Message.create({
          conversation: conversationId,
          sender: socket.user._id,
          text: sanitizedText,
          message: sanitizedText,
          attachments: {
            image: attachments?.image || "",
            document: attachments?.document || "",
          },
          seenStatus: "sent",
        });

        // Determine which participants are currently online and active in the room
        const roomName = `conversation_${conversationId}`;
        const activeSocketsInRoom = io.sockets.adapter.rooms.get(roomName) || new Set();
        const activeUserIdsInRoom = new Set();

        for (const socketId of activeSocketsInRoom) {
          const clientSocket = io.sockets.sockets.get(socketId);
          if (clientSocket && clientSocket.user) {
            activeUserIdsInRoom.add(clientSocket.user._id.toString());
          }
        }

        // Update seenStatus for messages if other participants are already in the room
        let finalStatus = "sent";
        const otherParticipants = conversation.participants.filter(
          (p) => p.toString() !== userId
        );

        const onlineRecipientExists = otherParticipants.some((p) =>
          onlineUsers.has(p.toString())
        );

        if (onlineRecipientExists) {
          finalStatus = "delivered";
        }

        const activeRecipientExists = otherParticipants.some((p) =>
          activeUserIdsInRoom.has(p.toString())
        );

        if (activeRecipientExists) {
          finalStatus = "seen";
          messageObj.seenStatus = "seen";
          for (const p of otherParticipants) {
            if (activeUserIdsInRoom.has(p.toString())) {
              messageObj.seenBy.push({ user: p, seenAt: new Date() });
            }
          }
          await messageObj.save();
        } else {
          messageObj.seenStatus = finalStatus;
          await messageObj.save();
        }

        // Update Conversation details in DB
        conversation.lastMessage = sanitizedText || (attachments?.image ? "Sent an image" : "Sent a document");
        conversation.lastMessageAt = new Date();

        // Increment unreadCount in DB for inactive users
        otherParticipants.forEach((p) => {
          const pId = p.toString();
          if (!activeUserIdsInRoom.has(pId)) {
            const currentUnread = conversation.unreadCount.get(pId) || 0;
            conversation.unreadCount.set(pId, currentUnread + 1);
          }
        });
        await conversation.save();

        const populatedMessage = await Message.findById(messageObj._id).populate("sender", "name role avatarUrl collegeName campus");

        // Broadcast message to the entire conversation room
        io.to(roomName).emit("receiveMessage", populatedMessage);

        // Also emit status notifications to individual user rooms to update badge counters
        otherParticipants.forEach((p) => {
          const pId = p.toString();
          if (!activeUserIdsInRoom.has(pId)) {
            io.to(`user_${pId}`).emit("unreadBadgeUpdate", {
              conversationId,
              unreadCount: conversation.unreadCount.get(pId) || 1,
              message: populatedMessage,
            });

            // Dispatch push notification
            sendPushNotification(
              p,
              `New Message from ${socket.user.name}`,
              sanitizedText || "Sent an attachment",
              { type: "chat", conversationId }
            );
          }
        });
      } catch (err) {
        console.error("Socket sendMessage error:", err.message);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Mark messages as seen
    socket.on("messageSeen", async ({ conversationId }) => {
      try {
        if (!conversationId) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        // Reset unread counter in DB
        conversation.unreadCount.set(userId, 0);
        await conversation.save();

        // Update messages seen status
        await Message.updateMany(
          { conversation: conversationId, sender: { $ne: socket.user._id }, seenStatus: { $ne: "seen" } },
          { $set: { seenStatus: "seen" }, $addToSet: { seenBy: { user: socket.user._id, seenAt: new Date() } } }
        );

        socket.to(`conversation_${conversationId}`).emit("messageSeen", { conversationId, userId });
      } catch (err) {
        console.error("Socket messageSeen error:", err.message);
      }
    });

    // User Disconnect handler
    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      rateLimitMap.delete(userId);
      
      // Broadcast that user is offline with their last seen timestamp
      io.emit("userOffline", {
        userId,
        role,
        status: "offline",
        lastSeen: new Date(),
      });
    });
  });

  return io;
};
