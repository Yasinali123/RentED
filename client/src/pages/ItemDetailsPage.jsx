import { CalendarDays, MapPin, Star, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getErrorMessage, itemApi, paymentApi, rentalApi, reviewApi } from "../api/client";
import ReviewList from "../components/reviews/ReviewList";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { getItemPhotos } from "../utils/itemPhotos";
import {
  getAvailabilityStatusLabel,
  getPurchaseButtonLabel,
  getPurchaseHeading,
  getPurchaseTotalLabel,
  getRentalDetailsLabel,
  getSecondaryDetailsLabel,
  getListingType,
  getListingTypeLabel,
  getRentalPrice,
  getSalePrice,
  isRoomListing,
} from "../utils/itemPresentation";

function ItemDetailsPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [requestForm, setRequestForm] = useState({
    startDate: "",
    endDate: "",
    message: "",
    paymentMethod: "online",
  });
  const [purchaseForm, setPurchaseForm] = useState({
    message: "",
    paymentMethod: "online",
  });

  useEffect(() => {
    itemApi
      .getById(itemId)
      .then((response) => {
        setItem(response);
        return reviewApi.getUserReviews(response.owner._id);
      })
      .then(setReviews)
      .catch((error) => setFeedback(getErrorMessage(error)));
  }, [itemId]);
  const galleryPhotos = useMemo(() => {
    if (!item) {
      return [];
    }

    return getItemPhotos(item);
  }, [item]);
  const [selectedPhoto, setSelectedPhoto] = useState("");

  useEffect(() => {
    setSelectedPhoto(galleryPhotos[0] || item?.image || "");
  }, [galleryPhotos, item]);

  if (!item) {
    return (
      <div className="panel p-8 text-center text-ink/55">
        {feedback || "Loading item details..."}
      </div>
    );
  }

  const listingType = getListingType(item);
  const canRent = listingType === "rent" || listingType === "both";
  const canBuy = listingType === "sale" || listingType === "both";
  const rentalPrice = getRentalPrice(item);
  const salePrice = getSalePrice(item);
  const isRoom = isRoomListing(item);
  const isOwnItem = user?._id === item.owner?._id;
  const isUnavailable = item.availabilityStatus !== "available";
  const availabilityLabel = getAvailabilityStatusLabel(item);
  const unavailableMessage =
    item.availabilityStatus === "sold"
      ? isRoom
        ? "This room partner slot has already been booked."
        : "This item has already been purchased."
      : isRoom
        ? "This room listing is currently unavailable."
        : "This item is currently out of stock.";

  const getDays = () => {
    if (!requestForm.startDate || !requestForm.endDate) {
      return 1;
    }

    const start = new Date(requestForm.startDate);
    const end = new Date(requestForm.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;

    return Math.max(diff, 1);
  };

  const estimatedAmount = (rentalPrice ?? 0) * getDays();

  const handleRequest = (event) => {
    event.preventDefault();
    setFeedback("");

    if (!user) {
      navigate("/login");
      return;
    }

    if (new Date(requestForm.endDate) < new Date(requestForm.startDate)) {
      setFeedback("End date must be on or after the start date.");
      return;
    }

    navigate(`/checkout/${item._id}`, {
      state: {
        requestType: "rental",
        startDate: requestForm.startDate,
        endDate: requestForm.endDate,
        message: requestForm.message,
      },
    });
  };

  const handlePurchase = (event) => {
    event.preventDefault();
    setFeedback("");

    if (!user) {
      navigate("/login");
      return;
    }

    navigate(`/checkout/${item._id}`, {
      state: {
        requestType: "purchase",
        message: purchaseForm.message,
      },
    });
  };

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="panel overflow-hidden">
            <img
              src={selectedPhoto || "https://placehold.co/1200x900?text=RentEd"}
              alt={item.title}
              className="h-full max-h-[540px] w-full object-cover"
            />
          </div>
          {galleryPhotos.length > 1 ? (
            <div className="grid grid-cols-3 gap-3">
              {galleryPhotos.map((photo) => (
                <button
                  key={photo}
                  type="button"
                  className={`overflow-hidden rounded-2xl border transition ${
                    selectedPhoto === photo ? "border-accent" : "border-ink/10"
                  }`}
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img src={photo} alt={`${item.title} preview`} className="h-28 w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="panel space-y-5 p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="chip">{item.category}</span>
              <span className="chip">{getListingTypeLabel(item)}</span>
              <span className="chip">{availabilityLabel}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold">{item.title}</h1>
                <p className="mt-3 text-sm leading-6 text-ink/65">{item.description}</p>
              </div>
              <div className="space-y-2 text-right">
                {rentalPrice !== null ? (
                  <div>
                    <p className="text-3xl font-bold text-accent">Rs. {rentalPrice}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-ink/45">{getRentalDetailsLabel(item)}</p>
                  </div>
                ) : null}
                {salePrice !== null ? (
                  <div>
                    <p className="text-2xl font-bold text-ink">Rs. {salePrice}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-ink/45">
                      {getSecondaryDetailsLabel(item)}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-mist p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4 text-accent" />
                  {item.location}
                </div>
                <p className="mt-1 text-sm text-ink/55">{item.campus}</p>
              </div>
              <div className="rounded-2xl bg-mist p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Star className="h-4 w-4 text-accent" />
                  {item.owner?.ratingsAverage?.toFixed?.(1) || "0.0"} / 5
                </div>
                <p className="mt-1 text-sm text-ink/55">{item.owner?.ratingsCount || 0} reviews</p>
              </div>
              <div className="rounded-2xl bg-mist p-4">
                <p className="text-sm font-semibold text-ink">Condition</p>
                <p className="mt-1 text-sm text-ink/55">{item.condition || "Good"}</p>
              </div>
              <div className="rounded-2xl bg-mist p-4">
                <p className="text-sm font-semibold text-ink">Brand / model</p>
                <p className="mt-1 text-sm text-ink/55">{item.brand || "Not specified"}</p>
              </div>
            </div>

            {item.details?.length ? (
              <div className="rounded-3xl bg-mist p-5">
                <p className="text-sm uppercase tracking-[0.22em] text-ink/45">What to know</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.details.map((detail) => (
                    <span key={detail} className="chip">
                      {detail}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="ghost" onClick={() => navigate("/marketplace")}>
                Back to marketplace
              </Button>
            </div>
            {isOwnItem ? (
              <p className="rounded-2xl bg-mist p-4 text-sm text-ink/70">
                This is your listing, so purchase actions are hidden here.
              </p>
            ) : null}
          </div>

          {isUnavailable && !isOwnItem ? (
            <div className="panel space-y-3 p-6">
              <p className="text-xl font-semibold">{availabilityLabel}</p>
              <p className="text-sm text-ink/60">{unavailableMessage}</p>
            </div>
          ) : null}

          {canRent && !isOwnItem && !isUnavailable ? (
            <form className="panel space-y-4 p-6" onSubmit={handleRequest}>
              <div>
                <p className="text-xl font-semibold">{isRoom ? "Rent this room" : "Rent this item"}</p>
                <p className="mt-1 text-sm text-ink/55">
                  {isRoom
                    ? "Select dates and proceed to checkout to book this room."
                    : "Select dates and proceed to checkout for this rental."}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <CalendarDays className="h-4 w-4 text-accent" />
                    Start date
                  </span>
                  <input
                    className="input"
                    type="date"
                    value={requestForm.startDate}
                    required
                    onChange={(event) => setRequestForm({ ...requestForm, startDate: event.target.value })}
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <CalendarDays className="h-4 w-4 text-accent" />
                    End date
                  </span>
                  <input
                    className="input"
                    type="date"
                    value={requestForm.endDate}
                    min={requestForm.startDate || undefined}
                    required
                    onChange={(event) => setRequestForm({ ...requestForm, endDate: event.target.value })}
                  />
                </label>
              </div>
              <p className="rounded-2xl bg-mist p-4 text-sm text-ink/70">
                {isRoom ? "Room rent" : "Estimated Total"}: Rs. {estimatedAmount}
              </p>
              <textarea
                className="textarea"
                placeholder={isRoom ? "Add a note about move-in date or stay duration" : "Add a message for the owner"}
                value={requestForm.message}
                onChange={(event) => setRequestForm({ ...requestForm, message: event.target.value })}
              />
              <Button type="submit" variant="primary" className="w-full">
                Proceed to Checkout
              </Button>
            </form>
          ) : null}

          {canBuy && !isOwnItem && !isUnavailable ? (
            <form className="panel space-y-4 p-6" onSubmit={handlePurchase}>
              <div>
                <p className="text-xl font-semibold">{getPurchaseHeading(item)}</p>
                <p className="mt-1 text-sm text-ink/55">
                  Proceed to checkout to place your order.
                </p>
              </div>
              <p className="rounded-2xl bg-mist p-4 text-sm text-ink/70">
                {getPurchaseTotalLabel(item)}: Rs. {salePrice}
              </p>
              <textarea
                className="textarea"
                placeholder={
                  isRoom
                    ? "Add a note about roommate preferences, move-in timing, or stay plans"
                    : "Add a note for the seller"
                }
                value={purchaseForm.message}
                onChange={(event) => setPurchaseForm({ ...purchaseForm, message: event.target.value })}
              />
              <Button type="submit" variant="secondary" className="w-full">
                Proceed to Checkout
              </Button>
            </form>
          ) : null}

          {feedback ? <p className="px-1 text-sm text-ink/60">{feedback}</p> : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="panel p-6">
          <div className="flex items-center gap-3">
            <UserRound className="h-10 w-10 rounded-full bg-accent/10 p-2 text-accent" />
            <div>
              <p className="text-xl font-semibold">{item.owner?.name}</p>
              <p className="text-sm text-ink/55">{item.owner?.campus}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-ink/65">
            College ID verified: {item.owner?.verifiedCollegeId ? "Yes" : "Pending"}.
          </p>
        </div>
        <div>
          <h2 className="mb-4 text-2xl font-semibold">Reviews for this owner</h2>
          <ReviewList reviews={reviews} />
        </div>
      </section>
    </div>
  );
}

export default ItemDetailsPage;
