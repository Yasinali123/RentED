import express from "express";

import {
  createOrGetConversation,
  getConversationMessages,
  getConversations,
  sendMessage,
  markConversationAsRead,
  deleteMessage,
  uploadAttachment
} from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadChatAttachment } from "../middleware/upload.js";

const router = express.Router();

router.use(protect);

router.get("/conversations", getConversations);
router.post("/conversations", createOrGetConversation);
router.post("/create", createOrGetConversation); // Alias/alternative endpoint
router.get("/conversations/:conversationId/messages", getConversationMessages);
router.post("/conversations/:conversationId/messages", sendMessage);
router.patch("/conversations/:conversationId/read", markConversationAsRead);
router.delete("/message/:id", deleteMessage);
router.post("/upload", uploadChatAttachment, uploadAttachment);

export default router;
