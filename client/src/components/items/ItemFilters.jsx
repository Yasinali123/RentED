import { useAuth } from "../../context/AuthContext";
import SearchAutocomplete from "../ui/SearchAutocomplete";

function ItemFilters({ filters, onChange }) {
  const { user } = useAuth();
  
  return (
    <div className="panel p-5 grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 items-end">
      <div className="col-span-2 md:col-span-3 lg:col-span-2 relative">
        <label className="text-xs font-semibold uppercase text-ink/50 mb-1 block">Search</label>
        <SearchAutocomplete
          initialValue={filters.q}
          onSearch={(val) => onChange({ ...filters, q: val })}
          placeholder="Keyword..."
        />
      </div>
      
      <div>
        <label className="text-xs font-semibold uppercase text-ink/50 mb-1 block">Category</label>
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
        <label className="text-xs font-semibold uppercase text-ink/50 mb-1 block">Type</label>
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
        <label className="text-xs font-semibold uppercase text-ink/50 mb-1 block">College</label>
        <input
          className="input w-full"
          placeholder="Filter college..."
          value={filters.collegeName || ""}
          onChange={(e) => onChange({ ...filters, collegeName: e.target.value })}
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase text-ink/50 mb-1 block">City</label>
        <input
          className="input w-full"
          placeholder="Filter city..."
          value={filters.city || ""}
          onChange={(e) => onChange({ ...filters, city: e.target.value })}
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase text-ink/50 mb-1 block">Distance (Radius)</label>
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
  );
}

export default ItemFilters;
