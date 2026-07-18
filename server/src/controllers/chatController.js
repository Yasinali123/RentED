import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendPushNotification } from "../services/notificationService.js";

const conversationPopulate = [
  { path: "item", select: "title image category location collegeName campus" },
  { path: "participants", select: "name email avatarUrl campus location role collegeName" },
  { path: "rentalRequest", select: "status requestType totalPrice disputed" }
];

// Start or get an existing conversation (used as a fallback or REST alternative)
export const createOrGetConversation = asyncHandler(async (req, res) => {
  const { participantId, itemId, rentalRequestId } = req.body;

  if (!itemId) {
    res.status(400);
    throw new Error("itemId is required");
  }

  // If a rentalRequestId is specified, look up by that to isolate the context
  let query = { item: itemId };
  if (rentalRequestId) {
    query.rentalRequest = rentalRequestId;
  } else {
    if (!participantId) {
      res.status(400);
      throw new Error("participantId is required if no rentalRequestId is provided");
    }
    query.participants = { $all: [req.user._id, participantId] };
  }

  let conversation = await Conversation.findOne(query).populate(conversationPopulate);

  if (!conversation) {
    const participants = rentalRequestId 
      ? [req.user._id] // we will add other participants from the rental request in the calling function/routes
      : [req.user._id, participantId];

    conversation = await Conversation.create({
      item: itemId,
      rentalRequest: rentalRequestId || null,
      participants,
      lastMessage: "Conversation started",
      status: "active",
      unreadCount: {}
    });
    conversation = await Conversation.findById(conversation._id).populate(conversationPopulate);
  }

  res.status(201).json(conversation);
});

// Retrieve all active conversations for a user (Admins get all conversations)
export const getConversations = asyncHandler(async (req, res) => {
  let query = {};
  if (req.user.role !== "admin") {
    query.participants = req.user._id;
  }
  
  const conversations = await Conversation.find(query)
    .populate(conversationPopulate)
    .sort({ lastMessageAt: -1 });

  res.json(conversations);
});

// Fetch messages for a conversation (Paginated, latest 20 first, lazy-load older on scroll)
export const getConversationMessages = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  const isAuthorized =
    req.user.role === "admin" ||
    conversation.participants.some(
      (participant) => participant.toString() === req.user._id.toString()
    );

  if (!isAuthorized) {
    res.status(403);
    throw new Error("You are not authorized to view messages in this conversation");
  }

  const limit = parseInt(req.query.limit, 10) || 20;
  const before = req.query.before; // ISO date string cursor

  const query = { conversation: conversation._id };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const messages = await Message.find(query)
    .populate("sender", "name role avatarUrl collegeName campus")
    .sort({ createdAt: -1 }) // Sort latest first for fetching
    .limit(limit);

  // Reverse back to chronological order for frontend display
  res.json(messages.reverse());
});

// Send message via REST API (Alternative/Fallback to Socket.io)
export const sendMessage = asyncHandler(async (req, res) => {
  const { text, attachments } = req.body;

  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  const isAuthorized =
    req.user.role === "admin" ||
    conversation.participants.some(
      (participant) => participant.toString() === req.user._id.toString()
    );

  if (!isAuthorized) {
    res.status(403);
    throw new Error("You are not a participant in this conversation");
  }

  const sanitizedText = String(text || "").replace(/<[^>]*>/g, "").trim();

  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    text: sanitizedText,
    message: sanitizedText,
    attachments: {
      image: attachments?.image || "",
      document: attachments?.document || "",
    },
    seenStatus: "sent",
  });

  conversation.lastMessage = sanitizedText || (attachments?.image ? "Sent an image" : "Sent a document");
  conversation.lastMessageAt = new Date();

  // Increment unread count for other participants
  conversation.participants.forEach((p) => {
    const pId = p.toString();
    if (pId !== req.user._id.toString()) {
      const currentCount = conversation.unreadCount.get(pId) || 0;
      conversation.unreadCount.set(pId, currentCount + 1);
      
      // Dispatch push notification
      sendPushNotification(
        p,
        `New Message from ${req.user.name}`,
        sanitizedText || "Sent an attachment",
        { type: "chat", conversationId: conversation._id.toString() }
      );
    }
  });

  await conversation.save();

  const populatedMessage = await Message.findById(message._id).populate("sender", "name role avatarUrl collegeName campus");
  res.status(201).json(populatedMessage);
});

// Mark conversation as read (sets unread count for user to 0, updates message status)
export const markConversationAsRead = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  const isAuthorized =
    req.user.role === "admin" ||
    conversation.participants.some(
      (participant) => participant.toString() === req.user._id.toString()
    );

  if (!isAuthorized) {
    res.status(403);
    throw new Error("Unauthorized room access");
  }

  if (conversation.unreadCount) {
    conversation.unreadCount.set(req.user._id.toString(), 0);
    await conversation.save();
  }

  await Message.updateMany(
    { conversation: conversation._id, sender: { $ne: req.user._id }, seenStatus: { $ne: "seen" } },
    { $set: { seenStatus: "seen" }, $addToSet: { seenBy: { user: req.user._id, seenAt: new Date() } } }
  );

  res.json({ success: true, conversationId: conversation._id });
});

// Delete message (sender only)
export const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  if (message.sender.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You can only delete your own messages");
  }

  await message.deleteOne();
  res.json({ success: true, messageId: message._id });
});

// Upload attachment (images/PDFs) to Cloudinary
export const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No attachment file supplied");
  }

  res.status(201).json({
    url: req.file.path,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
  });
});
