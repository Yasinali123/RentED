import { Bell, BellRing, CheckCheck, Trash2, X } from "lucide-react";
import { notificationApi } from "../../api/client";

function NotificationsList({ notifications, unreadCount, onRefresh, onClose }) {
  const handleMarkReadAll = async () => {
    try {
      await notificationApi.readAll();
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationApi.readNotification({ id });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationApi.delete(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="panel p-6 space-y-4 max-w-sm w-full bg-white shadow-xl border border-ink/5">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-ink flex items-center gap-2">
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5 text-accent animate-swing" />
          ) : (
            <Bell className="h-5 w-5 text-ink/40" />
          )}
          Notifications
          {unreadCount > 0 && (
            <span className="text-[10px] bg-accent text-white px-2 py-0.5 rounded-full font-bold">
              {unreadCount}
            </span>
          )}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-ink/5 rounded-full text-ink/40 hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>

      {unreadCount > 0 && (
        <button
          onClick={handleMarkReadAll}
          className="text-xs font-bold text-accent flex items-center gap-1 hover:underline"
        >
          <CheckCheck className="h-4 w-4" /> Mark all as read
        </button>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {notifications.map((n) => (
          <div
            key={n._id}
            onClick={() => !n.isRead && handleMarkRead(n._id)}
            className={`p-3 rounded-xl border transition-all relative ${
              n.isRead ? "bg-white/50 border-ink/5 text-ink/75" : "bg-accent/5 border-accent/10 text-ink font-semibold hover:bg-accent/10 cursor-pointer"
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-xs font-bold">{n.title}</p>
                <p className="text-[11px] text-ink/65 mt-1 leading-relaxed">{n.message}</p>
                <p className="text-[9px] text-ink/35 mt-1">
                  {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(n._id);
                }}
                className="p-1 hover:bg-red-50 text-ink/30 hover:text-red-500 rounded transition"
                title="Delete alert"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <p className="text-xs text-ink/40 text-center py-6">Your inbox is clean!</p>
        )}
      </div>
    </div>
  );
}

export default NotificationsList;
