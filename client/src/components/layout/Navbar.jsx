import { Menu } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";


function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const dynamicNavItems = [
    { to: "/marketplace", label: "Marketplace" },
    user?.role === "student" || user?.role === "seller" || !user ? { to: "/sell-rent", label: "Sell / Rent" } : null,
    { to: "/dashboard", label: "Dashboard" },
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
                `text-sm font-medium transition ${isActive ? "text-accent" : "text-ink/70 hover:text-ink"}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
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

        <button
          type="button"
          className="rounded-full border border-ink/10 p-2 md:hidden"
          onClick={() => setOpen((current) => !current)}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="border-t border-ink/5 bg-white/85 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {dynamicNavItems.map((item) => (
              <NavLink key={item.to} to={item.to} className="text-sm font-medium text-ink/75">
                {item.label}
              </NavLink>
            ))}
            {user ? (
              <Button variant="ghost" onClick={logout}>
                Logout
              </Button>
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
        </div>
      )}
    </header>
  );
}

export default Navbar;
