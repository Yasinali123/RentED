import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageSquare, X, Send, Sparkles, Search, CheckCircle2, ArrowRight, RefreshCw, AlertCircle, ShoppingBag, ShieldCheck } from "lucide-react";
import { wantedItemApi, getErrorMessage } from "../../api/client";
import { validateContent } from "../../utils/contentModeration";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";

const CATEGORIES = [
  "Books",
  "Calculators",
  "Topper Notes",
  "Engineering Books",
  "Medical Books",
  "Law Books",
  "Commerce Books",
  "Lab Equipment",
  "Electronics",
  "Hostel Essentials",
  "Furniture",
  "Room / PG Listings",
  "Other",
];

function DemandAssistantChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  
  // Conversation state
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Books");
  const [selectedRequestType, setSelectedRequestType] = useState(null); // "BUY" | "RENT" | null
  const [pendingItemName, setPendingItemName] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [createdDemand, setCreatedDemand] = useState(null);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Reset or initialize chatbot conversation
  const resetChat = () => {
    setMessages([
      {
        id: 1,
        sender: "bot",
        text: `Hi ${user?.name ? user.name.split(" ")[0] : "there"}! What item are you looking for on campus today?`,
        type: "initial",
      },
    ]);
    setInputQuery("");
    setSelectedRequestType(null);
    setPendingItemName("");
    setSearchResults(null);
    setCreatedDemand(null);
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      resetChat();
    }
  }, [isOpen]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const query = inputQuery.trim();
    if (!query) return;

    // Add user message
    const userMsgId = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text: query },
    ]);
    setInputQuery("");

    // Validate content for explicit, abusive, sexual, or irrelevant words
    const validation = validateContent(query);
    if (!validation.isValid) {
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId + 1,
          sender: "bot",
          text: `🚫 ${validation.reason}`,
          type: "moderation_blocked",
        },
      ]);
      return;
    }

    setPendingItemName(query);

    // If request type is not selected yet, ask BUY vs RENT first
    if (!selectedRequestType) {
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId + 1,
          sender: "bot",
          text: `Got it! Are you looking to BUY or RENT "${query}"?`,
          type: "choose_type",
          itemName: query,
        },
      ]);
      return;
    }

    // Proceed to search inventory
    await executeInventorySearch(query, selectedRequestType, selectedCategory);
  };

  const handleSelectRequestType = async (type, queryOverride = null) => {
    const targetType = type;
    const targetQuery = queryOverride || pendingItemName;
    setSelectedRequestType(targetType);

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: "user", text: `I want to ${targetType}` },
    ]);

    if (targetQuery) {
      await executeInventorySearch(targetQuery, targetType, selectedCategory);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: `Awesome! What is the name of the item you want to ${targetType}?`,
        },
      ]);
    }
  };

  const executeInventorySearch = async (query, reqType, cat) => {
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        sender: "bot",
        text: `Searching RentED inventory for "${query}" (${reqType})...`,
        type: "searching",
      },
    ]);

    try {
      const res = await wantedItemApi.search({
        query,
        category: cat,
        requestType: reqType,
      });

      setSearchResults(res);

      if (res.found && res.items.length > 0) {
        setMessages((prev) => [
          ...prev.filter((m) => m.type !== "searching"),
          {
            id: Date.now() + 2,
            sender: "bot",
            text: `Great news! I found ${res.items.length} available matching listing${res.items.length > 1 ? "s" : ""} on RentED:`,
            type: "results_found",
            items: res.items,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev.filter((m) => m.type !== "searching"),
          {
            id: Date.now() + 2,
            sender: "bot",
            text: `I couldn't find "${query}" currently available for ${reqType} on RentED.`,
            type: "results_not_found",
            itemName: query,
            reqType: reqType,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev.filter((m) => m.type !== "searching"),
        {
          id: Date.now() + 2,
          sender: "bot",
          text: `Oops! Something went wrong searching inventory: ${getErrorMessage(err)}`,
          type: "error",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDemand = async (itemNameOverride, reqTypeOverride) => {
    if (!user) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "bot",
          text: "Please log in to RentED so we can create your demand request and notify relevant sellers on campus.",
          type: "require_login",
        },
      ]);
      return;
    }

    const itemName = itemNameOverride || pendingItemName;
    const requestType = reqTypeOverride || selectedRequestType || "RENT";

    const validation = validateContent(itemName);
    if (!validation.isValid) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "bot",
          text: `🚫 ${validation.reason}`,
          type: "moderation_blocked",
        },
      ]);
      return;
    }

    setLoading(true);
    try {
      const res = await wantedItemApi.create({
        itemName,
        category: selectedCategory,
        requestType,
        description: `Requested via RentED Demand Assistant by ${user.name}`,
        collegeName: user.collegeName || user.college,
        location: user.location,
        city: user.city,
      });

      setCreatedDemand(res.wantedItem);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "bot",
          text: `🎉 Request created successfully!\nRentED is looking for someone who can provide this item.\n\n📧 ${res.notifiedCount} relevant RentED users have been notified via email & dashboard alerts.`,
          type: "demand_created",
          wantedItem: res.wantedItem,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "bot",
          text: `Notice: ${getErrorMessage(err)}`,
          type: "error",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 select-none">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-accent via-indigo-600 to-accent/90 px-5 py-3.5 text-white font-extrabold text-xs shadow-xl shadow-accent/25 hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20"
          aria-label="Open RentED Demand Assistant"
        >
          <div className="relative flex items-center justify-center">
            <img src="/logo-icon.png" alt="RentEd Logo" className="h-6 w-auto object-contain drop-shadow-sm" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
            </span>
          </div>
          <span className="tracking-wide font-black">Need something?</span>
          <span className="hidden sm:inline-block text-[10px] bg-white/20 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Ask RentED
          </span>
        </button>
      )}

      {/* Floating Chat Modal Panel */}
      {isOpen && (
        <div className="flex flex-col w-[92vw] sm:w-[410px] h-[580px] max-h-[85vh] rounded-3xl bg-white border border-ink/10 shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-accent via-indigo-600 to-accent/90 p-4 text-white flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-2xl bg-white/95 border border-white/30 flex items-center justify-center shrink-0 shadow-inner p-1.5">
                <img src="/logo-icon.png" alt="RentEd Logo" className="h-7 w-auto object-contain" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-sm tracking-wide text-white truncate">RentED Demand Assistant</h3>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Online" />
                </div>
                <p className="text-[10px] text-white/80 font-medium truncate">
                  Inventory Search & Seller Matching Engine
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={resetChat}
                className="p-1.5 rounded-full hover:bg-white/15 text-white/80 transition"
                title="Reset conversation"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/15 text-white/80 transition"
                title="Close Assistant"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Sub-Header Category Selector */}
          <div className="bg-canvas border-b border-ink/5 px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs">
            <span className="text-[10px] font-black uppercase text-ink/40 shrink-0">Category:</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 transition-colors ${
                  selectedCategory === cat
                    ? "bg-accent text-white shadow-xs"
                    : "bg-white border border-ink/10 text-ink/65 hover:bg-mist"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-mist/20">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} space-y-2`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-accent text-white font-medium rounded-br-xs shadow-sm"
                      : "bg-white border border-ink/10 text-ink shadow-xs rounded-bl-xs"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {/* BUY / RENT Action Buttons */}
                {msg.type === "choose_type" && (
                  <div className="flex gap-2 pt-1 animate-fadeIn">
                    <button
                      onClick={() => handleSelectRequestType("RENT", msg.itemName)}
                      className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-xs rounded-full hover:bg-indigo-100 transition shadow-xs flex items-center gap-1.5"
                    >
                      🏷️ RENT
                    </button>
                    <button
                      onClick={() => handleSelectRequestType("BUY", msg.itemName)}
                      className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-xs rounded-full hover:bg-emerald-100 transition shadow-xs flex items-center gap-1.5"
                    >
                      🛍️ BUY
                    </button>
                  </div>
                )}

                {/* Search Results Display */}
                {msg.type === "results_found" && msg.items && (
                  <div className="w-full space-y-2.5 pt-1 animate-fadeIn">
                    {msg.items.map((item) => (
                      <div
                        key={item._id}
                        className="panel p-3 bg-white border border-accent/20 rounded-2xl flex items-center justify-between gap-3 shadow-xs hover:border-accent transition"
                      >
                        <img
                          src={item.image || "https://placehold.co/100x100?text=Item"}
                          alt={item.title}
                          className="h-12 w-12 rounded-xl object-cover shrink-0 border bg-mist"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-ink truncate">{item.title}</h4>
                          <p className="text-[10px] text-ink/55 truncate">
                            Seller: {item.owner?.name} • {item.collegeName || item.city}
                          </p>
                          <p className="text-[10px] font-black text-accent mt-0.5">
                            {item.listingType === "rent" ? `Rs. ${item.rentalPrice}/day (Rent)` : item.listingType === "sale" ? `Rs. ${item.salePrice} (Sale)` : `Rs. ${item.rentalPrice}/day (Rent) | Rs. ${item.salePrice} (Buy)`}
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          className="text-[10px] py-1.5 px-3 rounded-full shrink-0 font-bold"
                          onClick={() => {
                            setIsOpen(false);
                            navigate(`/items/${item._id}`);
                          }}
                        >
                          View Item
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Not Found CTA Options */}
                {msg.type === "results_not_found" && (
                  <div className="flex flex-col gap-2 pt-1 w-full animate-fadeIn">
                    <p className="text-[11px] text-ink/65 font-bold">
                      Would you like me to notify relevant RentED users who may have it?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleCreateDemand(msg.itemName, msg.reqType)}
                        className="px-4 py-2.5 bg-gradient-to-r from-accent to-indigo-600 text-white font-extrabold text-xs rounded-full shadow-md hover:scale-[1.02] transition flex items-center gap-1.5"
                        disabled={loading}
                      >
                        <CheckCircle2 className="h-4 w-4 text-amber-300" />
                        YES, FIND IT FOR ME
                      </button>
                      <button
                        onClick={() => {
                          setInputQuery("");
                          setMessages((prev) => [
                            ...prev,
                            { id: Date.now(), sender: "bot", text: "What item would you like to search for again?" },
                          ]);
                        }}
                        className="px-4 py-2.5 bg-white border border-ink/15 text-ink font-bold text-xs rounded-full hover:bg-mist transition"
                      >
                        SEARCH AGAIN
                      </button>
                    </div>
                  </div>
                )}

                {/* Demand Request Created Confirmation */}
                {msg.type === "demand_created" && (
                  <div className="w-full pt-1 animate-fadeIn">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        navigate("/dashboard?tab=my-requests");
                      }}
                      className="w-full py-2.5 px-4 bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-100 transition"
                    >
                      <ShoppingBag className="h-4 w-4 text-emerald-600" />
                      VIEW MY DEMAND REQUESTS →
                    </button>
                  </div>
                )}

                {/* Require Login Link */}
                {msg.type === "require_login" && (
                  <div className="pt-1 animate-fadeIn">
                    <Button
                      variant="primary"
                      className="text-xs py-2 px-4 rounded-full"
                      onClick={() => {
                        setIsOpen(false);
                        navigate("/login");
                      }}
                    >
                      Log In to RentED
                    </Button>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-ink/10 flex items-center gap-2 shrink-0">
            <input
              type="text"
              placeholder="Type item name (e.g. Scientific calculator...)"
              className="flex-1 bg-mist/60 border border-ink/10 rounded-full px-4 py-2.5 text-xs text-ink placeholder:text-ink/40 outline-none focus:border-accent transition"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="h-9 w-9 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-40 hover:scale-105 active:scale-95 transition shrink-0"
              aria-label="Send Message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default DemandAssistantChat;
