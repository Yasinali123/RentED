import { useState, useEffect, useRef } from "react";
import { Search, Clock, TrendingUp, Sparkles, X, ChevronRight } from "lucide-react";
import { searchApi } from "../../api/client";

function SearchAutocomplete({ initialValue = "", onSearch, placeholder = "Search textbooks, colleges, sellers..." }) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const [popular, setPopular] = useState([]);
  const [trending, setTrending] = useState([]);
  const [recent, setRecent] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("rented_recent_searches");
    if (saved) {
      try {
        setRecent(JSON.parse(saved).slice(0, 5));
      } catch (e) {
        setRecent([]);
      }
    }
  }, []);

  // Sync initialValue changes
  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  // Fetch popular and trending keywords once on mount
  const fetchMetadata = async () => {
    try {
      const res = await searchApi.suggestions({ q: "" });
      setPopular(res.popular || []);
      setTrending(res.trending || []);
    } catch (err) {
      console.error("Failed loading search suggestions metadata:", err);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  // Debounced autocomplete suggestions retrieval
  useEffect(() => {
    if (query.trim().length === 0) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    const delayTimer = setTimeout(async () => {
      try {
        const res = await searchApi.suggestions({ q: query.trim() });
        setSuggestions(res.suggestions || []);
        setActiveIndex(-1);
      } catch (err) {
        console.error("Autocompleting error:", err);
      }
    }, 300);

    return () => clearTimeout(delayTimer);
  }, [query]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Save search keyword to local history
  const saveRecentSearch = (term) => {
    const cleaned = term.trim();
    if (!cleaned) return;
    const updated = [cleaned, ...recent.filter((r) => r.toLowerCase() !== cleaned.toLowerCase())].slice(0, 5);
    setRecent(updated);
    localStorage.setItem("rented_recent_searches", JSON.stringify(updated));
  };

  const handleDeleteRecent = (e, term) => {
    e.stopPropagation();
    const updated = recent.filter((r) => r !== term);
    setRecent(updated);
    localStorage.setItem("rented_recent_searches", JSON.stringify(updated));
  };

  // Keyboard navigation & search triggering
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      e.target.blur();
      return;
    }

    const itemsCount = query.trim() ? suggestions.length : (recent.length + popular.length + trending.length);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev < itemsCount - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : itemsCount - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && activeIndex >= 0) {
        // Resolve target selection depending on state
        if (query.trim() && suggestions[activeIndex]) {
          handleSelectSuggestion(suggestions[activeIndex].text);
        } else {
          // Resolve standard entries index
          const allItems = [...recent, ...popular, ...trending];
          if (allItems[activeIndex]) {
            handleSelectSuggestion(allItems[activeIndex]);
          }
        }
      } else {
        handleTriggerSearch(query);
      }
    }
  };

  const handleTriggerSearch = async (term) => {
    const cleaned = term.trim();
    setIsOpen(false);
    saveRecentSearch(cleaned);
    
    // Log search query in backend
    try {
      await searchApi.logQuery({ query: cleaned });
    } catch (e) {
      console.error("Failed to log search query:", e);
    }

    if (onSearch) {
      onSearch(cleaned);
    }
  };

  const handleSelectSuggestion = (term) => {
    setQuery(term);
    handleTriggerSearch(term);
  };

  // Render icons matching types
  const getBadgeColor = (type) => {
    switch (type) {
      case "category": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "college": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "seller": return "bg-amber-50 text-amber-700 border-amber-200";
      case "tag": return "bg-purple-50 text-purple-700 border-purple-200";
      default: return "bg-canvas text-ink/65 border-ink/10";
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Bar */}
      <div className="relative flex items-center w-full">
        <Search className="absolute left-3.5 h-4.5 w-4.5 text-ink/40 pointer-events-none" />
        <input
          type="text"
          className="input pl-10 pr-8 w-full py-2 bg-canvas/30 border-ink/10 rounded-full text-xs font-semibold focus:bg-white transition-all shadow-inner"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setSuggestions([]);
            }}
            className="absolute right-3.5 text-ink/45 hover:text-ink transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Options Dropdown Container */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-ink/10 rounded-3xl shadow-2xl z-[9999] overflow-hidden divide-y divide-ink/5 animate-fadeIn max-h-[380px] overflow-y-auto">
          
          {/* Active input suggestions */}
          {query.trim() && suggestions.length > 0 && (
            <div className="py-2.5">
              {suggestions.map((s, idx) => (
                <button
                  key={`${s.type}:${s.text}:${idx}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(s.text)}
                  className={`w-full px-5 py-2.5 flex items-center justify-between text-left text-xs font-semibold transition-colors ${
                    activeIndex === idx ? "bg-accent/5 text-accent" : "text-ink hover:bg-canvas/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Search className="h-3.5 w-3.5 text-ink/35" />
                    <span
                      dangerouslySetInnerHTML={{ __html: s.highlighted }}
                      className="line-clamp-1"
                    />
                  </div>
                  <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full border ${getBadgeColor(s.type)}`}>
                    {s.type}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Fallback metadata: Popular, Recent and Trending */}
          {!query.trim() && (
            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-ink/5 bg-canvas/15">
              {/* Recent searches history */}
              {recent.length > 0 && (
                <div className="flex-1 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-ink/40 tracking-wider">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Recent Searches</span>
                  </div>
                  <div className="space-y-1.5">
                    {recent.map((r, idx) => (
                      <div
                        key={r}
                        onClick={() => handleSelectSuggestion(r)}
                        className={`group px-3 py-1.5 flex items-center justify-between rounded-xl cursor-pointer text-xs font-semibold text-ink/75 hover:bg-white hover:text-accent border border-transparent hover:border-ink/5 transition-all ${
                          activeIndex === idx ? "bg-white text-accent border-ink/5" : ""
                        }`}
                      >
                        <span className="truncate">{r}</span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteRecent(e, r)}
                          className="text-ink/30 hover:text-red-500 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches */}
              {popular.length > 0 && (
                <div className="flex-1 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-ink/40 tracking-wider">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Popular Searches</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {popular.map((p, idx) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleSelectSuggestion(p)}
                        className={`text-xs font-semibold px-3 py-1 rounded-full border border-ink/10 bg-white hover:bg-accent/5 hover:border-accent hover:text-accent transition-colors ${
                          activeIndex === (recent.length + idx) ? "bg-accent/5 border-accent text-accent" : "text-ink/80"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending queries */}
              {trending.length > 0 && (
                <div className="flex-1 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-ink/40 tracking-wider">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Trending Now</span>
                  </div>
                  <div className="space-y-1">
                    {trending.map((t, idx) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleSelectSuggestion(t)}
                        className={`w-full px-3 py-1.5 flex items-center justify-between rounded-xl text-left text-xs font-semibold hover:bg-white text-ink/85 hover:text-accent transition-all ${
                          activeIndex === (recent.length + popular.length + idx) ? "bg-white text-accent" : ""
                        }`}
                      >
                        <span className="truncate">{t}</span>
                        <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty search matches fallbacks */}
          {query.trim() && suggestions.length === 0 && (
            <div className="p-8 text-center space-y-1">
              <Search className="h-8 w-8 text-ink/20 mx-auto" />
              <p className="text-xs font-bold text-ink/65">No direct matches found</p>
              <p className="text-[10px] text-ink/40 leading-normal">
                Press Enter to run a global text search for "{query}"
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default SearchAutocomplete;
