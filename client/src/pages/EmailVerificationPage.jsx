import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";

function EmailVerificationPage() {
  const { verifyEmail } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Try to pre-populate email from route state
  const initialEmail = location.state?.email || "";
  
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !otp) {
      setError("Please fill out both email and verification code.");
      return;
    }
    if (otp.length < 6) {
      setError("Verification code must be exactly 6 digits.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await verifyEmail({ email: email.trim().toLowerCase(), otp: otp.trim() });
      setSuccess("Account activated successfully! Logging you in...");
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md my-16">
      <div className="panel p-8 space-y-6 bg-white border border-ink/10 shadow-xl rounded-3xl">
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 bg-accent/5 rounded-full text-accent mb-2">
            <Mail className="h-10 w-10 animate-bounce" />
          </div>
          <h1 className="text-3xl font-black text-ink uppercase tracking-wide">Verify Your Email</h1>
          <p className="text-xs text-ink/50 leading-relaxed">
            We have emailed a 6-digit verification code. Please enter it below to activate your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-ink/50 block">College Email</label>
            <input
              type="email"
              className="input w-full py-2.5 px-4 text-sm"
              placeholder="name@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || !!initialEmail}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-ink/50 block">6-Digit Verification Code</label>
            <input
              type="text"
              maxLength={6}
              className="input w-full py-2.5 px-4 text-center text-lg font-mono font-black tracking-widest"
              placeholder="e.g. 123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2 text-xs font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-2 text-xs font-semibold text-green-700 animate-pulse">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="secondary"
            className="w-full py-2.5 uppercase font-bold text-xs"
            disabled={loading}
          >
            {loading ? "Activating account..." : "Activate Account"}
          </Button>
        </form>

        <div className="text-center text-xs text-ink/40 border-t border-ink/5 pt-4">
          Did not receive a code?{" "}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            Go back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default EmailVerificationPage;
