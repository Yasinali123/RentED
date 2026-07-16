import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { chatApi, getErrorMessage } from "../api/client";
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

  const loadConversations = () => {
    chatApi
      .listConversations()
      .then((response) => {
        setConversations(response);
        const requestedId = searchParams.get("conversation");
        const initialConversation =
          response.find((conversation) => conversation._id === requestedId) || response[0] || null;
        setSelectedConversation(initialConversation);
      })
      .catch((error) => setFeedback(getErrorMessage(error)));
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    chatApi
      .listMessages(selectedConversation._id)
      .then(setMessages)
      .catch((error) => setFeedback(getErrorMessage(error)));
  }, [selectedConversation?._id]);

  const handleSend = async (text) => {
    if (!selectedConversation) {
      return;
    }

    try {
      const message = await chatApi.sendMessage(selectedConversation._id, text);
      setMessages((current) => [...current, message]);
      setConversations((current) =>
        current.map((conversation) =>
          conversation._id === selectedConversation._id
            ? { ...conversation, lastMessage: text, lastMessageAt: new Date().toISOString() }
            : conversation,
        ),
      );
    } catch (error) {
      setFeedback(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-ink/45">Messages</p>
        <h1 className="mt-2 text-4xl font-bold">Coordinate rentals and resale deals directly</h1>
        {feedback ? <p className="mt-2 text-sm text-ink/60">{feedback}</p> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversation?._id}
          onSelect={setSelectedConversation}
          currentUserId={user?._id}
        />
        <ChatWindow
          conversation={selectedConversation}
          messages={messages}
          currentUserId={user?._id}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}

export default ChatPage;
