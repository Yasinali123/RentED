import { Menu, Bell, X, Sun, Moon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import Button from "../ui/Button";
import { notificationApi } from "../../api/client";
import { requestForToken } from "../../firebase";
import NotificationsList from "../dashboard/NotificationsList";


function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    (!user || ["seller", "student", "admin"].includes(user?.role)) ? { to: "/sell-rent", label: "➕ Sell / Rent" } : null,
    user ? { to: "/dashboard", label: "📊 Dashboard" } : null,
  ].filter(Boolean);

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-white backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/logo-icon.png"
            alt="RentEd Logo"
            className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <div>
            <p className="font-display text-xl font-black tracking-tight leading-none">
              <span className="text-black">Rent</span><span className="text-accent">Ed</span>
            </p>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-ink/50 mt-1 leading-none">
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
                `text-sm font-medium transition ${
                  isActive
                    ? "text-accent font-bold"
                    : "text-ink/75 hover:text-accent font-semibold"
                }`
              }
            >
              {item.label.replace(/^[^\s]+\s/, "")}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {/* Theme Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-2.5 border border-ink/10 rounded-2xl bg-white text-ink/75 hover:bg-canvas transition flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-amber-500" />
            ) : (
              <Moon className="h-5 w-5 text-indigo-600" />
            )}
          </button>

          {user ? (
            <>
              {/* Desktop Notification Bell Dropdown */}
              <div ref={containerRef} className="relative z-50 mr-2">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2.5 border border-ink/10 rounded-2xl bg-white text-ink/75 hover:bg-canvas transition relative"
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
          className="rounded-full border border-accent/25 dark:border-slate-700 bg-gradient-to-br from-[#fff7f2] via-[#ffefe5] to-[#fde9dc] dark:bg-slate-800 shadow-sm p-3 md:hidden h-12 w-12 flex items-center justify-center text-black dark:text-white hover:border-accent/40 active:scale-95 transition"
          onClick={() => setOpen((current) => !current)}
        >
          <Menu className="h-6 w-6 text-black dark:text-white" />
        </button>




      </div>

      {/* Mobile Slide-in Drawer & Overlay via Portal */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[9999] md:hidden flex justify-end">
            {/* Backdrop Overlay */}
            <div
              className="fixed inset-0 bg-ink/60 dark:bg-black/80 backdrop-blur-xs transition-opacity animate-fadeIn"
              onClick={() => setOpen(false)}
            />

            {/* Slide-In Drawer Panel */}
            <aside className="relative w-[85%] max-w-xs bg-white dark:bg-slate-900 border-l border-ink/10 dark:border-slate-800 h-screen min-h-screen shadow-2xl z-50 p-6 flex flex-col justify-between overflow-y-auto transform transition-transform duration-300 animate-slideInRight text-ink dark:text-slate-100">
              <div>
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-ink/10 dark:border-slate-800">
                  <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
                    <img src="/logo-icon.png" alt="RentEd Logo" className="h-8 w-auto object-contain" />
                    <span className="font-display text-lg font-black text-ink dark:text-white">
                      Rent<span className="text-accent">Ed</span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setOpen(false)}
                    className="rounded-full p-2 text-ink/50 dark:text-slate-400 hover:bg-canvas dark:hover:bg-slate-800 hover:text-ink dark:hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* User Profile Badge (If Logged In) */}
                {user ? (
                  <div className="my-4 p-4 rounded-2xl bg-canvas dark:bg-slate-800 border border-ink/5 dark:border-slate-700 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent text-white font-black flex items-center justify-center text-base uppercase shrink-0 shadow-sm">
                      {user.name ? user.name.charAt(0) : "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold text-ink dark:text-white truncate">{user.name}</p>
                      <p className="text-xs text-ink/50 dark:text-slate-300 capitalize truncate">{user.role || "Student"} • {user.collegeId || "Campus"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="my-4 p-3 rounded-2xl bg-accent/5 dark:bg-accent/10 border border-accent/10 dark:border-accent/20">
                    <p className="text-xs font-bold text-accent">Student Rental Hub</p>
                    <p className="text-[11px] text-ink/60 dark:text-slate-300 mt-0.5">Rent textbooks, calculators & hostel essentials from campus peers.</p>
                  </div>
                )}

                {/* Navigation Menu Section */}
                <div className="mt-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-ink/40 dark:text-slate-400 mb-2 px-1">Navigation Menu</p>
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
                              : "text-ink/80 dark:text-slate-200 hover:bg-canvas dark:hover:bg-slate-800 hover:text-ink dark:hover:text-white"
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
                  <div className="mt-4 pt-4 border-t border-ink/10 dark:border-slate-800 space-y-2">
                    <button
                      onClick={() => {
                        setOpen(false);
                        setShowNotifications(true);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-canvas dark:bg-slate-800 text-ink/80 dark:text-slate-200 text-sm font-bold hover:bg-ink/5 dark:hover:bg-slate-700"
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

                {/* Mobile Theme Toggle */}
                <div className="mt-4 pt-4 border-t border-ink/10 dark:border-slate-800">
                  <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-canvas dark:bg-slate-800 border border-ink/5 dark:border-slate-700">
                    <span className="text-xs font-extrabold text-ink dark:text-slate-200 flex items-center gap-2">
                      {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-400" />}
                      App Theme
                    </span>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-black hover:opacity-90 transition cursor-pointer flex items-center gap-1.5"
                    >
                      {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="pt-4 border-t border-ink/10 dark:border-slate-800 flex flex-col gap-2 mt-6">
                {user ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                    className="w-full justify-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 py-3 rounded-2xl font-extrabold border border-red-100 dark:border-red-900/30"
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
                      className="w-full justify-center py-3 rounded-2xl font-extrabold border border-ink/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
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

