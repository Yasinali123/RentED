import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, RefreshCw, AlertTriangle } from "lucide-react";

import { dashboardApi, getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import StudentDashboardView from "../components/dashboard/StudentDashboardView";
import SellerDashboardView from "../components/dashboard/SellerDashboardView";
import PocDashboardView from "../components/dashboard/PocDashboardView";
import AdminDashboardView from "../components/dashboard/AdminDashboardView";
import NotificationsList from "../components/dashboard/NotificationsList";

function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  const loadDashboard = () => {
    setLoading(true);
    setFeedback("");
    dashboardApi
      .get()
      .then((data) => {
        setDashboard(data);
      })
      .catch((error) => {
        setFeedback(getErrorMessage(error));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading && !dashboard) {
    return (
      <div className="panel p-12 text-center text-ink/55 flex flex-col justify-center items-center gap-4 bg-white/50">
        <div className="h-8 w-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
        <p className="font-bold">Syncing your campus profile...</p>
      </div>
    );
  }

  if (feedback && !dashboard) {
    return (
      <div className="panel p-10 text-center text-red-600 bg-red-50/20 border-red-200">
        <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-red-500" />
        <p className="font-bold">Failed to load dashboard</p>
        <p className="text-xs text-ink/65 mt-1">{feedback}</p>
        <button
          onClick={loadDashboard}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-full text-xs font-bold"
        >
          Retry Load
        </button>
      </div>
    );
  }

  const role = dashboard?.role || user?.role || "student";

  const renderRoleDashboard = () => {
    switch (role) {
      case "student":
        return <StudentDashboardView dashboard={dashboard} onRefresh={loadDashboard} />;
      case "seller":
        return <SellerDashboardView dashboard={dashboard} onRefresh={loadDashboard} />;
      case "poc":
        return <PocDashboardView dashboard={dashboard} onRefresh={loadDashboard} />;
      case "admin":
        return <AdminDashboardView dashboard={dashboard} onRefresh={loadDashboard} />;
      default:
        return <StudentDashboardView dashboard={dashboard} onRefresh={loadDashboard} />;
    }
  };

  const getRoleHeaderLabel = () => {
    switch (role) {
      case "student":
        return "Student Dashboard";
      case "seller":
        return "Merchant Inventory Control";
      case "poc":
        return "POC Campus Dispatch";
      case "admin":
        return "Platform Management Console";
      default:
        return "Student Workspace";
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Header Panel */}
      <div className="panel p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-ink/5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent">
            {getRoleHeaderLabel()}
          </p>
          <h1 className="text-3xl font-black text-ink mt-1">
            Welcome back, {user?.name || "Member"}
          </h1>
          <p className="text-xs text-ink/50 mt-1">
            Logged in: <b className="capitalize text-accent">{role}</b> • Campus ID: {user?.collegeId}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          {/* Notification bell trigger */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-3 border border-ink/10 rounded-2xl bg-white hover:bg-ink/5 text-ink/75 transition relative"
            title="View Alerts"
          >
            <Bell className="h-5 w-5" />
            {dashboard?.stats?.unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-white flex items-center justify-center text-[9px] font-black border-2 border-white animate-pulse">
                {dashboard.stats.unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            onClick={loadDashboard}
            className="p-3 border border-ink/10 rounded-2xl bg-white hover:bg-ink/5 text-ink/75 transition"
            title="Refresh Data"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Floating Notifications panel drawer */}
      {showNotifications && (
        <div className="absolute right-0 top-20 z-50 animate-fadeIn">
          <NotificationsList
            notifications={dashboard?.notifications || []}
            unreadCount={dashboard?.stats?.unreadNotificationsCount || 0}
            onRefresh={loadDashboard}
            onClose={() => setShowNotifications(false)}
          />
        </div>
      )}

      {/* Render Main Dashboard View depending on role */}
      <div className="relative">
        {renderRoleDashboard()}
      </div>
    </div>
  );
}

export default DashboardPage;
