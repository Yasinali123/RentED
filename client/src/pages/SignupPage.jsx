import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Eye, EyeOff } from "lucide-react";

import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { collegeApi, authApi } from "../api/client";

const initialState = {
  name: "",
  email: "",
  phone: "",
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

  // Verification flow states
  const [isVerified, setIsVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState("");

  const handleContactChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setIsVerified(false);
    setVerificationToken("");
    setOtpSent(false);
    setOtpCode("");
    setVerificationFeedback("");
  };

  useEffect(() => {
    collegeApi
      .list()
      .then(setColleges)
      .catch((err) => console.error("Failed to load colleges:", err));
  }, []);

  const handleSendVerificationCode = async () => {
    if (!form.email || !form.phone) {
      setVerificationFeedback("Please enter both email and phone number first.");
      return;
    }
    setSendingOtp(true);
    setVerificationFeedback("");
    setError("");
    try {
      const response = await authApi.sendSignupOtp({
        email: form.email,
        phone: form.phone,
      });
      if (response.success) {
        setOtpSent(true);
        setVerificationFeedback("Verification code sent! Please check your email.");
      }
    } catch (err) {
      setVerificationFeedback(err?.response?.data?.message || err?.message || "Failed to send code.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!otpCode) {
      setVerificationFeedback("Please enter the 6-digit verification code.");
      return;
    }
    setVerifyingOtp(true);
    setVerificationFeedback("");
    try {
      const response = await authApi.verifySignupOtp({
        email: form.email,
        phone: form.phone,
        otp: otpCode,
      });
      if (response.success) {
        setIsVerified(true);
        setVerificationToken(response.verificationToken);
        setVerificationFeedback("Email and phone number verified successfully! ✅");
      }
    } catch (err) {
      setVerificationFeedback(err?.response?.data?.message || err?.message || "Invalid or expired verification code.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await signup({ ...form, verificationToken });
      if (response.needsVerification) {
        navigate("/verify-email", { state: { email: form.email } });
      } else {
        navigate("/dashboard");
      }
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
      <form className="panel space-y-6 p-8" onSubmit={handleSubmit}>
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
                disabled={submitting}
                className={`panel flex flex-col items-center justify-center p-3 text-center border transition-all ${
                  form.role === r.id
                    ? "border-accent bg-accent/5 text-accent shadow-sm"
                    : "border-ink/10 bg-white/50 text-ink/75"
                } ${submitting ? "cursor-not-allowed opacity-75" : ""}`}
              >
                <span className="font-bold text-sm">{r.label}</span>
                <span className="text-[10px] text-ink/50 mt-0.5">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 1: Contact Verification */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-ink border-b border-ink/5 pb-2">Step 1: Contact Details & Verification</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-ink/50 block">Full Name</label>
              <input
                className="input"
                placeholder="Full name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-ink/50 block">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-ink/50 block">College Email</label>
              <input
                className="input"
                placeholder="College email"
                type="email"
                value={form.email}
                onChange={(event) => handleContactChange("email", event.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-ink/50 block">Phone Number</label>
              <input
                className="input"
                placeholder="Phone number"
                type="tel"
                value={form.phone}
                onChange={(event) => handleContactChange("phone", event.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>

          {/* OTP Verification Controls */}
          {!isVerified && (
            <div className="rounded-2xl border border-ink/10 bg-canvas/40 p-4 space-y-4">
              {!otpSent ? (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                  <p className="text-xs text-ink/65 leading-relaxed">We will generate a verification code for security checks before unlocking campus setup details.</p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs py-2 px-6 font-bold whitespace-nowrap"
                    onClick={handleSendVerificationCode}
                    disabled={sendingOtp || !form.email || !form.phone}
                  >
                    {sendingOtp ? "Generating code..." : "Send Verification Code"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-black uppercase text-ink/50 block">Enter Verification Code</label>
                      <input
                        className="input text-xs font-mono font-bold text-center tracking-widest py-2"
                        placeholder="e.g. 123456"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="text-xs py-2.5 px-6 font-bold"
                        onClick={handleVerifyCode}
                        disabled={verifyingOtp || otpCode.length < 6}
                      >
                        {verifyingOtp ? "Verifying..." : "Verify Code"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-xs py-2.5 px-4 font-bold border border-ink/15 hover:bg-canvas/50"
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode("");
                          setVerificationFeedback("");
                        }}
                      >
                        Edit Contact
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {verificationFeedback && (
            <p className={`text-xs font-semibold ${isVerified ? "text-green-700 bg-green-50/50 p-3 rounded-2xl border border-green-200" : "text-red-600"}`}>
              {verificationFeedback}
            </p>
          )}
        </div>

        {/* Step 2: College Network Profile details */}
        {isVerified && (
          <div className="space-y-4 animate-[fadeSlideUp_0.5s_ease-out]">
            <h2 className="text-lg font-bold text-ink border-b border-ink/5 pb-2">Step 2: Campus & Network Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
        )}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {isVerified && (
          <Button type="submit" variant="secondary" className="w-full" disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
          </Button>
        )}

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
