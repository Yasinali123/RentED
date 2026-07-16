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
      <div className="panel flex flex-col gap-6 p-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-ink/45">Student marketplace</p>
          <h1 className="mt-2 text-4xl font-bold">Rent, buy, or sell books, gear, and rooms nearby</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">
            Search by name, filter by category or location, and connect directly with students who
            already have what you need.
          </p>
        </div>
      </div>

      <ItemFilters filters={filters} onChange={setFilters} />
      {feedback ? <div className="text-sm text-ink/60">{feedback}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-5 md:grid-cols-2">
          {items.map((item) => (
            <ItemCard key={item._id} item={item} />
          ))}
          {!items.length ? (
            <div className="panel col-span-full p-8 text-center text-ink/55">
              No listings matched your filters yet.
            </div>
          ) : null}
        </div>

        <div>
          {user ? (
            <div className="panel space-y-4 p-6">
              <h2 className="text-2xl font-semibold">Ready to post your item?</h2>
              <p className="text-sm leading-6 text-ink/65">
                Open the seller page to add 2-3 photos, condition notes, pricing, and useful
                details before you publish.
              </p>
              <Link
                to="/sell-rent"
                className="inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
              >
                Open seller page
              </Link>
            </div>
          ) : (
            <div className="panel space-y-4 p-6">
              <h2 className="text-2xl font-semibold">Want to list something?</h2>
              <p className="text-sm leading-6 text-ink/65">
                Create your account to publish rentals, second-hand items, and manage your orders.
              </p>
              <Link
                to="/signup"
                className="inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
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
