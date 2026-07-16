import { Camera, CircleDollarSign, ClipboardList, PackagePlus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { getErrorMessage, itemApi } from "../api/client";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";

const initialState = {
  title: "",
  description: "",
  category: "Books",
  rentalPrice: "",
  salePrice: "",
  condition: "Good",
  brand: "",
  location: "",
  photo1: "",
  photo2: "",
  photo3: "",
  detail1: "",
  detail2: "",
  detail3: "",
  tags: "",
};

const resizeImageToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxDimension = 1280;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");

        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      image.onerror = () => reject(new Error("Selected file is not a valid image"));
      image.src = reader.result;
    };

    reader.onerror = () => reject(new Error("Unable to read the selected file"));
    reader.readAsDataURL(file);
  });

function SellRentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    ...initialState,
    location: user?.location || "",
  });
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState("");
  const isRoomCategory = form.category === "Rooms";

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePhotoSelect = async (field, file) => {
    if (!file) {
      handleChange(field, "");
      return;
    }

    setProcessingPhoto(field);
    setFeedback("");

    try {
      const compressedPhoto = await resizeImageToDataUrl(file);
      handleChange(field, compressedPhoto);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setProcessingPhoto("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback("");

    try {
      const photos = [form.photo1, form.photo2, form.photo3].map((value) => value.trim()).filter(Boolean);
      const details = [form.detail1, form.detail2, form.detail3].map((value) => value.trim()).filter(Boolean);
      const tags = form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const createdItem = await itemApi.create({
        title: form.title,
        description: form.description,
        category: form.category,
        rentalPrice: Number(form.rentalPrice),
        salePrice: Number(form.salePrice),
        condition: form.condition,
        brand: form.brand,
        location: form.location,
        photos,
        details,
        tags,
      });

      navigate(`/items/${createdItem._id}`);
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const photoPreview = [
    { field: "photo1", value: form.photo1.trim() },
    { field: "photo2", value: form.photo2.trim() },
    { field: "photo3", value: form.photo3.trim() },
  ].filter((photo) => photo.value);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="panel overflow-hidden p-8 sm:p-10">
          <div className="max-w-xl space-y-6">
            <span className="chip">Seller studio</span>
            <h1 className="text-5xl font-bold leading-tight">Post your item for students to rent or buy</h1>
            <p className="text-base leading-7 text-ink/68">
              Create a better listing with 2-3 photos, honest condition notes, and clear pricing.
              This page works for books, kits, calculators, gadgets, and room listings too.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Camera,
                  title: "2-3 clear photos",
                  description: "Front, side, and close-up shots help buyers trust the listing faster.",
                },
                {
                  icon: ClipboardList,
                  title: "Useful details",
                  description: "Mention condition, missing parts, accessories, and ideal use cases.",
                },
                {
                  icon: CircleDollarSign,
                  title: isRoomCategory ? "Set rent and partner share" : "Set both prices",
                  description: isRoomCategory
                    ? "Students can rent the room or join as a room partner from the same listing."
                    : "Students can rent short-term or buy second-hand from the same listing.",
                },
                {
                  icon: PackagePlus,
                  title: "Campus-friendly listing",
                  description: "Use a pickup location students already recognize on or near campus.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-3xl bg-mist p-5">
                  <item.icon className="h-7 w-7 text-accent" />
                  <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/62">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <form className="panel space-y-6 p-7 sm:p-8" onSubmit={handleSubmit}>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-ink/45">New listing</p>
            <h2 className="mt-2 text-3xl font-semibold">Tell students what you are offering</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              className="input sm:col-span-2"
              placeholder="Listing title"
              value={form.title}
              required
              onChange={(event) => handleChange("title", event.target.value)}
            />
            <select
              className="select"
              value={form.category}
              onChange={(event) => handleChange("category", event.target.value)}
            >
              <option value="Books">Books</option>
              <option value="Equipment">Equipment</option>
              <option value="Rooms">Rooms</option>
            </select>
            <select
              className="select"
              value={form.condition}
              onChange={(event) => handleChange("condition", event.target.value)}
            >
              <option value="New">New</option>
              <option value="Like New">Like New</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
            </select>
            <input
              className="input"
              type="number"
              min="0"
              placeholder={isRoomCategory ? "Room rent amount" : "Rental price per day"}
              value={form.rentalPrice}
              required
              onChange={(event) => handleChange("rentalPrice", event.target.value)}
            />
            <input
              className="input"
              type="number"
              min="0"
              placeholder={isRoomCategory ? "Room partner share" : "Sale price"}
              value={form.salePrice}
              required
              onChange={(event) => handleChange("salePrice", event.target.value)}
            />
            <input
              className="input"
              placeholder={isRoomCategory ? "Property / building name" : "Brand / publisher / model"}
              value={form.brand}
              onChange={(event) => handleChange("brand", event.target.value)}
            />
            <input
              className="input"
              placeholder="Pickup location"
              value={form.location}
              required
              onChange={(event) => handleChange("location", event.target.value)}
            />
          </div>

          <textarea
            className="textarea"
            placeholder={
              isRoomCategory
                ? "Describe the room, facilities, occupancy, preferred roommate details, and what is included"
                : "Describe the item, its use, condition, and what the student will receive"
            }
            value={form.description}
            required
            onChange={(event) => handleChange("description", event.target.value)}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">Photos</p>
              <p className="text-sm text-ink/55">Select 2-3 photos from your device or media</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { field: "photo1", label: "Photo 1", required: true },
                { field: "photo2", label: "Photo 2", required: true },
                { field: "photo3", label: "Photo 3", required: false },
              ].map((photoInput) => (
                <label
                  key={photoInput.field}
                  className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-ink/15 bg-white p-5 text-center transition hover:border-accent"
                >
                  <Camera className="h-7 w-7 text-accent" />
                  <div>
                    <p className="text-sm font-semibold text-ink">{photoInput.label}</p>
                    <p className="mt-1 text-xs text-ink/55">
                      {processingPhoto === photoInput.field
                        ? "Processing image..."
                        : photoInput.required
                          ? "Choose from media"
                          : "Optional"}
                    </p>
                  </div>
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    required={photoInput.required && !form[photoInput.field]}
                    onChange={(event) => handlePhotoSelect(photoInput.field, event.target.files?.[0])}
                  />
                  <span className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white">
                    Select photo
                  </span>
                </label>
              ))}
            </div>
            {photoPreview.length ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {photoPreview.map((photo, index) => (
                  <div key={photo.field} className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
                    <img src={photo.value} alt="Listing preview" className="h-28 w-full object-cover" />
                    <div className="flex items-center justify-between px-3 py-2 text-xs text-ink/55">
                      <span>Preview {index + 1}</span>
                      <button
                        type="button"
                        className="font-semibold text-accent"
                        onClick={() => handleChange(photo.field, "")}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">Extra details</p>
              <p className="text-sm text-ink/55">Add 2-3 quick points students care about</p>
            </div>
            <div className="grid gap-4">
              <input
                className="input"
                placeholder={isRoomCategory ? "Detail 1: Wi-Fi / attached washroom / furnished" : "Detail 1"}
                value={form.detail1}
                onChange={(event) => handleChange("detail1", event.target.value)}
              />
              <input
                className="input"
                placeholder={isRoomCategory ? "Detail 2: Preferred roommate / move-in date" : "Detail 2"}
                value={form.detail2}
                onChange={(event) => handleChange("detail2", event.target.value)}
              />
              <input
                className="input"
                placeholder={isRoomCategory ? "Detail 3: Utilities / food / visitor rules" : "Detail 3"}
                value={form.detail3}
                onChange={(event) => handleChange("detail3", event.target.value)}
              />
            </div>
          </div>

          <input
            className="input"
            placeholder="Tags separated by commas: calculator, exam, notes"
            value={form.tags}
            onChange={(event) => handleChange("tags", event.target.value)}
          />

          {feedback ? <p className="text-sm text-red-600">{feedback}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" variant="secondary" className="sm:flex-1" disabled={submitting}>
              {submitting ? "Publishing listing..." : "Publish listing"}
            </Button>
            <Button type="button" variant="ghost" className="sm:flex-1" onClick={() => navigate("/marketplace")}>
              Back to marketplace
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default SellRentPage;
