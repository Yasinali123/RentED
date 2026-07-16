import { 
  BookOpen, 
  Compass, 
  Github, 
  Instagram, 
  Linkedin, 
  Mail, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Twitter 
} from "lucide-react";
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="w-full border-t border-ink/5 bg-white/50 pt-16 pb-8 mt-20 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 pb-12 border-b border-ink/5">
          
          {/* Brand Col */}
          <div className="lg:col-span-4 space-y-5">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/logo-icon.png"
                alt="RentEd Logo"
                className="h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
              <div>
                <p className="font-display text-lg font-black tracking-tight leading-none text-ink">
                  Rent<span className="text-accent">Ed</span>
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink/40 mt-1 leading-none">
                  Student Hub
                </p>
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-ink/60">
              India's premium hyperlocal campus rental and resale marketplace. Rent books, electronics, bikes, and daily essentials from verified students on your campus.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-4 pt-2">
              {[
                { icon: Twitter, href: "https://twitter.com" },
                { icon: Instagram, href: "https://instagram.com" },
                { icon: Linkedin, href: "https://linkedin.com" },
                { icon: Github, href: "https://github.com" }
              ].map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/5 text-ink/75 hover:bg-accent hover:text-white transition duration-200"
                >
                  <social.icon className="h-4.5 w-4.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links: Marketplace */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink/50">Marketplace</h4>
            <ul className="space-y-2 text-sm font-medium">
              {[
                { label: "Engineering Textbooks", query: "Books" },
                { label: "Electronics & Gadgets", query: "Electronics" },
                { label: "Hostel Rooms", query: "Rooms" },
                { label: "Cycles & Bicycles", query: "Bicycles" },
                { label: "Lab Gear & Instruments", query: "Lab Gear" }
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={`/marketplace?category=${link.query}`}
                    className="text-ink/70 hover:text-accent transition duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links: Account & Safety */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink/50">Escrow & Account</h4>
            <ul className="space-y-2 text-sm font-medium">
              {[
                { label: "Student Dashboard", to: "/dashboard" },
                { label: "Wallet Balance", to: "/dashboard" },
                { label: "List an Item to Rent/Sell", to: "/sell-rent" },
                { label: "Trust & Safety Guidelines", to: "/" },
                { label: "Escrow Payment Info", to: "/" }
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-ink/70 hover:text-accent transition duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Verification Info */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink/50">Trust Guarantee</h4>
            <div className="space-y-3.5 text-sm text-ink/70">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="leading-snug text-xs">
                  <strong>ID Checked Students:</strong> 100% of trades occur between verified campus students.
                </p>
              </div>
              <div className="flex items-start gap-2.5 pt-1">
                <MapPin className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <p className="leading-snug text-xs">
                  <strong>Hyperlocal Hubs:</strong> Safe, physical trade pickups right on your campus grounds.
                </p>
              </div>
              <div className="flex items-center gap-2.5 pt-2 text-xs text-ink/40">
                <Mail className="h-4 w-4" />
                <span>support@rented.com</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom copyright bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 gap-4 text-xs text-ink/45 font-medium">
          <p>© 2026 RentEd Technologies. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <span className="text-accent text-sm"></span> for college students in India
          </p>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-accent transition">Privacy Policy</Link>
            <span>·</span>
            <Link to="/" className="hover:text-accent transition">Terms of Service</Link>
          </div>
        </div>

      </div>
    </footer>
  ); 
}

export default Footer;
