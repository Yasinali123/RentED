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
    <article className="panel overflow-hidden flex flex-col justify-between h-full transition-all duration-300 hover:shadow-lg">
      <div>
        <div className="relative h-44 sm:h-52 w-full overflow-hidden">
          <img
            src={coverImage || "https://placehold.co/800x600?text=RentEd"}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            loading="lazy"
          />
          <div className="absolute left-3 top-3 sm:left-4 sm:top-4 max-w-[70%]">
            <div className="flex flex-wrap gap-1.5">
              <span className="chip text-[10px] sm:text-xs py-0.5 px-2.5 bg-white/90 backdrop-blur-xs font-bold text-ink">{item.category}</span>
              <span className="chip text-[10px] sm:text-xs py-0.5 px-2.5 bg-white/90 backdrop-blur-xs font-bold text-pine">{getListingTypeLabel(item)}</span>
            </div>
          </div>
          {isUnavailable ? (
            <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
              <span className="rounded-full bg-ink/90 backdrop-blur-xs px-2.5 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white">
                {getAvailabilityStatusLabel(item)}
              </span>
            </div>
          ) : null}
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base sm:text-lg font-bold text-ink truncate" title={item.title}>{item.title}</h3>
                {item.owner?.verifiedCollegeId && (
                  <BadgeCheck className="h-4.5 w-4.5 text-blue-500 shrink-0" title="Verified Seller" />
                )}
              </div>
              <p className="mt-0.5 text-xs text-ink/60 truncate">
                {item.collegeName ? `${item.collegeName}, ${item.city}` : item.location}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.distance !== undefined && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-emerald-700 border border-emerald-200" title="Geospatial Proximity">
                    <MapPin className="h-3 w-3" /> {item.distance < 1000 ? `${Math.round(item.distance)} m away` : `${(item.distance / 1000).toFixed(1)} km away`}
                  </span>
                )}
                {isSameCollege && (
                  <span className="flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-indigo-700 border border-indigo-200">
                    <School className="h-3 w-3" /> Same College
                  </span>
                )}
                {isSameCity && (
                  <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-orange-700 border border-orange-200">
                    <MapPin className="h-3 w-3" /> Same City
                  </span>
                )}
              </div>
            </div>
            <div className="text-right text-xs sm:text-sm shrink-0">
              {rentalPrice !== null ? (
                <p className="font-black text-accent whitespace-nowrap">
                  {getRentalCardLabel(item)} Rs. {rentalPrice}
                  {item.category === "Rooms" ? "" : "/day"}
                </p>
              ) : null}
              {salePrice !== null ? (
                <p className={rentalPrice !== null ? "mt-0.5 font-semibold text-ink/75 whitespace-nowrap" : "font-black text-accent whitespace-nowrap"}>
                  {getSecondaryCardLabel(item)} Rs. {salePrice}
                </p>
              ) : null}
            </div>
          </div>
          <p className="line-clamp-2 text-xs sm:text-sm leading-relaxed text-ink/70">{item.description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between p-4 sm:p-5 pt-0 border-t border-ink/5 mt-3">
        <div className="min-w-0 flex-1 mr-2">
          <p className="text-xs sm:text-sm font-bold text-ink truncate">{item.owner?.name}</p>
          <p className="text-[10px] sm:text-xs text-ink/50 truncate">{item.owner?.collegeName || item.owner?.campus}</p>
        </div>
        {isUnavailable ? (
          <span className="rounded-full border border-ink/10 bg-mist px-3.5 py-1.5 text-xs font-semibold text-ink/50 shrink-0">
            {getAvailabilityStatusLabel(item)}
          </span>
        ) : (
          <Link
            to={`/items/${item._id}`}
            className="rounded-full border border-ink/10 px-4 py-2 text-xs sm:text-sm font-bold text-ink transition hover:bg-accent hover:text-white hover:border-accent min-h-[44px] sm:min-h-[48px] min-w-[44px] flex items-center justify-center shrink-0 active:scale-95"
          >
            View details
          </Link>

        )}
      </div>
    </article>
  );
}

export default ItemCard;
