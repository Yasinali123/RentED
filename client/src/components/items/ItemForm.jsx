import { useState, useEffect } from "react";
import { Sparkles, Camera, Trash2 } from "lucide-react";
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
    condition: itemToEdit.condition || "Good",
    brand: itemToEdit.brand || "",
    detail1: itemToEdit.details?.[0] || "",
    detail2: itemToEdit.details?.[1] || "",
  } : initialState);

  const [selectedFiles, setSelectedFiles] = useState([]); // [{ file, previewUrl }]
  const [uploadProgress, setUploadProgress] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      selectedFiles.forEach((fileObj) => URL.revokeObjectURL(fileObj.previewUrl));
    };
  }, []);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    setFeedback("");

    if (selectedFiles.length + files.length > 5) {
      setFeedback("Maximum 5 images allowed.");
      return;
    }

    const validated = [];
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setFeedback(`Invalid file format: ${file.name}. Only JPG, PNG, and WEBP allowed.`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFeedback(`File too large: ${file.name}. Max size allowed is 5MB.`);
        return;
      }
      validated.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setSelectedFiles((prev) => [...prev, ...validated]);
  };

  const handleRemoveFile = (indexToRemove) => {
    setSelectedFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[indexToRemove].previewUrl);
      updated.splice(indexToRemove, 1);
      return updated;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setFeedback("");

    if (!itemToEdit && selectedFiles.length < 2) {
      setError("Please add at least 2 photos of the item for verification");
      setSubmitting(false);
      return;
    }

    try {
      const details = [form.detail1, form.detail2].map((value) => value.trim()).filter(Boolean);

      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("listingType", form.listingType);
      formData.append("rentalPrice", form.rentalPrice === "" ? "" : String(Number(form.rentalPrice)));
      formData.append("salePrice", form.salePrice === "" ? "" : String(Number(form.salePrice)));
      formData.append("category", form.category);
      formData.append("location", form.location);
      formData.append("campus", form.campus);
      formData.append("condition", form.condition);
      formData.append("brand", form.brand);
      
      details.forEach((d) => formData.append("details", d));

      selectedFiles.forEach((fileObj) => {
        formData.append("photos", fileObj.file);
      });

      await onSubmit(formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      if (!itemToEdit) {
        setForm(initialState);
        setSelectedFiles([]);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to publish item");
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
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

        <div className="rounded-2xl border border-ink/5 bg-mist/20 p-4 space-y-4">
          <p className="text-xs font-bold uppercase text-ink/50 flex items-center gap-1">
            <Camera className="h-4 w-4 text-accent" />
            Verification Images
          </p>

          {itemToEdit && itemToEdit.photos && itemToEdit.photos.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-ink/40">Current Images:</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {itemToEdit.photos.map((photo, i) => (
                  <img
                    key={i}
                    src={photo}
                    alt="Current"
                    className="h-14 w-14 rounded-lg object-cover border border-ink/10"
                  />
                ))}
              </div>
              <p className="text-[9px] text-amber-600 font-semibold">
                * Note: Uploading new photos will replace all existing images. Leave blank to keep current images.
              </p>
            </div>
          )}

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink/15 bg-white p-4 text-center transition hover:border-accent">
            <Camera className="h-5 w-5 text-accent" />
            <div>
              <p className="text-xs font-semibold text-ink">Choose files from device</p>
              <p className="text-[10px] text-ink/45">Select 2 to 5 images (JPG, PNG, WEBP • Max 5MB)</p>
            </div>
            <input
              className="hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
            />
          </label>

          {submitting && uploadProgress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-accent">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-canvas h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-accent h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {feedback && <p className="text-[10px] text-red-600 font-semibold">{feedback}</p>}

          {selectedFiles.length > 0 && (
            <div className="grid gap-2 grid-cols-2">
              {selectedFiles.map((fileObj, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-xl bg-white border border-ink/5 text-xs">
                  <div className="flex items-center gap-2 truncate max-w-[70%]">
                    <img src={fileObj.previewUrl} alt="Preview" className="h-8 w-8 rounded object-cover" />
                    <span className="truncate">{fileObj.file.name}</span>
                  </div>
                  <button
                    type="button"
                    className="text-red-500 font-bold text-[10px] hover:underline shrink-0"
                    onClick={() => handleRemoveFile(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
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
