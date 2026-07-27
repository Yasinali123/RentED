import { useState } from "react";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import SearchAutocomplete from "../ui/SearchAutocomplete";

function ItemFilters({ filters, onChange }) {
  const { user } = useAuth();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  return (
    <div className="panel p-4 sm:p-5 space-y-4">
      {/* Mobile Filter Toggle Header */}
      <div className="flex items-center justify-between md:hidden">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink bg-canvas px-4 py-2.5 rounded-2xl border border-ink/10 w-full justify-between min-h-[44px]"
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-accent" /> Filter Marketplace Listings
          </span>
          {showMobileFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Filter Options Grid */}
      <div className={`grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 items-end ${showMobileFilters ? "block" : "hidden md:grid"}`}>
        <div className="sm:col-span-2 md:col-span-3 lg:col-span-2 relative">
          <label className="text-xs font-bold uppercase text-ink/50 mb-1 block">Search</label>
          <SearchAutocomplete
            initialValue={filters.q}
            onSearch={(val) => onChange({ ...filters, q: val })}
            placeholder="Search keywords..."
          />
        </div>
        
        <div>
          <label className="text-xs font-bold uppercase text-ink/50 mb-1 block">Category</label>
          <select
            className="select w-full"
            value={filters.category}
            onChange={(e) => onChange({ ...filters, category: e.target.value })}
          >
            <option value="All">All Categories</option>
            <option value="Books">Books</option>
            <option value="Equipment">Equipment</option>
            <option value="Rooms">Rooms</option>
          </select>
        </div>
        
        <div>
          <label className="text-xs font-bold uppercase text-ink/50 mb-1 block">Listing Type</label>
          <select
            className="select w-full"
            value={filters.listingType || "All"}
            onChange={(e) => onChange({ ...filters, listingType: e.target.value })}
          >
            <option value="All">Rent / Buy</option>
            <option value="rent">Rent Only</option>
            <option value="sale">Buy Only</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-ink/50 mb-1 block">College</label>
          <input
            className="input w-full"
            placeholder="Filter college..."
            value={filters.collegeName || ""}
            onChange={(e) => onChange({ ...filters, collegeName: e.target.value })}
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-ink/50 mb-1 block">City</label>
          <input
            className="input w-full"
            placeholder="Filter city..."
            value={filters.city || ""}
            onChange={(e) => onChange({ ...filters, city: e.target.value })}
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-ink/50 mb-1 block">Radius Distance</label>
          <select
            className="select w-full"
            value={filters.radius || ""}
            onChange={(e) => onChange({ ...filters, radius: e.target.value })}
          >
            <option value="">Any distance</option>
            <option value="0.5">500 meters</option>
            <option value="1">1 km</option>
            <option value="2">2 km</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="25">25 km</option>
            <option value="50">50 km</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default ItemFilters;
