import {
  ArrowRight,
  BookOpen,
  Compass,
  Flame,
  Globe,
  GraduationCap,
  Handshake,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  School,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wallet,
  Zap,
  Laptop,
  Minimize2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { itemApi, locationApi } from "../api/client";
import ItemCard from "../components/items/ItemCard";
import Button from "../components/ui/Button";
import { landingStats } from "../data/sampleHighlights";
import { useAuth } from "../context/AuthContext";
import useCurrentLocation from "../hooks/useCurrentLocation";

/* ───────────────────────────────── hooks ───────────────────────────────── */

function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
}

function useCountUp(end, duration = 2000, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const numEnd = parseInt(end, 10) || 0;
    function animate(ts) {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setValue(Math.floor(progress * numEnd));
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [end, duration, start]);
  return value;
}

/* ──────────────────────────── micro‑components ─────────────────────────── */

function FloatingIcon({ icon: Icon, className, delay = "0s" }) {
  return (
    <div
      className={`absolute rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md shadow-lg ${className}`}
      style={{
        animation: `floatBounce 6s ease-in-out ${delay} infinite`,
      }}
    >
      <Icon className="h-6 w-6 text-white/80" />
    </div>
  );
}

/* ─── Premium e-commerce products for hero showcase grid ─── */

const HERO_MOCK_PRODUCTS = {
  Popular: [
    { id: 1, title: "iPad Air (4th Gen) 64GB", category: "Electronics", condition: "Like New", priceRent: "₹150/day", priceBuy: "₹18,000", rating: 4.9, icon: Laptop, badge: "Trending", color: "#6366f1" },
    { id: 2, title: "Organic Chemistry Vol 3", category: "Books", condition: "Good", priceRent: "₹35/day", priceBuy: "₹299", rating: 4.8, icon: BookOpen, badge: "Saves ₹800", color: "#ec6f36" },
    { id: 3, title: "B'Twin Rockrider Bicycle", category: "Bicycles", condition: "Excellent", priceRent: "₹80/day", priceBuy: "₹4,500", rating: 4.7, icon: Compass, badge: "Nearby", color: "#275245" },
    { id: 4, title: "CASIO FX-991EX Calculator", category: "Lab Gear", condition: "Like New", priceRent: "₹15/day", priceBuy: "₹650", rating: 4.9, icon: Zap, badge: "Highly Rated", color: "#0ea5e9" },
  ],
  Books: [
    { id: 5, title: "Concepts of Physics Vol 1", category: "Books", condition: "Fair", priceRent: "₹20/day", priceBuy: "₹150", rating: 4.6, icon: BookOpen, badge: "Core syllabus", color: "#f43f5e" },
    { id: 6, title: "Introduction to Algorithms", category: "Books", condition: "Excellent", priceRent: "₹40/day", priceBuy: "₹350", rating: 4.8, icon: BookOpen, badge: "CSE Special", color: "#8b5cf6" },
    { id: 2, title: "Organic Chemistry Vol 3", category: "Books", condition: "Good", priceRent: "₹35/day", priceBuy: "₹299", rating: 4.8, icon: BookOpen, badge: "Saves ₹800", color: "#ec6f36" },
    { id: 7, title: "Thermodynamics Rajput", category: "Books", condition: "Good", priceRent: "₹25/day", priceBuy: "₹250", rating: 4.7, icon: BookOpen, badge: "Recommended", color: "#ec6f36" },
  ],
  Electronics: [
    { id: 1, title: "iPad Air (4th Gen) 64GB", category: "Electronics", condition: "Like New", priceRent: "₹150/day", priceBuy: "₹18,000", rating: 4.9, icon: Laptop, badge: "Trending", color: "#6366f1" },
    { id: 8, title: "Noise-Cancelling Headphones", category: "Electronics", condition: "Excellent", priceRent: "₹90/day", priceBuy: "₹2,200", rating: 4.8, icon: MessageCircle, badge: "Study Buddy", color: "#8b5cf6" },
    { id: 4, title: "CASIO FX-991EX Calculator", category: "Lab Gear", condition: "Like New", priceRent: "₹15/day", priceBuy: "₹650", rating: 4.9, icon: Zap, badge: "Highly Rated", color: "#0ea5e9" },
    { id: 9, title: "DSLR Canon 1500D Camera", category: "Electronics", condition: "Like New", priceRent: "₹200/day", priceBuy: "₹15,000", rating: 4.9, icon: Package, badge: "Creator Kit", color: "#275245" },
  ],
  Bicycles: [
    { id: 3, title: "B'Twin Rockrider Bicycle", category: "Bicycles", condition: "Excellent", priceRent: "₹80/day", priceBuy: "₹4,500", rating: 4.7, icon: Compass, badge: "Nearby", color: "#275245" },
    { id: 10, title: "Hero Ranger Mountain Bike", category: "Bicycles", condition: "Good", priceRent: "₹50/day", priceBuy: "₹2,800", rating: 4.5, icon: Compass, badge: "Campus Classic", color: "#f59e0b" },
    { id: 11, title: "Geared Campus Cycle", category: "Bicycles", condition: "Good", priceRent: "₹60/day", priceBuy: "₹3,200", rating: 4.6, icon: Compass, badge: "Eco-friendly", color: "#10b981" },
    { id: 12, title: "Single Room — Block C", category: "Rooms", condition: "Excellent", priceRent: "₹3,500/mo", priceBuy: "N/A", rating: 4.7, icon: MapPin, badge: "Premium Room", color: "#6366f1" },
  ],
};

