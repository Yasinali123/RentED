import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import asyncHandler from "../utils/asyncHandler.js";

const conversationPopulate = [
  { path: "item", select: "title image category location" },
  { path: "participants", select: "name email avatarUrl campus location" },
];

export const createOrGetConversation = asyncHandler(async (req, res) => {
  const { participantId, itemId } = req.body;

  if (!participantId || !itemId) {
    res.status(400);
    throw new Error("participantId and itemId are required");
  }

  if (participantId.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error("You cannot start a conversation with yourself");
  }

  let conversation = await Conversation.findOne({
    item: itemId,
    participants: { $all: [req.user._id, participantId] },
  }).populate(conversationPopulate);

  if (!conversation) {
    conversation = await Conversation.create({
      item: itemId,
      participants: [req.user._id, participantId],
      lastMessage: "Conversation started",
    });
    conversation = await Conversation.findById(conversation._id).populate(conversationPopulate);
  }

  res.status(201).json(conversation);
});

export const getConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    participants: req.user._id,
  })
    .populate(conversationPopulate)
    .sort({ lastMessageAt: -1 });

  res.json(conversations);
});

export const getConversationMessages = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  const isParticipant = conversation.participants.some(
    (participant) => participant.toString() === req.user._id.toString(),
  );
  if (!isParticipant) {
    res.status(403);
    throw new Error("You are not a participant in this conversation");
  }

  const messages = await Message.find({ conversation: conversation._id })
    .populate("sender", "name avatarUrl")
    .sort({ createdAt: 1 });

  res.json(messages);
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) {
    res.status(400);
    throw new Error("Message text is required");
  }

  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  const isParticipant = conversation.participants.some(
    (participant) => participant.toString() === req.user._id.toString(),
  );
  if (!isParticipant) {
    res.status(403);
    throw new Error("You are not a participant in this conversation");
  }

  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    text,
  });

  conversation.lastMessage = text;
  conversation.lastMessageAt = new Date();
  await conversation.save();

  const populatedMessage = await Message.findById(message._id).populate("sender", "name avatarUrl");
  res.status(201).json(populatedMessage);
});
