import { useState } from "react";

import Button from "../ui/Button";
import { getItemCoverPhoto } from "../../utils/itemPhotos";

function ChatWindow({ conversation, messages, currentUserId, onSend }) {
  const [text, setText] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!text.trim()) {
      return;
    }

    await onSend(text);
    setText("");
  };

  if (!conversation) {
    return (
      <div className="panel flex min-h-[620px] items-center justify-center p-8 text-center text-ink/55">
        Pick a conversation to view messages.
      </div>
    );
  }

  const coverPhoto = getItemCoverPhoto(conversation.item);

  return (
    <section className="panel flex min-h-[620px] flex-col overflow-hidden">
      <div className="border-b border-ink/10 p-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-2xl bg-mist">
            <img
              src={coverPhoto || "https://placehold.co/320x320?text=RentEd"}
              alt={conversation.item?.title || "Item"}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="text-xl font-semibold">{conversation.item?.title}</p>
            <p className="text-sm text-ink/55">{conversation.item?.location}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.map((message) => {
          const mine = message.sender?._id === currentUserId;

          return (
            <div key={message._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xl rounded-3xl px-4 py-3 text-sm ${
                  mine ? "bg-accent text-white" : "bg-mist text-ink"
                }`}
              >
                <p>{message.text}</p>
                <p className={`mt-2 text-xs ${mine ? "text-white/70" : "text-ink/45"}`}>
                  {message.sender?.name}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <form className="border-t border-ink/10 p-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            className="input flex-1"
            placeholder="Send a message about pickup, condition, or pricing"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <Button type="submit" variant="secondary">
            Send
          </Button>
        </div>
      </form>
    </section>
  );
}

export default ChatWindow;
