import { Link } from "react-router-dom";
import { BadgeCheck, MapPin, School } from "lucide-react";

import { useAuth } from "../../context/AuthContext";

import {
  getAvailabilityStatusLabel,
  getRentalCardLabel,
  getSecondaryCardLabel,
  getListingTypeLabel,
  getRentalPrice,
  getSalePrice,
} from "../../utils/itemPresentation";
import { getItemCoverPhoto } from "../../utils/itemPhotos";

function ItemCard({ item }) {
  const { user } = useAuth();
  const rentalPrice = getRentalPrice(item);
  const salePrice = getSalePrice(item);
  const coverImage = getItemCoverPhoto(item);
  const isUnavailable = item.availabilityStatus && item.availabilityStatus !== "available";

  const isSameCollege = user && user.collegeName && user.collegeName === item.collegeName;
  const isSameCity = user && user.city && user.city === item.city && !isSameCollege;

  return (
    <article className="panel overflow-hidden">
      <div className="relative h-52 overflow-hidden">
        <img
          src={coverImage || "https://placehold.co/800x600?text=RentEd"}
          alt={item.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute left-4 top-4">
          <div className="flex flex-wrap gap-2">
            <span className="chip">{item.category}</span>
            <span className="chip">{getListingTypeLabel(item)}</span>
          </div>
        </div>
        {isUnavailable ? (
          <div className="absolute right-4 top-4">
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              {getAvailabilityStatusLabel(item)}
            </span>
          </div>
        ) : null}
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold">{item.title}</h3>
              {item.owner?.verifiedCollegeId && (
                <BadgeCheck className="h-5 w-5 text-blue-500" title="Verified Seller" />
              )}
            </div>
            <p className="mt-1 text-sm text-ink/60">
              {item.collegeName ? `${item.collegeName}, ${item.city}` : item.location}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {isSameCollege && (
                <span className="flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                  <School className="h-3 w-3" /> Same College
                </span>
              )}
              {isSameCity && (
                <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700 border border-orange-200">
                  <MapPin className="h-3 w-3" /> Same City
                </span>
              )}
            </div>
          </div>
          <div className="text-right text-sm">
            {rentalPrice !== null ? (
              <p className="font-bold text-accent">
                {getRentalCardLabel(item)} Rs. {rentalPrice}
                {item.category === "Rooms" ? "" : "/day"}
              </p>
            ) : null}
            {salePrice !== null ? (
              <p className={rentalPrice !== null ? "mt-1 font-semibold text-ink/75" : "font-bold text-accent"}>
                {getSecondaryCardLabel(item)} Rs. {salePrice}
              </p>
            ) : null}
          </div>
        </div>
        <p className="line-clamp-3 text-sm leading-6 text-ink/70">{item.description}</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink">{item.owner?.name}</p>
            <p className="text-xs text-ink/50">{item.owner?.collegeName || item.owner?.campus}</p>
          </div>
          {isUnavailable ? (
            <span className="rounded-full border border-ink/10 bg-mist px-4 py-2 text-sm font-semibold text-ink/50">
              {getAvailabilityStatusLabel(item)}
            </span>
          ) : (
            <Link
              to={`/items/${item._id}`}
              className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white"
            >
              View details
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default ItemCard;
