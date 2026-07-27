import { Menu, Bell, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import { notificationApi } from "../../api/client";
import { requestForToken } from "../../firebase";
import NotificationsList from "../dashboard/NotificationsList";


function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const containerRef = useRef(null);
  const location = useLocation();

  // Dismiss mobile menu drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);


  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await notificationApi.list();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
    } catch (err) {
      console.error("Failed to load notifications in Navbar:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      requestForToken();
      
      // Poll notifications every 30 seconds for live updates
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  // Click outside to close notification panel
  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const dynamicNavItems = [
    { to: "/", label: "🏠 Home" },
    { to: "/marketplace", label: "🛍️ Marketplace" },
    user?.role === "seller" ? { to: "/sell-rent", label: "➕ Sell / Rent" } : null,
    user ? { to: "/dashboard", label: "📊 Dashboard" } : null,
  ].filter(Boolean);


  return (
    <header className="sticky top-0 z-50 border-b border-ink/5 bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/logo-icon.png"
            alt="RentEd Logo"
            className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <div>
            <p className="font-display text-xl font-black tracking-tight leading-none text-ink">
              Rent<span className="text-accent">Ed</span>
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink/40 mt-1 leading-none">
              Student Hub
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {dynamicNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm font-medium transition ${isActive ? "text-accent font-bold" : "text-ink/70 hover:text-ink"}`
              }
            >
              {item.label.replace(/^[^\s]+\s/, "")}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              {/* Desktop Notification Bell Dropdown */}
              <div ref={containerRef} className="relative z-50 mr-2">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2.5 border border-ink/10 rounded-2xl bg-white hover:bg-ink/5 text-ink/75 transition relative"
                  title="View Alerts"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-white flex items-center justify-center text-[9px] font-black border-2 border-white animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 z-50 animate-fadeIn">
                    <NotificationsList
                      notifications={notifications}
                      unreadCount={unreadCount}
                      onRefresh={fetchNotifications}
                      onClose={() => setShowNotifications(false)}
                    />
                  </div>
                )}
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-ink">{user.name}</p>
                <p className="text-xs text-ink/55">{user.collegeId}</p>
              </div>
              <Button variant="ghost" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost">
                Login
              </Button>
              <Button as={Link} to="/signup" variant="secondary">
                Sign up
              </Button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          aria-label="Toggle navigation menu"
          className="rounded-2xl border border-ink/10 bg-white shadow-xs p-3 md:hidden min-h-[48px] min-w-[48px] flex items-center justify-center text-ink/85 hover:bg-canvas active:scale-95 transition"
          onClick={() => setOpen((current) => !current)}
        >
          <Menu className="h-6 w-6 text-accent" />
        </button>
      </div>

      {/* Mobile Slide-in Drawer & Overlay via Portal */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[9999] md:hidden flex justify-end">
            {/* Backdrop Overlay */}
            <div
              className="fixed inset-0 bg-ink/60 backdrop-blur-xs transition-opacity animate-fadeIn"
              onClick={() => setOpen(false)}
            />

            {/* Slide-In Drawer Panel */}
            <aside className="relative w-[85%] max-w-xs bg-white h-screen min-h-screen shadow-2xl z-50 p-6 flex flex-col justify-between overflow-y-auto transform transition-transform duration-300 animate-slideInRight">
              <div>
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-ink/10">
                  <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
                    <img src="/logo-icon.png" alt="RentEd Logo" className="h-8 w-auto object-contain" />
                    <span className="font-display text-lg font-black text-ink">
                      Rent<span className="text-accent">Ed</span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setOpen(false)}
                    className="rounded-full p-2 text-ink/50 hover:bg-canvas hover:text-ink min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* User Profile Badge (If Logged In) */}
                {user ? (
                  <div className="my-4 p-4 rounded-2xl bg-canvas border border-ink/5 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent text-white font-black flex items-center justify-center text-base uppercase shrink-0 shadow-sm">
                      {user.name ? user.name.charAt(0) : "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold text-ink truncate">{user.name}</p>
                      <p className="text-xs text-ink/50 capitalize truncate">{user.role || "Student"} • {user.collegeId || "Campus"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="my-4 p-3 rounded-2xl bg-accent/5 border border-accent/10">
                    <p className="text-xs font-bold text-accent">Student Rental Hub</p>
                    <p className="text-[11px] text-ink/60 mt-0.5">Rent textbooks, calculators & hostel essentials from campus peers.</p>
                  </div>
                )}

                {/* Navigation Menu Section */}
                <div className="mt-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-ink/40 mb-2 px-1">Navigation Menu</p>
                  <nav className="flex flex-col gap-1.5">
                    {dynamicNavItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition ${
                            isActive
                              ? "bg-accent text-white shadow-md shadow-accent/20"
                              : "text-ink/80 hover:bg-canvas hover:text-ink"
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </nav>
                </div>

                {/* Mobile Alerts Link */}
                {user && (
                  <div className="mt-4 pt-4 border-t border-ink/10 space-y-2">
                    <button
                      onClick={() => {
                        setOpen(false);
                        setShowNotifications(true);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-canvas text-ink/80 text-sm font-bold hover:bg-ink/5"
                    >
                      <span className="flex items-center gap-2">
                        <Bell className="h-4.5 w-4.5 text-accent" /> Live Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-accent text-white text-[10px] font-black">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Drawer Footer Actions */}
              <div className="pt-4 border-t border-ink/10 flex flex-col gap-2 mt-6">
                {user ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                    className="w-full justify-center text-red-600 hover:bg-red-50 py-3 rounded-2xl font-extrabold border border-red-100"
                  >
                    Logout Account
                  </Button>
                ) : (
                  <>
                    <Button
                      as={Link}
                      to="/login"
                      onClick={() => setOpen(false)}
                      variant="ghost"
                      className="w-full justify-center py-3 rounded-2xl font-extrabold border border-ink/10"
                    >
                      Login
                    </Button>
                    <Button
                      as={Link}
                      to="/signup"
                      onClick={() => setOpen(false)}
                      variant="secondary"
                      className="w-full justify-center py-3 rounded-2xl font-extrabold shadow-md shadow-accent/20"
                    >
                      Sign up
                    </Button>
                  </>
                )}
              </div>
            </aside>
          </div>,
          document.body
        )}

    </header>
  );
}

export default Navbar;
