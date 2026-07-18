import { Camera, CircleDollarSign, ClipboardList, PackagePlus } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { getErrorMessage, itemApi, settingsApi } from "../api/client";
import Button from "../components/ui/Button";
import LocationPicker from "../components/maps/LocationPicker";
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
  detail1: "",
  detail2: "",
  detail3: "",
  tags: "",
};

function SellRentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    ...initialState,
    location: user?.location || "",
  });
  const [pickedLocation, setPickedLocation] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]); // [{ file, previewUrl }]
  const [uploadProgress, setUploadProgress] = useState(0);
  const [commissionRate, setCommissionRate] = useState(10);
  const isRoomCategory = form.category === "Rooms";

  useEffect(() => {
    const fetchCommissionRate = async () => {
      try {
        const settings = await settingsApi.get();
        if (settings && typeof settings.commission_rate === "number") {
          setCommissionRate(settings.commission_rate);
        }
      } catch (error) {
        console.error("Failed to load platform commission rate:", error);
      }
    };
    fetchCommissionRate();
  }, []);

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      selectedFiles.forEach((fileObj) => URL.revokeObjectURL(fileObj.previewUrl));
    };
  }, []);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

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
    setFeedback("");

    if (selectedFiles.length < 2) {
      setFeedback("Please select at least 2 photos of the item for verification.");
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {
      const details = [form.detail1, form.detail2, form.detail3].map((value) => value.trim()).filter(Boolean);
      const tags = form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("category", form.category);
      formData.append("rentalPrice", String(Number(form.rentalPrice)));
      formData.append("salePrice", String(Number(form.salePrice)));
      formData.append("condition", form.condition);
      formData.append("brand", form.brand);
      formData.append("location", form.location);

      if (pickedLocation) {
        formData.append("pickupLatitude", String(pickedLocation.latitude));
        formData.append("pickupLongitude", String(pickedLocation.longitude));
        formData.append("pickupAddress", pickedLocation.address);
        formData.append("college", pickedLocation.college);
        formData.append("district", pickedLocation.district);
        formData.append("city", pickedLocation.city);
        formData.append("state", pickedLocation.state);
        formData.append("country", pickedLocation.country);
      }

      details.forEach((detail) => formData.append("details", detail));
      tags.forEach((tag) => formData.append("tags", tag));

      selectedFiles.forEach((fileObj) => {
        formData.append("photos", fileObj.file);
      });

      const createdItem = await itemApi.create(formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      navigate(`/items/${createdItem._id}`);
    } catch (error) {
      setFeedback(getErrorMessage(error));
      setUploadProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

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

            {/* Commission Policy Section */}
            <div className="mt-6 rounded-3xl border border-pine/20 bg-pine/5 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pine/10 text-pine">
                  <CircleDollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-pine">Commission Policy</h3>
                  <p className="text-xs text-pine/70 font-medium">Fair, simple, and transparent</p>
                </div>
              </div>
              <hr className="border-pine/10" />
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5">
                  <span className="text-lg shrink-0 select-none" role="img" aria-label="check">✅</span>
                  <span className="text-sm font-semibold text-ink/85 leading-normal">Free to list your items.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-lg shrink-0 select-none" role="img" aria-label="check">✅</span>
                  <span className="text-sm font-semibold text-ink/85 leading-normal">
                    {commissionRate}% platform commission is deducted only after a successful sale or rental.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-lg shrink-0 select-none" role="img" aria-label="check">✅</span>
                  <span className="text-sm font-semibold text-ink/85 leading-normal">No commission is charged if your item is not sold or rented.</span>
                </li>
              </ul>
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
            <div className="sm:col-span-2 space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-ink/55">Hyperlocal Pickup Location (Map Picker)</label>
              <LocationPicker
                initialLat={user?.latitude}
                initialLng={user?.longitude}
                onChangeLocation={(loc) => {
                  setPickedLocation(loc);
                  handleChange("location", loc.address);
                }}
              />
            </div>
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">Photos</p>
              <p className="text-sm text-ink/55">Upload 2 to 5 photos from your device</p>
            </div>
            
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-ink/15 bg-white p-6 text-center transition hover:border-accent">
              <Camera className="h-8 w-8 text-accent" />
              <div>
                <p className="text-sm font-semibold text-ink">Choose images to upload</p>
                <p className="mt-1 text-xs text-ink/55">JPG, PNG or WEBP (Max 5MB each)</p>
              </div>
              <input
                className="hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileSelect}
              />
              <span className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white">
                Select photos
              </span>
            </label>

            {/* Upload Progress Bar */}
            {submitting && uploadProgress > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-accent">
                  <span>Uploading to Cloudinary...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-mist h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-accent h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Selected Images Previews */}
            {selectedFiles.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-3">
                {selectedFiles.map((fileObj, index) => (
                  <div key={index} className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
                    <img src={fileObj.previewUrl} alt="Preview" className="h-28 w-full object-cover" />
                    <div className="flex items-center justify-between px-3 py-2 text-xs text-ink/55">
                      <span className="truncate max-w-[70%]">{fileObj.file.name}</span>
                      <button
                        type="button"
                        className="font-semibold text-red-600"
                        onClick={() => handleRemoveFile(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
