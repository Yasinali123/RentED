import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import { chatApi, getErrorMessage } from "../api/client";
import { connectSocket, disconnectSocket } from "../api/socket";
import ChatWindow from "../components/chat/ChatWindow";
import ConversationList from "../components/chat/ConversationList";
import { useAuth } from "../context/AuthContext";

function ChatPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [onlineStatusMap, setOnlineStatusMap] = useState({}); // userId -> "online" | Date (offline timestamp)
  const [typingUsers, setTypingUsers] = useState({}); // conversationId -> { name, role, isTyping }
  
  const selectedConversationRef = useRef(null);
  const socketRef = useRef(null);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-100.wav");
      audio.volume = 0.4;
      audio.play();
    } catch (e) {
      console.warn("Could not play notification sound:", e);
    }
  };

  const loadConversations = () => {
    chatApi
      .listConversations()
      .then((response) => {
        setConversations(response);
        const requestedId = searchParams.get("conversation");
        const initialConversation =
          response.find((conversation) => conversation._id === requestedId) || response[0] || null;
        
        handleSelectConversation(initialConversation);
      })
      .catch((error) => setFeedback(getErrorMessage(error)));
  };

  const handleSelectConversation = (conversation) => {
    if (selectedConversationRef.current && socketRef.current) {
      socketRef.current.emit("leaveConversation", {
        conversationId: selectedConversationRef.current._id,
      });
    }

    selectedConversationRef.current = conversation;
    setSelectedConversation(conversation);
    setMessages([]);
    setHasMore(true);

    if (conversation) {
      // Mark as read in API
      chatApi.markAsRead(conversation._id).catch(() => {});

      // Clear unreadCount locally
      setConversations((prev) =>
        prev.map((c) => {
          if (c._id === conversation._id) {
            const updatedUnread = { ...c.unreadCount };
            if (user) updatedUnread[user._id] = 0;
            return { ...c, unreadCount: updatedUnread };
          }
          return c;
        })
      );

      // Join socket room
      if (socketRef.current) {
        socketRef.current.emit("joinConversation", { conversationId: conversation._id });
      }

      // Fetch first page of messages
      fetchMessages(conversation._id);
    }
  };

  const fetchMessages = async (conversationId, before = null) => {
    if (loadingMessages) return;
    setLoadingMessages(true);
    try {
      const limit = 20;
      const fetched = await chatApi.listMessages(conversationId, { before, limit });
      
      if (fetched.length < limit) {
        setHasMore(false);
      }

      setMessages((prev) => {
        if (before) {
          // Prepend older messages
          return [...fetched, ...prev];
        } else {
          return fetched;
        }
      });
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setLoadingMessages(false);
    }
  };

  // Fetch older messages on scroll top
  const handleScrollTop = () => {
    if (messages.length > 0 && hasMore && selectedConversation) {
      const oldestMessageTimestamp = messages[0].createdAt;
      fetchMessages(selectedConversation._id, oldestMessageTimestamp);
    }
  };

  // Connect socket on mount
  useEffect(() => {
    const socket = connectSocket();
    if (socket) {
      socketRef.current = socket;

      socket.on("connect", () => {
        // Rejoin room if reconnected
        if (selectedConversationRef.current) {
          socket.emit("joinConversation", { conversationId: selectedConversationRef.current._id });
        }
      });

      // Handle message delivery
      socket.on("receiveMessage", (message) => {
        const activeConv = selectedConversationRef.current;
        
        if (activeConv && message.conversation === activeConv._id) {
          // Message is for current open chat
          setMessages((prev) => [...prev, message]);
          socket.emit("messageSeen", { conversationId: activeConv._id });
          
          // Move conversation to top in list and update last message
          setConversations((prev) => {
            const updated = prev.map((c) =>
              c._id === activeConv._id
                ? { ...c, lastMessage: message.text || "Attachment received", lastMessageAt: message.createdAt }
                : c
            );
            return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
          });
        } else {
          // Message is for another chat -> play sound and increment badge
          playNotificationSound();
          setConversations((prev) => {
            const updated = prev.map((c) => {
              if (c._id === message.conversation) {
                const unreads = { ...c.unreadCount };
                const uId = user?._id?.toString();
                if (uId) {
                  unreads[uId] = (unreads[uId] || 0) + 1;
                }
                return {
                  ...c,
                  lastMessage: message.text || "Attachment received",
                  lastMessageAt: message.createdAt,
                  unreadCount: unreads,
                };
              }
              return c;
            });
            return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
          });
        }
      });

      // Handle Message Seen indicators
      socket.on("messageSeen", ({ conversationId, userId: viewerId }) => {
        const activeConv = selectedConversationRef.current;
        if (activeConv && conversationId === activeConv._id) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.sender._id !== viewerId
                ? { ...msg, seenStatus: "seen" }
                : msg
            )
          );
        }
      });

      // Handle User Online broadcasts
      socket.on("userOnline", ({ userId }) => {
        setOnlineStatusMap((prev) => ({ ...prev, [userId]: "online" }));
      });

      socket.on("userOffline", ({ userId, lastSeen }) => {
        setOnlineStatusMap((prev) => ({ ...prev, [userId]: lastSeen }));
      });

      // Handle Typing indicator updates
      socket.on("typing", ({ conversationId, userId: typingId, name, role, isTyping }) => {
        if (typingId === user?._id?.toString()) return;
        setTypingUsers((prev) => ({
          ...prev,
          [conversationId]: isTyping ? { name, role } : null,
        }));
      });
    }

    loadConversations();

    return () => {
      if (selectedConversationRef.current && socketRef.current) {
        socketRef.current.emit("leaveConversation", {
          conversationId: selectedConversationRef.current._id,
        });
      }
      disconnectSocket();
    };
  }, []);

  const handleSend = async (text, attachment = null) => {
    if (!selectedConversation) return;

    try {
      if (socketRef.current && socketRef.current.connected) {
        // Send via Socket.io for immediate delivery
        socketRef.current.emit("sendMessage", {
          conversationId: selectedConversation._id,
          text,
          attachments: attachment ? {
            image: attachment.mimetype?.startsWith("image/") ? attachment.url : "",
            document: attachment.mimetype === "application/pdf" ? attachment.url : "",
          } : null,
        });
      } else {
        // Fallback to REST API if socket is disconnected
        const message = await chatApi.sendMessage(selectedConversation._id, text, attachment ? {
          image: attachment.mimetype?.startsWith("image/") ? attachment.url : "",
          document: attachment.mimetype === "application/pdf" ? attachment.url : "",
        } : null);
        setMessages((current) => [...current, message]);
        
        setConversations((current) =>
          current.map((conversation) =>
            conversation._id === selectedConversation._id
              ? { ...conversation, lastMessage: text || "Attachment sent", lastMessageAt: new Date().toISOString() }
              : conversation
          )
        );
      }
    } catch (error) {
      setFeedback(getErrorMessage(error));
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await chatApi.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  const activeTypingUser = selectedConversation ? typingUsers[selectedConversation._id] : null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-ink/45">Real-time Deal Chat</p>
        <h1 className="mt-2 text-4xl font-bold">Coordinate orders, logistics and payouts instantly</h1>
        {feedback ? <p className="mt-2 text-sm text-red-500 font-semibold">{feedback}</p> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversation?._id}
          onSelect={handleSelectConversation}
          currentUserId={user?._id}
          onlineStatusMap={onlineStatusMap}
        />
        <ChatWindow
          conversation={selectedConversation}
          messages={messages}
          currentUserId={user?._id}
          onSend={handleSend}
          onDeleteMessage={handleDeleteMessage}
          onScrollTop={handleScrollTop}
          hasMore={hasMore}
          loadingMessages={loadingMessages}
          typingUser={activeTypingUser}
          onlineStatus={selectedConversation && user
            ? onlineStatusMap[selectedConversation.participants.find(p => p._id !== user._id)?._id]
            : null
          }
        />
      </div>
    </div>
  );
}

export default ChatPage;
