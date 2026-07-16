const sampleItemPhotosByTitle = Object.freeze({
  "Engineering Mathematics Textbook": ["/images/engineering-math-1.jpg", "/images/engineering-math-2.jpg"],
  "Casio Scientific Calculator fx-991ES": ["client/dist/images/calculator.avif", "client/dist/images/calculator.avif"],
  "Shared PG Room Near Library": ["/images/pg-room.jpeg", "/images/pg-room-2.jpg", "/images/pg-room-3.jpg"],
  "Organic Chemistry Lab Kit": ["/images/chemistry-kit-1.jpg", "/images/chemistry-kit-2.jpg"],
  "Data Structures Handbook": ["/images/data-structures-1.jpg", "/images/data-structures-2.jpg"],
  "Drafting Board for Architecture Studio": ["/images/drafting-board-1.jpg", "/images/drafting-board-2.jpg"],
  " Laptop": ["/images/laptop-1.svg", "/images/laptop-2.svg"],
  "Biology Practical Kit Set": ["/images/biology-kit-1.svg", "/images/biology-kit-2.svg"],
  "Single Room Near Campus Gate": ["/images/study-room-1.svg", "/images/study-room-2.svg"],
});

const normalizeTitle = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const sampleItemPhotosByNormalizedTitle = Object.freeze(
  Object.fromEntries(
    Object.entries(sampleItemPhotosByTitle).map(([title, photos]) => [normalizeTitle(title), photos]),
  ),
);

const normalizePhotoPath = (photo) => {
  if (typeof photo !== "string") {
    return "";
  }

  const trimmedPhoto = photo.trim();

  if (!trimmedPhoto) {
    return "";
  }

  if (trimmedPhoto.startsWith("images/")) {
    return `/${trimmedPhoto}`;
  }

  return trimmedPhoto;
};

const hasBundledOrUploadedPhoto = (photo) =>
  typeof photo === "string" &&
  (photo.startsWith("/images/") ||
    photo.startsWith("data:") ||
    photo.startsWith("blob:") ||
    photo.startsWith("http://") ||
    photo.startsWith("https://"));

export const getItemPhotos = (item) => {
  const directPhotos = Array.isArray(item?.photos) ? item.photos.map(normalizePhotoPath).filter(Boolean) : [];

  if (!directPhotos.length && item?.image) {
    directPhotos.push(normalizePhotoPath(item.image));
  }

  // Only return direct photos if they are valid paths.
  // This prevents empty/invalid entries from breaking the gallery.
  if (directPhotos.length && directPhotos.every(hasBundledOrUploadedPhoto)) {
    return directPhotos;
  }

  const bundledPhotos =
    sampleItemPhotosByTitle[item?.title] || sampleItemPhotosByNormalizedTitle[normalizeTitle(item?.title)];

  if (bundledPhotos?.length) {
    return bundledPhotos;
  }

  return directPhotos;
};

export const getItemCoverPhoto = (item) => getItemPhotos(item)[0] || "";
