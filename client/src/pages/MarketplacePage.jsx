import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getErrorMessage, itemApi } from "../api/client";
import ItemCard from "../components/items/ItemCard";
import ItemFilters from "../components/items/ItemFilters";
import { useAuth } from "../context/AuthContext";

function MarketplacePage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ 
    q: "", 
    category: "All", 
    listingType: "All",
    collegeName: "",
    city: "",
    radius: ""
  });
  const [feedback, setFeedback] = useState("");

  const loadItems = () => {
    const apiFilters = { ...filters };
    if (filters.radius && user?.geometry?.coordinates) {
      apiFilters.lat = user.geometry.coordinates[1];
      apiFilters.lng = user.geometry.coordinates[0];
    }
    itemApi
      .list(apiFilters)
      .then(setItems)
      .catch((error) => setFeedback(getErrorMessage(error)));
  };

  useEffect(() => {
    loadItems();
  }, [filters.q, filters.category, filters.listingType, filters.collegeName, filters.city, filters.radius, user]);
  return (
    <div className="space-y-6">
      <div className="panel flex flex-col gap-4 p-5 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-accent dark:text-amber-400 font-extrabold">Student marketplace</p>
          <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold text-ink dark:text-white leading-tight">
            Rent, buy, or sell books, gear, and rooms nearby
          </h1>
          <p className="mt-2.5 max-w-2xl text-xs sm:text-sm leading-relaxed text-ink/65 dark:text-slate-300">
            Search by name, filter by category or location, and connect directly with students who
            already have what you need.
          </p>

        </div>
      </div>

      <ItemFilters filters={filters} onChange={setFilters} />
      {feedback ? <div className="text-xs sm:text-sm text-ink/60">{feedback}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item._id} item={item} />
          ))}
          {!items.length ? (
            <div className="panel col-span-full p-8 text-center text-xs sm:text-sm text-ink/55">
              No listings matched your filters yet.
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          {user?.role === "seller" && (
            <div className="panel space-y-4 p-5 sm:p-6">
              <h2 className="text-xl font-bold text-ink">Ready to post your item?</h2>
              <p className="text-xs sm:text-sm leading-relaxed text-ink/65">
                Open the seller page to add photos, condition notes, pricing, and useful
                details before you publish.
              </p>
              <Link
                to="/sell-rent"
                className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-accent/20 min-h-[44px] w-full sm:w-auto text-center"
              >
                Open seller page
              </Link>
            </div>
          )}
          {!user && (
            <div className="panel space-y-4 p-5 sm:p-6">
              <h2 className="text-xl font-bold text-ink">Want to list something?</h2>
              <p className="text-xs sm:text-sm leading-relaxed text-ink/65">
                Create your account to publish rentals, second-hand items, and manage your orders.
              </p>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-accent/20 min-h-[44px] w-full sm:w-auto text-center"
              >
                Create account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MarketplacePage;
