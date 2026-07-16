import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";

import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { collegeApi } from "../api/client";

const initialState = {
  name: "",
  email: "",
  password: "",
  collegeId: "",
  country: "India",
  state: "",
  city: "",
  institutionType: "Engineering",
  collegeName: "",
  campus: "",
  location: "",
  geometry: null,
  avatarUrl: "",
  role: "student",
};

function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [colleges, setColleges] = useState([]);

  useEffect(() => {
    collegeApi
      .list()
      .then(setColleges)
      .catch((err) => console.error("Failed to load colleges:", err));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await signup(form);
      navigate("/dashboard");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setForm((prev) => ({
            ...prev,
            geometry: {
              type: "Point",
              coordinates: [position.coords.longitude, position.coords.latitude],
            },
          }));
          setError("");
        },
        (err) => {
          setError("Could not get your location. Please allow location access.");
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <form className="panel space-y-5 p-8" onSubmit={handleSubmit}>
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-ink/45">Join the campus marketplace</p>
          <h1 className="mt-2 text-4xl font-bold">Create your profile</h1>
        </div>
        
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-ink/50 block mb-2">Register As</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "student", label: "Student", desc: "Rent & Buy" },
              { id: "seller", label: "Seller", desc: "Upload Items" },
              { id: "poc", label: "POC", desc: "Deliver Tasks" },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setForm({ ...form, role: r.id })}
                className={`panel flex flex-col items-center justify-center p-3 text-center border transition-all ${
                  form.role === r.id
                    ? "border-accent bg-accent/5 text-accent shadow-sm"
                    : "border-ink/10 bg-white/50 text-ink/75"
                }`}
              >
                <span className="font-bold text-sm">{r.label}</span>
                <span className="text-[10px] text-ink/50 mt-0.5">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            className="input"
            placeholder="Full name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <input
            className="input"
            placeholder="College email"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
          <input
            className="input"
            placeholder="College ID"
            value={form.collegeId}
            onChange={(event) => setForm({ ...form, collegeId: event.target.value })}
            required
          />
          <input
            className="input"
            placeholder="State"
            value={form.state}
            onChange={(event) => setForm({ ...form, state: event.target.value })}
            required
          />
          <input
            className="input"
            placeholder="City"
            value={form.city}
            onChange={(event) => setForm({ ...form, city: event.target.value })}
            required
          />
          <select
            className="input"
            value={form.institutionType}
            onChange={(event) => setForm({ ...form, institutionType: event.target.value })}
            required
          >
            <option value="Engineering">Engineering</option>
            <option value="Medical">Medical</option>
            <option value="Law">Law</option>
            <option value="Commerce">Commerce</option>
            <option value="School">School</option>
            <option value="Other">Other</option>
          </select>
          <input
            className="input"
            placeholder="College / University Name"
            value={form.collegeName}
            onChange={(event) => setForm({ ...form, collegeName: event.target.value })}
            list="colleges-list"
            required
          />
          <datalist id="colleges-list">
            {colleges.map((c) => (
              <option key={c._id} value={c.name} />
            ))}
          </datalist>
          <input
            className="input"
            placeholder="Campus (Optional)"
            value={form.campus}
            onChange={(event) => setForm({ ...form, campus: event.target.value })}
          />
          <input
            className="input"
            placeholder="Hostel / Neighborhood (Optional)"
            value={form.location}
            onChange={(event) => setForm({ ...form, location: event.target.value })}
          />
        </div>
        <div className="flex items-center justify-between p-4 border border-ink/10 rounded-2xl bg-ink/5">
          <div>
            <p className="font-semibold">GPS Location</p>
            <p className="text-xs text-ink/60">
              {form.geometry ? "Location captured successfully." : "Used for smart proximity recommendations."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleGetLocation}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
              form.geometry ? "bg-green-500 text-white" : "bg-ink/10 hover:bg-ink/20"
            }`}
          >
            <MapPin className="h-4 w-4" />
            {form.geometry ? "Captured" : "Get Location"}
          </button>
        </div>
        <input
          className="input"
          placeholder="Avatar URL (optional)"
          value={form.avatarUrl}
          onChange={(event) => setForm({ ...form, avatarUrl: event.target.value })}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" variant="secondary" className="w-full" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </Button>
        <p className="text-sm text-ink/60">
          Already signed up?{" "}
          <Link className="font-semibold text-accent" to="/login">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default SignupPage;
