export const isRoomListing = (item) => item?.category === "Rooms";
const validListingTypes = new Set(["rent", "sale", "both"]);

export const getListingType = (item) => {
  if (!item) {
    return "both";
  }

  if (validListingTypes.has(item.listingType)) {
    return item.listingType;
  }

  const hasRentalPrice = item.rentalPrice ?? item.price;
  const hasSalePrice = item.salePrice;

  if (hasRentalPrice != null && hasSalePrice != null) {
    return "both";
  }

  if (hasSalePrice != null) {
    return "sale";
  }

  return "rent";
};

export const getListingTypeLabel = (item) => {
  if (isRoomListing(item)) {
    return "Rent or room partner";
  }

  const listingType = getListingType(item);

  if (listingType === "sale") {
    return "Second-hand sale";
  }

  if (listingType === "both") {
    return "Rent or buy";
  }

  return "For rent";
};

export const getRentalPrice = (item) => {
  const listingType = getListingType(item);

  if (listingType === "sale") {
    return null;
  }

  return item?.rentalPrice ?? item?.price ?? null;
};

export const getSalePrice = (item) => {
  const listingType = getListingType(item);

  if (listingType === "rent") {
    return null;
  }

  return item?.salePrice ?? (listingType === "sale" ? item?.price ?? null : null);
};

export const getRentalCardLabel = (item) => (isRoomListing(item) ? "Rent room" : "Rent");

export const getSecondaryCardLabel = (item) => (isRoomListing(item) ? "Room partner" : "Buy");

export const getRentalDetailsLabel = (item) =>
  isRoomListing(item) ? "room rent" : "rental price per day";

export const getSecondaryDetailsLabel = (item) =>
  isRoomListing(item) ? "room partner share" : "second-hand sale price";

export const getPurchaseHeading = (item) =>
  isRoomListing(item) ? "Join as room partner" : "Buy this item";

export const getPurchaseButtonLabel = (item) =>
  isRoomListing(item) ? "Confirm room partner" : "Place order";

export const getPurchaseTotalLabel = (item) =>
  isRoomListing(item) ? "Room partner share" : "Total";

export const getAvailabilityStatusLabel = (item) => {
  if (item?.availabilityStatus === "sold") {
    return isRoomListing(item) ? "Partner booked" : "Out of stock";
  }

  if (item?.availabilityStatus === "rented" || item?.availabilityStatus === "pending") {
    return "Rented";
  }

  return "Available";
};

export const getRequestTypeLabel = (request) => {
  if (request?.item?.category === "Rooms" && request?.requestType === "purchase") {
    return "Room partner booking";
  }

  return request?.requestType === "purchase" ? "Purchase order" : "Rental booking";
};

export const getRequestAmountLabel = (request) => {
  if (request?.item?.category === "Rooms" && request?.requestType === "purchase") {
    return "Room partner share";
  }

  return request?.requestType === "purchase" ? "Purchase amount" : "Total";
};
