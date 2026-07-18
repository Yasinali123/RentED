import { useState } from "react";
import { Search, MessageSquare, AlertCircle } from "lucide-react";
import { getItemCoverPhoto } from "../../utils/itemPhotos";

function ConversationList({ conversations, selectedId, onSelect, currentUserId, onlineStatusMap }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredConversations = conversations.filter((c) => {
    const partner = c.participants.find((p) => p._id !== currentUserId);
    const searchStr = `${partner?.name || ""} ${c.item?.title || ""}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  return (
    <aside className="panel overflow-hidden flex flex-col h-[700px] bg-white border border-ink/5 rounded-3xl">
      {/* Search Header */}
      <div className="p-4 border-b border-ink/5 space-y-3 shrink-0">
        <p className="text-base font-bold text-ink">Conversations</p>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink/40" />
          <input
            type="text"
            placeholder="Search chats or listings..."
            className="input pl-9 py-1.5 text-xs w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-ink/5">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-ink/40 space-y-2">
            <MessageSquare className="h-8 w-8 mx-auto text-ink/15" />
            <p className="text-xs font-bold">No active chats found</p>
            <p className="text-[10px] text-ink/30">Connect through an active order, pg listing, or file a dispute to initialize chats.</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const partner = conversation.participants.find((participant) => participant._id !== currentUserId);
            const active = conversation._id === selectedId;
            const coverPhoto = getItemCoverPhoto(conversation.item);
            
            // Unread Count logic using Mongoose Map representation
            const unreadCount = conversation.unreadCount?.[currentUserId] || 0;

            const isOnline = onlineStatusMap?.[partner?._id] === "online";
            const orderDisputed = conversation.rentalRequest?.disputed;

            return (
              <button
                key={conversation._id}
                type="button"
                className={`flex w-full items-start gap-3 p-4 text-left transition-colors relative ${
                  active ? "bg-accent/5" : "hover:bg-mist/30"
                }`}
                onClick={() => onSelect(conversation)}
              >
                {/* Active sidebar boundary indicator */}
                {active && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-r-md" />
                )}

                {/* Avatar with Online indicator */}
                <div className="relative shrink-0">
                  <div className="h-12 w-12 overflow-hidden rounded-2xl border border-ink/10 bg-mist">
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

                {/* Info */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-bold text-xs text-ink truncate">
                      {partner?.name || "Support Room"}
                    </p>
                    {partner?.role && (
                      <span className={`text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded font-black shrink-0 ${
                        partner.role === "admin" ? "bg-red-50 text-red-700 border border-red-100" :
                        partner.role === "poc" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                        "bg-indigo-50 text-indigo-700 border border-indigo-100"
                      }`}>
                        {partner.role}
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-ink/65 truncate font-semibold">
                    Listing: {conversation.item?.title || "Educational support"}
                  </p>

                  <p className={`line-clamp-1 text-[10px] ${unreadCount > 0 ? "font-bold text-accent" : "text-ink/40"}`}>
                    {conversation.lastMessage}
                  </p>

                  {orderDisputed && (
                    <span className="inline-flex items-center gap-0.5 mt-1 text-[8px] font-black uppercase text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">
                      <AlertCircle className="h-2.5 w-2.5" /> Disputed Order
                    </span>
                  )}
                </div>

                {/* Unread badge & cover photo */}
                <div className="flex flex-col items-end justify-between h-12 shrink-0">
                  <div className="h-6 w-6 overflow-hidden rounded bg-mist border border-ink/5 opacity-55">
                    <img src={coverPhoto} className="h-full w-full object-cover" />
                  </div>
                  {unreadCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[9px] font-black text-white animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

export default ConversationList;
