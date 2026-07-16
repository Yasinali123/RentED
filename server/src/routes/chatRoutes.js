import express from "express";

import {
  createOrGetConversation,
  getConversationMessages,
  getConversations,
  sendMessage,
} from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/conversations", getConversations);
router.post("/conversations", createOrGetConversation);
router.get("/conversations/:conversationId/messages", getConversationMessages);
router.post("/conversations/:conversationId/messages", sendMessage);

export default router;