const showcaseItems = [
  {
    title: "Engineering Thermodynamics",
    subtitle: "5th Edition · R.K. Rajput",
    tag: "Textbook",
    price: "₹45/day",
    savings: "Save 78%",
    color: "#ec6f36",
    glow: "#ec6f36",
    icon: BookOpen,
    image: "/images/engineering-math-2.jpg",
    seller: "Rahul K.",
    college: "IIT Bombay",
    rating: "4.9",
  },
  {
    title: "Canon EOS 1500D DSLR",
    subtitle: "With 18-55mm Lens Kit",
    tag: "Equipment",
    price: "₹200/day",
    savings: "Save 92%",
    color: "#275245",
    glow: "#34d399",
    icon: Package,
    image: "/images/dslr-camera.png",
    seller: "Meera S.",
    college: "BITS Pilani",
    rating: "4.8",
  },
  {
    title: "Single Room — Block C",
    subtitle: "Furnished · AC · WiFi",
    tag: "Room",
    price: "₹3,500/mo",
    savings: "Save 65%",
    color: "#6366f1",
    glow: "#818cf8",
    icon: MapPin,
    image: "/images/pg-room.jpeg",
    seller: "Anil P.",
    college: "NIT Trichy",
    rating: "4.7",
  },
];





function HeroShowcase({ heroState }) {
  const [activeCard, setActiveCard] = useState(0);

  // Auto-cycle cards with 3D rotation (only when not collapsing)
  useEffect(() => {
    if (heroState === "collapsing" || heroState === "collapsed") return;
    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % showcaseItems.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [heroState]);

  const current = showcaseItems[activeCard];
  const isCollapsing = heroState === "collapsing";

  return (
    <div className="relative h-[480px] w-full" style={{ perspective: "1200px" }}>

      {/* ── Multi-layer radial glow ── */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${isCollapsing ? "animate-disappear-orbs" : ""}`}>
        <div
          className="absolute h-80 w-80 rounded-full blur-[100px] transition-all duration-1000"
          style={{ backgroundColor: current.glow + "35" }}
        />
        <div
          className="absolute h-56 w-56 rounded-full blur-[60px] transition-all duration-1000"
          style={{ backgroundColor: current.glow + "20" }}
        />
        <div
          className="absolute h-32 w-32 rounded-full blur-[40px] transition-all duration-1000"
          style={{ backgroundColor: current.color + "30" }}
        />
      </div>

      {/* ── Orbiting rings ── */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${isCollapsing ? "animate-disappear-rings" : ""}`}>
        {/* Outer ring */}
        <div
          className="absolute h-[380px] w-[380px] rounded-full border border-dashed border-ink/[0.07]"
          style={{ animation: "orbitSpin 25s linear infinite" }}
        />
        {/* Inner ring */}
        <div
          className="absolute h-[280px] w-[280px] rounded-full border border-dotted border-ink/[0.05]"
          style={{ animation: "orbitSpin 18s linear infinite reverse" }}
        />
        {/* Innermost ring (subtle) */}
        <div
          className="absolute h-[180px] w-[180px] rounded-full border border-ink/[0.03]"
          style={{ animation: "orbitSpin 12s linear infinite" }}
        />
      </div>

      {/* ── 3D Carousel Stage ── */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="carousel-stage">
          {showcaseItems.map((item, idx) => {
            // Determine position class
            let positionClass = "card-hidden";
            if (idx === activeCard) {
              positionClass = "card-front";
            } else if (idx === (activeCard + 1) % 3) {
              positionClass = "card-right";
            } else if (idx === (activeCard + 2) % 3) {
              positionClass = "card-left";
            }

            // Determine if collapsing for exit animation class
            const disappearClass = isCollapsing ? `animate-disappear-card-${idx}` : "";

            return (
              <div
                key={idx}
                onClick={() => {
                  if (idx !== activeCard) {
                    setActiveCard(idx);
                  }
                }}
                className={`carousel-card ${positionClass} ${disappearClass} w-[260px] select-none`}
                style={{
                  animation: idx === activeCard && !isCollapsing ? "heroFloat 6s ease-in-out infinite" : "none",
                }}
              >
                {/* Card design */}
                <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-xl shadow-ink/5 transition duration-300 hover:border-ink/20">
                  {/* Category tag */}
                  <div className="mb-4 flex items-center justify-between">
                    <span
                      className="rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.tag}
                    </span>
                    <div className="flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5">
                      <Star className="h-3 w-3 fill-gold text-gold" />
                      <span className="text-[10px] font-bold text-ink/80">{item.rating}</span>
                    </div>
                  </div>

                  {/* Product image area */}
                  <div
                    className="relative mb-4 flex h-32 items-center justify-center rounded-2xl overflow-hidden"
                    style={{ backgroundColor: item.color + "12" }}
                  >
                    {/* Inner glow */}
                    <div
                      className="absolute h-20 w-20 rounded-full blur-[25px]"
                      style={{ backgroundColor: item.glow + "30" }}
                    />
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="relative h-full w-full object-cover transition-all duration-700 hover:scale-110"
                      />
                    ) : (
                      <item.icon
                        className="relative h-14 w-14 transition-all duration-700"
                        style={{
                          color: item.color,
                          filter: `drop-shadow(0 0 16px ${item.glow}40)`,
                        }}
                      />
                    )}
                    {/* Shine sweep */}
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      style={{ animation: "shineSweep 3s ease-in-out infinite" }}
                    />
                  </div>

                  {/* Details */}
                  <h4 className="text-sm font-bold text-ink leading-tight">{item.title}</h4>
                  <p className="mt-1 text-[11px] text-ink/55">{item.subtitle}</p>

                  {/* Price row */}
                  <div className="mt-3 flex items-center justify-between">
                    <p
                      className="text-xl font-black"
                      style={{ color: item.glow }}
                    >
                      {item.price}
                    </p>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                      {item.savings}
                    </span>
                  </div>

                  {/* Seller row */}
                  <div className="mt-3.5 flex items-center gap-2.5 border-t border-ink/10 pt-3.5">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.seller[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-ink/80 leading-tight">{item.seller}</p>
                      <p className="text-[9px] text-ink/45">{item.college}</p>
                    </div>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Carousel Prev/Next Buttons ── */}
      {!isCollapsing && (
        <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between z-20 pointer-events-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveCard((prev) => (prev - 1 + 3) % 3);
            }}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-white shadow-sm text-ink/70 hover:bg-ink/5 hover:text-ink transition duration-200"
            title="Previous Item"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveCard((prev) => (prev + 1) % 3);
            }}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-white shadow-sm text-ink/70 hover:bg-ink/5 hover:text-ink transition duration-200"
            title="Next Item"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}



      {/* ── Live indicator ── */}
      <div className={`absolute left-4 top-0 flex items-center gap-2 rounded-full border border-ink/10 bg-white shadow-sm px-4 py-2 backdrop-blur-xl ${isCollapsing ? "animate-disappear-badge-3" : ""}`}>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[11px] font-semibold text-ink/65">Live</span>
      </div>



      {/* ── Progress dots ── */}
      <div className={`absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-2.5 transition-all duration-500 ${isCollapsing ? "opacity-0 scale-90" : "opacity-100"}`}>
        {showcaseItems.map((item, i) => (
          <button
            key={i}
            onClick={() => setActiveCard(i)}
            className="relative h-2 rounded-full transition-all duration-500"
            style={{
              width: i === activeCard ? "2rem" : "0.5rem",
              backgroundColor: i === activeCard ? item.color : "rgba(19,35,47,0.15)",
              boxShadow: i === activeCard ? `0 0 8px ${item.color}50` : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}



function AnimatedCounter({ label, value, suffix = "" }) {
  const [ref, visible] = useScrollReveal(0.3);
  const numericPart = parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
  const counted = useCountUp(numericPart, 2200, visible);
  const displaySuffix = value.replace(/[0-9]/g, "");

  return (
    <div
      ref={ref}
      className={`group relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-7 shadow-soft backdrop-blur-sm transition-all duration-700 hover:-translate-y-2 hover:shadow-xl ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
    >
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-accent/10 to-gold/10 blur-2xl transition-transform duration-500 group-hover:scale-150" />
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink/40">
        {label}
      </p>
      <p className="relative mt-3 text-5xl font-black tracking-tight text-accent">
        {counted}
        {displaySuffix}
      </p>
    </div>
  );
}

function StepCard({ step, index, visible }) {
  const icons = [Search, Package, Handshake];
  const Icon = icons[index] || Zap;
  const colors = [
    "from-accent to-orange-500",
    "from-pine to-emerald-500",
    "from-indigo-500 to-violet-500",
  ];

  return (
    <div
      className={`group relative rounded-3xl border border-white/60 bg-white/70 p-8 shadow-soft backdrop-blur-sm transition-all duration-700 hover:-translate-y-3 hover:shadow-xl ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-12 opacity-0"
      }`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      {/* Step number badge */}
      <div
        className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${colors[index]} text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}
      >
        <Icon className="h-7 w-7" />
      </div>
      {/* Connector line */}
      {index < 2 && (
        <div className="absolute -right-8 top-1/2 hidden h-0.5 w-16 bg-gradient-to-r from-ink/10 to-transparent lg:block" />
      )}
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/5 text-xs font-bold text-ink/50">
          {index + 1}
        </span>
        <h3 className="text-xl font-bold text-ink">{step.title}</h3>
      </div>
      <p className="text-sm leading-relaxed text-ink/60">{step.description}</p>
    </div>
  );
}

function TestimonialCard({ testimonial, visible, delay }) {
  return (
    <div
      className={`rounded-3xl border border-white/60 bg-white/70 p-7 shadow-soft backdrop-blur-sm transition-all duration-700 hover:-translate-y-2 hover:shadow-xl ${
        visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="mb-4 flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className="h-4 w-4 fill-gold text-gold"
          />
        ))}
      </div>
      <p className="mb-5 text-sm leading-relaxed text-ink/70 italic">
        "{testimonial.text}"
      </p>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-gold text-sm font-bold text-white">
          {testimonial.name[0]}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{testimonial.name}</p>
          <p className="text-xs text-ink/50">{testimonial.college}</p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, gradient, index, visible }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-8 shadow-soft backdrop-blur-sm transition-all duration-700 hover:-translate-y-3 hover:shadow-xl ${
        visible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
      }`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30"
           style={{ backgroundImage: `linear-gradient(to bottom right, ${gradient})` }} />
      <div
        className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg text-white transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
        style={{ backgroundImage: `linear-gradient(to bottom right, ${gradient})` }}
      >
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mb-3 text-xl font-bold text-ink">{title}</h3>
      <p className="text-sm leading-relaxed text-ink/60">{description}</p>
    </div>
  );
}

/* ──────────────────────────── static data ──────────────────────────────── */

const howItWorksSteps = [
  {
    title: "Discover",
    description:
      "Browse items from your campus, city, or across the country. Filter by category, price range, and rental duration.",
  },
  {
    title: "Connect",
    description:
      "Chat directly with verified student sellers. Negotiate, ask questions, and arrange hassle‑free pickup or delivery.",
  },
  {
    title: "Transact",
    description:
      "Complete secure checkouts with flexible pricing — rent by the day or buy second-hand at a fraction of retail.",
  },
];

const testimonials = [
  {
    name: "Priya Sharma",
    college: "IIT Delhi",
    text: "Saved ₹4,000 on textbooks last semester by renting instead of buying. The campus filter is a game‑changer!",
  },
  {
    name: "Arjun Mehta",
    college: "BITS Pilani",
    text: "Listed my old guitar and found a buyer within 2 hours. The verified student profiles make every deal feel safe.",
  },
  {
    name: "Sneha Reddy",
    college: "NIT Trichy",
    text: "I rent lab equipment for just the weeks I need it. RentEd literally pays for itself in savings.",
  },
];

const features = [
  {
    icon: Wallet,
    title: "Flexible Pricing",
    description:
      "Rent short-term or buy second-hand — choose whichever saves you more for textbooks, equipment, and daily campus needs.",
    gradient: "#ec6f36, #f2c66d",
  },
  {
    icon: ShieldCheck,
    title: "Verified & Trusted",
    description:
      "Every profile carries college ID verification, ratings, and transparent activity history for safe student-to-student deals.",
    gradient: "#275245, #34d399",
  },
  {
    icon: Compass,
    title: "Hyperlocal Matching",
    description:
      "Find the closest available listings by campus area, city, or pin code — nearby suggestions show up first, always.",
    gradient: "#6366f1, #8b5cf6",
  },
  {
    icon: MessageCircle,
    title: "Real-Time Chat",
    description:
      "Message sellers directly, negotiate prices, and arrange pickup — all within the platform, no phone numbers needed.",
    gradient: "#0ea5e9, #06b6d4",
  },
  {
    icon: TrendingUp,
    title: "Smart Recommendations",
    description:
      "Personalized feed based on your college, courses, and browsing history. Discover what students near you actually need.",
    gradient: "#f43f5e, #ec6f36",
  },
  {
    icon: Users,
    title: "Community Powered",
    description:
      "Built by students, for students. Join a growing circular economy that reduces waste and builds campus connections.",
    gradient: "#8b5cf6, #d946ef",
  },
];

/* ───────────────────────── typewriter text cycling ─────────────────────── */

const heroWords = ["Textbooks", "Equipment", "Rooms", "Essentials", "Lab Gear"];

function useTypewriter(words, typingSpeed = 100, deletingSpeed = 60, pause = 2000) {
  const [display, setDisplay] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];
    let timeout;

    if (!isDeleting && display === currentWord) {
      timeout = setTimeout(() => setIsDeleting(true), pause);
    } else if (isDeleting && display === "") {
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % words.length);
    } else {
      timeout = setTimeout(
        () => {
          setDisplay(
            isDeleting
              ? currentWord.substring(0, display.length - 1)
              : currentWord.substring(0, display.length + 1)
          );
        },
        isDeleting ? deletingSpeed : typingSpeed
      );
    }
    return () => clearTimeout(timeout);
  }, [display, isDeleting, wordIndex, words, typingSpeed, deletingSpeed, pause]);

  return display;
}

/* ══════════════════════════════ MAIN PAGE ═══════════════════════════════ */

function HomePage() {
  const { user } = useAuth();
  const typedWord = useTypewriter(heroWords);
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [searchCampus, setSearchCampus] = useState(user?.collegeName || "");
  const [activeHeroTab, setActiveHeroTab] = useState("Popular");
  const [isTabChanging, setIsTabChanging] = useState(false);
  const [heroState, setHeroState] = useState("visible"); // 'visible' | 'collapsing' | 'collapsed' | 'expanding'
  const [videoLoaded, setVideoLoaded] = useState(false);

  const handleCollapse = () => {
    setHeroState("collapsing");
    setTimeout(() => {
      setHeroState("collapsed");
    }, 850); // Matches CSS transition duration
  };

  const handleExpand = () => {
    setHeroState("expanding");
    setTimeout(() => {
      setHeroState("visible");
    }, 20);
  };

  const handleTabChange = (tabName) => {
    if (tabName === activeHeroTab) return;
    setIsTabChanging(true);
    setTimeout(() => {
      setActiveHeroTab(tabName);
      setIsTabChanging(false);
    }, 180);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setHeroState("collapsing");
    setTimeout(() => {
      setHeroState("collapsed");
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (searchCategory) params.append("category", searchCategory);
      if (searchCampus) params.append("collegeName", searchCampus);
      navigate(`/marketplace?${params.toString()}`);
    }, 850); // Delayed to allow choreographed exit animation to run
  };

  const [collegeItems, setCollegeItems] = useState([]);
  const [cityItems, setCityItems] = useState([]);
  const [nearbyItems, setNearbyItems] = useState([]);
  const [trendingItems, setTrendingItems] = useState([]);
  const [nationwideItems, setNationwideItems] = useState([]);

  /* ─── scroll‑reveal refs ─── */
  const [heroRef, heroVisible] = useScrollReveal(0.1);
  const [stepsRef, stepsVisible] = useScrollReveal(0.15);
  const [featuresRef, featuresVisible] = useScrollReveal(0.1);
  const [testimonialsRef, testimonialsVisible] = useScrollReveal(0.15);
  const [ctaRef, ctaVisible] = useScrollReveal(0.2);

  const browserLoc = useCurrentLocation();

  useEffect(() => {
    if (user && browserLoc.latitude && browserLoc.longitude) {
      if (!user.latitude || !user.longitude || !user.geometry || user.geometry.coordinates[0] === 0) {
        locationApi
          .saveUserLocation({
            latitude: browserLoc.latitude,
            longitude: browserLoc.longitude,
          })
          .then((data) => {
            console.log("Logged-in user location automatically updated:", data.user);
          })
          .catch((err) => console.error("Auto-saving user location failed:", err));
      }
    }
  }, [user, browserLoc.latitude, browserLoc.longitude]);

  useEffect(() => {
    itemApi.list({ limit: 4 }).then(setTrendingItems).catch(() => {});
    itemApi.list({ limit: 8 }).then(setNationwideItems).catch(() => {});

    if (user) {
      if (user.collegeName) {
        itemApi
          .list({ collegeName: user.collegeName, limit: 4 })
          .then(setCollegeItems)
          .catch(() => {});
      }
      if (user.city) {
        itemApi
          .list({ city: user.city, limit: 8 })
          .then((res) =>
            setCityItems(
              res
                .filter((i) => i.collegeName !== user.collegeName)
                .slice(0, 4)
            )
          )
          .catch(() => {});
      }
    }

    const activeLat = browserLoc.latitude || user?.latitude || user?.geometry?.coordinates?.[1];
    const activeLng = browserLoc.longitude || user?.longitude || user?.geometry?.coordinates?.[0];

    if (activeLat && activeLng) {
      itemApi
        .list({
          lat: activeLat,
          lng: activeLng,
          radius: 50,
          limit: 4,
        })
        .then(setNearbyItems)
        .catch(() => {});
    }
  }, [user, browserLoc.latitude, browserLoc.longitude]);

  /* ─── render helpers ─── */
  const renderSection = (title, icon, items, viewAllLink) => {
    if (!items || items.length === 0) return null;


    return (
      <div className="group rounded-3xl border border-white/60 bg-white/70 p-7 shadow-soft backdrop-blur-sm transition-all duration-500 hover:shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-ink/5 to-ink/10">
              {icon}
            </div>
            <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
          </div>
          {viewAllLink && (
            <Link
              to={viewAllLink}
              className="flex items-center gap-2 rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-accent transition-all hover:border-accent/30 hover:bg-accent/5 hover:gap-3"
            >
              Browse all <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <ItemCard key={item._id} item={item} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-16 pb-8">
      {/* ════════════════════════════ HERO ════════════════════════════ */}
      {heroState === "collapsed" ? (
        <div 
          className="flex items-center justify-between rounded-3xl border border-white/60 bg-white/70 p-6 shadow-soft backdrop-blur-sm transition-all duration-500 hover:shadow-md"
          style={{ animation: "fadeSlideUp 0.5s ease-out" }}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-gold text-white shadow-md">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">RentEd Campus Marketplace</p>
              <p className="text-xs text-ink/50">Save semesters by renting and buying second-hand essentials.</p>
            </div>
          </div>
          <button
            onClick={handleExpand}
            className="flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-xs font-bold text-accent hover:border-accent/30 hover:bg-accent/5 hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm"
          >
            <Maximize2 className="h-4 w-4" />
            Show Banner
          </button>
        </div>
      ) : (
        <section
          ref={heroRef}
          className={`hero-transition relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#e8f2ee] via-[#f7f5ef] to-[#f4ebe1] border border-emerald-900/5 shadow-2xl shadow-emerald-900/5 ${
            heroState === "collapsing" ? "hero-collapsing" : ""
          } ${
            heroState === "visible" && heroVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          {/* Collapse/Minimize Banner Button */}
          {heroState !== "collapsing" && (
            <button
              onClick={handleCollapse}
              className="absolute right-6 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-ink/5 text-ink/50 hover:bg-ink/10 hover:text-ink hover:scale-105 active:scale-95 transition duration-200"
              title="Minimize Header Banner"
            >
              <Minimize2 className="h-5 w-5" />
            </button>
          )}

          {/* Animated Mesh Gradients - Color shifting drift orbs */}
          <div className={`pointer-events-none absolute inset-0 overflow-hidden z-0 ${heroState === 'collapsing' ? 'animate-disappear-orbs' : ''}`}>
            {/* Orb 1: Orange Accent (Top Left) */}
            <div 
              className="absolute -left-20 -top-20 h-[380px] w-[380px] rounded-full bg-accent/8 blur-[110px] mix-blend-multiply"
              style={{ animation: "meshDrift1 18s ease-in-out infinite" }}
            />
            {/* Orb 2: Emerald Green (Center-Right) */}
            <div 
              className="absolute right-1/4 top-1/4 h-[340px] w-[340px] rounded-full bg-emerald-600/6 blur-[100px] mix-blend-multiply"
              style={{ animation: "meshDrift2 14s ease-in-out infinite" }}
            />
            {/* Orb 3: Purple/Indigo (Bottom Right) */}
            <div 
              className="absolute -right-20 -bottom-20 h-[480px] w-[480px] rounded-full bg-violet-600/8 blur-[130px] mix-blend-multiply"
              style={{ animation: "meshDrift1 22s ease-in-out infinite reverse" }}
            />
            {/* Orb 4: Warm Gold (Bottom Left) */}
            <div 
              className="absolute left-1/3 bottom-10 h-[300px] w-[300px] rounded-full bg-gold/8 blur-[90px] mix-blend-multiply"
              style={{ animation: "meshDrift2 16s ease-in-out infinite reverse" }}
            />
            {/* Radial overlay to darken edges */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(247,243,234,0.65)_85%)]" />
          </div>

          {/* Video Background Layer */}
          <video
            autoPlay
            loop
            muted
            playsInline
            onCanPlay={() => setVideoLoaded(true)}
            className={`pointer-events-none absolute inset-0 h-full w-full object-cover z-0 transition-all duration-[1500ms] ${
              videoLoaded && heroState !== "collapsing" ? "opacity-[0.65] scale-100" : "opacity-0 scale-105"
            }`}
          >
            <source src="/videos/hero-bg.mp4" type="video/mp4" />
          </video>

          {/* Grid pattern overlay */}
          <div
            className={`pointer-events-none absolute inset-0 opacity-[0.025] ${heroState === 'collapsing' ? 'animate-disappear-orbs' : ''}`}
            style={{
              backgroundImage:
                "linear-gradient(rgba(19,35,47,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(19,35,47,0.1) 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />

          <div className="relative z-10 grid gap-10 px-6 py-12 sm:px-10 lg:grid-cols-12 lg:gap-8 lg:p-14 xl:p-16">
            
            {/* ── Left Column: Headline & Search Widget ── */}
            <div className="flex flex-col justify-center lg:col-span-6 space-y-6">
              <div className={`flex items-center gap-2 ${heroState === 'collapsing' ? 'animate-disappear-left-title' : ''}`}>
                <span className="h-1 w-8 rounded-full bg-accent" />
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Campus Marketplace</span>
              </div>

              <h1 className={`text-4xl font-black leading-[1.1] text-ink sm:text-5xl xl:text-6xl tracking-tight ${
                heroState === 'collapsing' ? 'animate-disappear-left-title' : ''
              }`}>
                Rent Essentials.
                <br />
                Buy Second-Hand.
                <br />
                Save Semesters.
              </h1>

              <p className={`max-w-lg text-sm leading-relaxed text-ink/65 sm:text-base ${
                heroState === 'collapsing' ? 'animate-disappear-left-sub' : ''
              }`}>
                Skip the retail price tag. Rent temporary college essentials or buy second-hand gear from verified students right on your campus.
              </p>

              {/* Call to Actions for top of landing page */}
              {!user ? (
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    as={Link}
                    to="/signup"
                    variant="secondary"
                    className="!py-2.5 !px-5 text-sm font-bold shadow-md hover:scale-105 transition-all duration-200"
                  >
                    Get Started — It's Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    as={Link}
                    to="/login"
                    variant="ghost"
                    className="border border-ink/15 hover:bg-ink/5 !py-2.5 !px-5 text-sm font-bold transition-all duration-200"
                  >
                    Login to Account
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    as={Link}
                    to="/marketplace"
                    variant="secondary"
                    className="!py-2.5 !px-5 text-sm font-bold shadow-md hover:scale-105 transition-all duration-200"
                  >
                    Browse Marketplace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    as={Link}
                    to="/dashboard"
                    variant="ghost"
                    className="border border-ink/15 hover:bg-ink/5 !py-2.5 !px-5 text-sm font-bold transition-all duration-200"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              )}

              {/* ── Interactive Search & Filter Panel ── */}
              <form
                onSubmit={handleSearchSubmit}
                className={`w-full space-y-4 rounded-2xl border border-ink/10 bg-white/40 p-5 backdrop-blur-md shadow-xl shadow-ink/5 ${
                  heroState === 'collapsing' ? 'animate-disappear-left-search' : ''
                }`}
                style={{ animation: heroState !== 'collapsing' ? "fadeSlideUp 0.8s ease-out 0.3s both" : "none" }}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  
                  {/* Search input */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-ink/50">Search For</label>
                    <div className="relative flex items-center">
                      <Search className="absolute left-3.5 h-4.5 w-4.5 text-ink/40" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Books, cycles, tech..."
                        className="w-full rounded-xl border border-ink/15 bg-white/50 py-3 pl-11 pr-4 text-sm text-ink placeholder-ink/30 outline-none transition focus:border-accent focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Category select */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-ink/50">Category</label>
                    <div className="relative flex items-center">
                      <select
                        value={searchCategory}
                        onChange={(e) => setSearchCategory(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-ink/15 bg-white/50 py-3 px-3.5 text-sm text-ink/85 outline-none transition focus:border-accent focus:bg-white"
                      >
                        <option value="">All Categories</option>
                        <option value="Books">Books</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Bicycles">Bicycles</option>
                        <option value="Lab Gear">Lab Gear</option>
                        <option value="Rooms">Rooms</option>
                      </select>
                      <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-ink/40" />
                    </div>
                  </div>

                  {/* Campus input */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-ink/50">Campus Location</label>
                    <div className="relative flex items-center">
                      <MapPin className="absolute left-3.5 h-4.5 w-4.5 text-ink/40" />
                      <input
                        type="text"
                        value={searchCampus}
                        onChange={(e) => setSearchCampus(e.target.value)}
                        placeholder="Select campus..."
                        className="w-full rounded-xl border border-ink/15 bg-white/50 py-3 pl-11 pr-4 text-sm text-ink placeholder-ink/30 outline-none transition focus:border-accent focus:bg-white"
                      />
                    </div>
                  </div>

                </div>

                {/* Submit Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-ink/10">
                  {/* Popular suggestions */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink/50">
                    <span>Try:</span>
                    {[
                      { label: "Textbooks", query: "Chemistry", tab: "Books" },
                      { label: "Calculators", query: "CASIO", tab: "Electronics" },
                      { label: "Bicycles", query: "Cycle", tab: "Bicycles" }
                    ].map((tag) => (
                      <button
                        key={tag.label}
                        type="button"
                        onClick={() => {
                          setSearchQuery(tag.query);
                          setSearchCategory(tag.tab);
                          setActiveHeroTab(tag.tab);
                        }}
                        className="rounded-lg bg-ink/5 px-2.5 py-1 text-ink/65 hover:bg-ink/10 hover:text-ink transition"
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>

                  {/* Solid Orange Submit */}
                  <button
                    type="submit"
                    className="rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-white hover:bg-orange-500 hover:scale-[1.02] active:scale-[0.98] transition duration-200 flex items-center justify-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Find Items
                  </button>
                </div>
              </form>
            </div>

            {/* ── Right Column: 3D Rotating Carousel Hero Showcase ── */}
            <div 
              className="flex flex-col lg:col-span-6 space-y-4 justify-center"
            >
              <HeroShowcase heroState={heroState} />
            </div>
          </div>

          {/* ── Feature strip at bottom ── */}
          <div className={`relative z-10 border-t border-ink/[0.06] bg-ink/[0.015] backdrop-blur-sm ${
            heroState === "collapsing" ? "animate-disappear-strip" : ""
          }`}>
            <div className="grid grid-cols-2 divide-y divide-ink/[0.06] sm:divide-y-0 lg:grid-cols-4 divide-x divide-ink/[0.06]">
              {[
                { icon: ShieldCheck, title: "Verified Students Only", desc: "College ID checks on all accounts" },
                { icon: Wallet, title: "Flexible Student Deals", desc: "Rent daily, weekly, or buy outright" },
                { icon: Compass, title: "Hyper-local Pickup", desc: "Instantly trade on campus grounds" },
                { icon: Sparkles, title: "Circular Economy", desc: "Reduce wastage, save money" },
              ].map((feat, idx) => (
                <div key={idx} className="flex items-center gap-4 px-6 py-5 lg:px-8 lg:py-6 group transition-colors hover:bg-ink/[0.015]">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <feat.icon className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink/85">{feat.title}</p>
                    <p className="text-xs text-ink/45">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════ ANIMATED STATS ═══════════════════════ */}
      <section className="grid gap-5 sm:grid-cols-3">
        {landingStats.map((stat) => (
          <AnimatedCounter key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </section>

      {/* ════════════════════ ITEM LISTING SECTIONS ══════════════════ */}
      {user ? (
        <section className="space-y-8">
          {renderSection(
            "From Your College",
            <School className="h-7 w-7 text-indigo-600" />,
            collegeItems,
            "/marketplace"
          )}
          {renderSection(
            "Other Colleges in City",
            <MapPin className="h-7 w-7 text-orange-600" />,
            cityItems,
            "/marketplace"
          )}
          {renderSection(
            "Near You",
            <Navigation className="h-7 w-7 text-emerald-600" />,
            nearbyItems,
            "/marketplace"
          )}
          {renderSection(
            "Trending Resources",
            <Flame className="h-7 w-7 text-red-500" />,
            trendingItems,
            "/marketplace"
          )}
          {renderSection(
            "Explore Across India",
            <Globe className="h-7 w-7 text-blue-500" />,
            nationwideItems,
            "/marketplace"
          )}
        </section>
      ) : (
        <section className="space-y-8">
          {renderSection(
            "Trending Resources",
            <Flame className="h-7 w-7 text-red-500" />,
            trendingItems,
            "/marketplace"
          )}
          {renderSection(
            "Explore Across India",
            <Globe className="h-7 w-7 text-blue-500" />,
            nationwideItems,
            "/marketplace"
          )}
        </section>
      )}

      {/* ═══════════════════ HOW IT WORKS ════════════════════════════ */}
      <section ref={stepsRef}>
        <div className="mb-10 text-center">
          <span
            className={`mb-3 inline-block rounded-full bg-accent/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-accent transition-all duration-700 ${
              stepsVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            How it works
          </span>
          <h2
            className={`text-3xl font-black text-ink sm:text-4xl transition-all duration-700 delay-100 ${
              stepsVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            Three steps to smarter spending
          </h2>
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          {howItWorksSteps.map((step, i) => (
            <StepCard key={step.title} step={step} index={i} visible={stepsVisible} />
          ))}
        </div>
      </section>

      {/* ═══════════════════ FEATURES GRID ═══════════════════════════ */}
      <section ref={featuresRef}>
        <div className="mb-10 text-center">
          <span
            className={`mb-3 inline-block rounded-full bg-pine/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-pine transition-all duration-700 ${
              featuresVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            Why RentEd
          </span>
          <h2
            className={`text-3xl font-black text-ink sm:text-4xl transition-all duration-700 delay-100 ${
              featuresVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            Built for the campus lifestyle
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feat, i) => (
            <FeatureCard key={feat.title} {...feat} index={i} visible={featuresVisible} />
          ))}
        </div>
      </section>

      {/* ═══════════════════ TESTIMONIALS ════════════════════════════ */}
      <section ref={testimonialsRef}>
        <div className="mb-10 text-center">
          <span
            className={`mb-3 inline-block rounded-full bg-gold/20 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-ink/60 transition-all duration-700 ${
              testimonialsVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            Student stories
          </span>
          <h2
            className={`text-3xl font-black text-ink sm:text-4xl transition-all duration-700 delay-100 ${
              testimonialsVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            Loved by students across India
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <TestimonialCard
              key={t.name}
              testimonial={t}
              visible={testimonialsVisible}
              delay={i * 150}
            />
          ))}
        </div>
      </section>

      {/* ═══════════════════════ CTA ═════════════════════════════════ */}
      <section
        ref={ctaRef}
        className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-accent via-orange-500 to-gold p-10 text-center shadow-2xl shadow-accent/20 sm:p-14 lg:p-20 transition-all duration-1000 ${
          ctaVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-10 opacity-0 scale-95"
        }`}
      >
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full border-2 border-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full border-2 border-white/10" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />

        <div className="relative z-10">
          <h2 className="text-3xl font-black text-white sm:text-5xl">
            Ready to save this semester?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Join thousands of students already renting, buying, and selling on
            RentEd. Your campus economy starts here.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              as={Link}
              to={user ? "/marketplace" : "/signup"}
              className="!bg-white !text-accent !px-8 !py-4 !text-base !font-bold hover:!bg-orange-50 hover:scale-105 hover:shadow-xl transition-all duration-300"
            >
              {user ? "Browse Marketplace" : "Get Started — It's Free"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            {!user && (
              <Button
                as={Link}
                to="/login"
                className="border-2 border-white/30 !text-white hover:bg-white/10 !px-8 !py-4 !text-base transition-all duration-300"
                variant="ghost"
              >
                I have an account
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
