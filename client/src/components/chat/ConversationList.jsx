import { getItemCoverPhoto } from "../../utils/itemPhotos";

function ConversationList({ conversations, selectedId, onSelect, currentUserId }) {
  return (
    <aside className="panel overflow-hidden">
      <div className="border-b border-ink/10 p-4">
        <p className="text-lg font-semibold">Conversations</p>
      </div>
      <div className="max-h-[620px] overflow-y-auto">
        {conversations.map((conversation) => {
          const partner = conversation.participants.find((participant) => participant._id !== currentUserId);
          const active = conversation._id === selectedId;
          const coverPhoto = getItemCoverPhoto(conversation.item);

          return (
            <button
              key={conversation._id}
              type="button"
              className={`flex w-full items-start gap-3 border-b border-ink/5 p-4 text-left transition ${
                active ? "bg-ink text-white" : "hover:bg-ink/5"
              }`}
              onClick={() => onSelect(conversation)}
            >
              <div className="h-14 w-14 overflow-hidden rounded-2xl bg-mist">
                <img
                  src={coverPhoto || "https://placehold.co/240x240?text=RentEd"}
                  alt={conversation.item?.title || "Item"}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{partner?.name || "Unknown user"}</p>
                <p className={`text-sm ${active ? "text-white/80" : "text-ink/55"}`}>
                  {conversation.item?.title}
                </p>
                <p className={`line-clamp-1 text-sm ${active ? "text-white/70" : "text-ink/45"}`}>
                  {conversation.lastMessage}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default ConversationList;
