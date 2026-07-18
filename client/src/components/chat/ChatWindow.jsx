import { useState, useRef, useEffect } from "react";
import { Send, Image, FileText, Check, CheckCheck, Trash2, ArrowDown } from "lucide-react";
import { chatApi, getErrorMessage } from "../../api/client";
import Button from "../ui/Button";

function ChatWindow({
  conversation,
  messages,
  currentUserId,
  onSend,
  onDeleteMessage,
  onScrollTop,
  hasMore,
  loadingMessages,
  typingUser,
  onlineStatus,
}) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const scrollRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Auto-scroll to bottom of messages on mount or new message
  const scrollToBottom = (behavior = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, [conversation?._id]);

  useEffect(() => {
    // Only auto scroll to bottom if user is already near bottom
    if (scrollRef.current) {
      const isNearBottom =
        scrollRef.current.scrollHeight - scrollRef.current.clientHeight - scrollRef.current.scrollTop < 150;
      if (isNearBottom) {
        scrollToBottom("smooth");
      } else {
        setShowScrollBottom(true);
      }
    }
  }, [messages.length]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    // Check if scrolled to top
    if (scrollRef.current.scrollTop === 0 && hasMore && !loadingMessages) {
      const prevScrollHeight = scrollRef.current.scrollHeight;
      onScrollTop();
      // Adjust scroll to prevent jumping
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevScrollHeight;
        }
      }, 50);
    }

    // Toggle scroll to bottom button
    const isNearBottom =
      scrollRef.current.scrollHeight - scrollRef.current.clientHeight - scrollRef.current.scrollTop < 200;
    setShowScrollBottom(!isNearBottom);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;

    await onSend(text);
    setText("");
  };

  const handleFileUpload = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Maximum allowed size is 10MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("attachment", file);

      const res = await chatApi.uploadAttachment(formData);
      await onSend("", res);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  if (!conversation) {
    return (
      <div className="panel flex min-h-[700px] items-center justify-center p-8 text-center text-ink/55 bg-white border border-ink/5 rounded-3xl">
        Pick an active conversation to coordinate rentals or purchases.
      </div>
    );
  }

  const partner = conversation.participants.find((p) => p._id !== currentUserId);
  const isOnline = onlineStatus === "online";
  const formattedOnlineStatus = isOnline
    ? "Online"
    : onlineStatus
      ? `Last seen: ${new Date(onlineStatus).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : "Offline";

  const quickReplies = [
    "I'm on the way",
    "Item picked up",
    "Delivered",
    "Let's meet at campus main library",
    "Where should I collect the item?"
  ];

  return (
    <section className="panel flex h-[700px] flex-col overflow-hidden bg-white border border-ink/5 rounded-3xl relative">
      {/* Header */}
      <div className="border-b border-ink/5 p-4 shrink-0 bg-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 overflow-hidden rounded-2xl bg-mist border border-ink/5">
                <img
                  src={partner?.avatarUrl || "https://placehold.co/120x120?text=User"}
                  alt={partner?.name || "User"}
                  className="h-full w-full object-cover"
                />
              </div>
              {isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-base font-bold text-ink">{partner?.name || "Support Representative"}</p>
                {partner?.role && (
                  <span className={`text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded font-black ${
                    partner.role === "admin" ? "bg-red-50 text-red-700 border border-red-100" :
                    partner.role === "poc" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                    "bg-indigo-50 text-indigo-700 border border-indigo-100"
                  }`}>
                    {partner.role}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-ink/45">
                {partner?.collegeName || conversation.item?.collegeName} • <span className="font-semibold text-accent/80">{formattedOnlineStatus}</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-black text-ink bg-mist/60 border border-ink/10 px-2.5 py-1 rounded-full uppercase">
              {conversation.item?.category}
            </span>
            <p className="text-[9px] font-bold text-ink/50 mt-1 truncate max-w-[120px]" title={conversation.item?.title}>
              {conversation.item?.title}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-canvas/20"
      >
        {loadingMessages && (
          <p className="text-center text-[10px] font-black tracking-wider uppercase text-accent animate-pulse">
            Loading older messages...
          </p>
        )}

        {messages.map((message) => {
          const mine = message.sender?._id === currentUserId;
          const status = message.seenStatus || "sent";

          return (
            <div key={message._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-md rounded-2xl p-3 space-y-1 relative group ${
                  mine ? "bg-accent text-white rounded-br-none" : "bg-white text-ink border border-ink/5 rounded-bl-none shadow-sm"
                }`}
              >
                {/* Delete Button */}
                {mine && (
                  <button
                    onClick={() => onDeleteMessage(message._id)}
                    className="absolute -left-6 top-3 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Message"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Sender Name */}
                {!mine && (
                  <p className="text-[9px] font-black uppercase text-indigo-700">
                    {message.sender?.name} ({message.sender?.role})
                  </p>
                )}

                {/* Text Body */}
                {message.text && (
                  <p className="text-xs leading-normal whitespace-pre-wrap">{message.text}</p>
                )}

                {/* Attachments */}
                {message.attachments?.image && (
                  <div className="rounded-xl overflow-hidden max-w-[280px] border border-ink/10">
                    <img
                      src={message.attachments.image}
                      alt="Shared attachment"
                      className="w-full h-auto max-h-56 object-cover cursor-pointer"
                      onClick={() => window.open(message.attachments.image, "_blank")}
                    />
                  </div>
                )}

                {message.attachments?.document && (
                  <div className={`flex items-center gap-2 p-2 rounded-xl border text-xs ${
                    mine ? "bg-white/10 border-white/20" : "bg-mist/35 border-ink/5"
                  }`}>
                    <FileText className="h-5 w-5 shrink-0 text-red-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">PDF Document</p>
                      <a
                        href={message.attachments.document}
                        target="_blank"
                        rel="noreferrer"
                        className={`text-[10px] hover:underline font-bold ${mine ? "text-white" : "text-accent"}`}
                      >
                        Download PDF
                      </a>
                    </div>
                  </div>
                )}

                {/* Timestamp and Receipt ticks */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[8px]">
                  <span className={mine ? "text-white/60" : "text-ink/35"}>
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {mine && (
                    <span>
                      {status === "sent" ? (
                        <Check className="h-3 w-3 text-white/50" />
                      ) : (
                        <CheckCheck className={`h-3 w-3 ${status === "seen" ? "text-indigo-200" : "text-white/65"}`} />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicators */}
        {typingUser && (
          <div className="flex justify-start">
            <div className="bg-white text-ink border border-ink/5 rounded-2xl rounded-bl-none p-3 shadow-sm flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-indigo-700">{typingUser.name} is typing</span>
              <span className="flex gap-1 items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Scroll Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-28 right-6 p-2 bg-white hover:bg-mist border border-ink/10 shadow-lg rounded-full text-ink transition-all z-10 animate-bounce"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      {/* Quick Replies */}
      <div className="px-4 py-2 border-t border-ink/5 shrink-0 bg-white overflow-x-auto flex gap-1.5 scrollbar-none whitespace-nowrap">
        {quickReplies.map((reply) => (
          <button
            key={reply}
            onClick={() => onSend(reply)}
            className="text-[9px] font-black uppercase tracking-wide px-3 py-1 bg-mist/50 hover:bg-mist text-ink border border-ink/10 rounded-full shrink-0 transition-colors"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Uploader Hidden Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, "image")}
      />
      <input
        type="file"
        ref={pdfInputRef}
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFileUpload(e, "pdf")}
      />

      {/* Composer Input Form */}
      <form className="border-t border-ink/5 p-4 shrink-0 bg-white" onSubmit={handleSubmit}>
        <div className="flex gap-2 items-center">
          {/* Menu triggers */}
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 border border-ink/10 rounded-xl hover:bg-mist text-ink/60"
              disabled={uploading}
              title="Share Image"
            >
              <Image className="h-4.5 w-4.5" />
            </button>
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              className="p-2 border border-ink/10 rounded-xl hover:bg-mist text-ink/60"
              disabled={uploading}
              title="Share PDF"
            >
              <FileText className="h-4.5 w-4.5" />
            </button>
          </div>

          <input
            className="input flex-1 py-2 text-xs"
            placeholder={uploading ? "Uploading attachment..." : "Send a message about pickup, condition, or pricing..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={uploading}
          />

          <Button type="submit" variant="secondary" className="py-2.5 px-4 rounded-xl shrink-0" disabled={uploading || !text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </section>
  );
}

export default ChatWindow;
