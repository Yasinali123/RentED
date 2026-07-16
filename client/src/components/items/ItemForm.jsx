import { useState } from "react";
import { Sparkles, Image, CheckCircle, HelpCircle } from "lucide-react";
import Button from "../ui/Button";

const initialState = {
  title: "",
  description: "",
  listingType: "both",
  rentalPrice: "",
  salePrice: "",
  category: "Books",
  location: "",
  campus: "",
  photo1: "",
  photo2: "",
  condition: "Good",
  brand: "",
  detail1: "",
  detail2: "",
};

function ItemForm({ onSubmit, itemToEdit = null, onCancel = null }) {
  const [form, setForm] = useState(itemToEdit ? {
    title: itemToEdit.title || "",
    description: itemToEdit.description || "",
    listingType: itemToEdit.listingType || "both",
    rentalPrice: itemToEdit.rentalPrice || "",
    salePrice: itemToEdit.salePrice || "",
    category: itemToEdit.category || "Books",
    location: itemToEdit.location || "",
    campus: itemToEdit.campus || "",
    photo1: itemToEdit.photos?.[0] || itemToEdit.image || "",
    photo2: itemToEdit.photos?.[1] || "",
    condition: itemToEdit.condition || "Good",
    brand: itemToEdit.brand || "",
    detail1: itemToEdit.details?.[0] || "",
    detail2: itemToEdit.details?.[1] || "",
  } : initialState);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    if (!form.photo1 || !form.photo2) {
      setError("Please add at least 2 photos of the item for verification");
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        title: form.title,
        description: form.description,
        listingType: form.listingType,
        rentalPrice: form.rentalPrice === "" ? null : Number(form.rentalPrice),
        salePrice: form.salePrice === "" ? null : Number(form.salePrice),
        category: form.category,
        location: form.location,
        campus: form.campus,
        photos: [form.photo1, form.photo2].filter(Boolean),
        condition: form.condition,
        brand: form.brand,
        details: [form.detail1, form.detail2].filter(Boolean),
      };
      await onSubmit(payload);
      if (!itemToEdit) setForm(initialState);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to publish item");
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    "Books",
    "Topper Notes",
    "Medical Books",
    "Law Books",
    "Commerce Books",
    "Engineering Books",
    "Calculators",
    "Lab Equipment",
    "Electronics",
    "Hostel Essentials",
    "Furniture",
    "Room / PG Listings",
  ];

  return (
    <form className="panel space-y-5 p-6 border-transparent hover:border-indigo-100 transition-colors" onSubmit={handleSubmit}>
      <div>
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          {itemToEdit ? "Edit Campus Listing" : "Create New Campus Listing"}
        </h3>
        <p className="text-xs text-ink/55 mt-1">
          Make educational resources, books, and rooms available for rent or purchase to other students.
        </p>
      </div>

      <div className="space-y-4">
        <input
          className="input"
          placeholder="Product Title (e.g. HC Verma Physics Vol 1)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />

        <textarea
          className="textarea"
          placeholder="Detailed description, highlighting notes condition, missing pages or Pg rules..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-ink/50 uppercase">Category</span>
            <select
              className="select"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-ink/50 uppercase">Condition</span>
            <select
              className="select"
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
            >
              <option value="New">New</option>
              <option value="Like New">Like New</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-ink/50 uppercase">Listing Offer</span>
            <select
              className="select"
              value={form.listingType}
              onChange={(e) => setForm({ ...form, listingType: e.target.value })}
            >
              <option value="both">Rent & Buy</option>
              <option value="rent">Rent Only</option>
              <option value="sale">Buy Only</option>
            </select>
          </label>

          {(form.listingType === "rent" || form.listingType === "both") && (
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-ink/50 uppercase">Rent (Rs/day)</span>
              <input
                className="input"
                type="number"
                placeholder="Rs. 40"
                value={form.rentalPrice}
                onChange={(e) => setForm({ ...form, rentalPrice: e.target.value })}
                required
              />
            </label>
          )}

          {(form.listingType === "sale" || form.listingType === "both") && (
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-ink/50 uppercase">Sale Price (Rs)</span>
              <input
                className="input"
                type="number"
                placeholder="Rs. 300"
                value={form.salePrice}
                onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                required
              />
            </label>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <input
            className="input"
            placeholder="Hostel Room / Building Street Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="College Campus Name (e.g. ADC)"
            value={form.campus}
            onChange={(e) => setForm({ ...form, campus: e.target.value })}
            required
          />
        </div>

        <div className="rounded-2xl border border-ink/5 bg-mist/20 p-4 space-y-3">
          <p className="text-xs font-bold uppercase text-ink/50 flex items-center gap-1">
            <Image className="h-4 w-4 text-accent" />
            Verification Images (2 URLs required)
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="input bg-white"
              placeholder="Cover Photo URL (https://...)"
              value={form.photo1}
              onChange={(e) => setForm({ ...form, photo1: e.target.value })}
              required
            />
            <input
              className="input bg-white"
              placeholder="Detail Photo URL (https://...)"
              value={form.photo2}
              onChange={(e) => setForm({ ...form, photo2: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <input
            className="input"
            placeholder="Brand / Author Name"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
          />
          <input
            className="input"
            placeholder="Highlight Tag 1 (e.g. Free Formula sheet)"
            value={form.detail1}
            onChange={(e) => setForm({ ...form, detail1: e.target.value })}
          />
          <input
            className="input"
            placeholder="Highlight Tag 2 (e.g. 5 min walk to gate)"
            value={form.detail2}
            onChange={(e) => setForm({ ...form, detail2: e.target.value })}
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

      <div className="flex gap-3">
        {onCancel && (
          <Button type="button" variant="ghost" className="flex-1" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="secondary" className="flex-1" disabled={submitting}>
          {submitting ? "Publishing..." : itemToEdit ? "Save Changes" : "Publish Listing"}
        </Button>
      </div>
    </form>
  );
}

export default ItemForm;
