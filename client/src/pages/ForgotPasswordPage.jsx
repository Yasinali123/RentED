import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Lock } from "lucide-react";

import { authApi } from "../api/client";
import Button from "../components/ui/Button";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email Input, 2: OTP & New Password Reset
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [receivedOtp, setReceivedOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await authApi.forgotPassword({ email });
      setReceivedOtp(response.otp); // Save the OTP generated in-memory so they see it
      setMessage(`OTP generated successfully! (Mock OTP Code: ${response.otp})`);
      setStep(2);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to generate OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await authApi.verifyOtp({ email, otp, newPassword });
      setMessage("Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Invalid OTP code");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      {step === 1 ? (
        <form className="panel space-y-5 p-8" onSubmit={handleSendOtp}>
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-ink/45">Account Recovery</p>
            <h1 className="mt-2 text-4xl font-bold">Forgot Password</h1>
            <p className="text-sm text-ink/65 mt-2">
              Enter your registered college email and we will send a mock OTP code directly to you:
            </p>
          </div>

          <div className="relative">
            <Mail className="absolute left-4 top-3.5 h-5 w-5 text-ink/40" />
            <input
              type="email"
              placeholder="College email..."
              className="input pl-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" variant="secondary" className="w-full" disabled={submitting}>
            {submitting ? "Generating Code..." : "Send Verification Code"}
          </Button>

          <p className="text-sm text-ink/60">
            Remember password?{" "}
            <Link className="font-semibold text-accent" to="/login">
              Log in
            </Link>
          </p>
        </form>
      ) : (
        <form className="panel space-y-5 p-8" onSubmit={handleResetPassword}>
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-ink/45">OTP Verification</p>
            <h1 className="mt-2 text-4xl font-bold">Verify & Reset</h1>
          </div>

          {message && (
            <div className="rounded-2xl border border-green-200 bg-green-50/20 p-4 flex gap-2 text-xs text-green-800 font-semibold leading-relaxed">
              <ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
              {message}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink/50 uppercase">OTP Code</label>
              <input
                type="text"
                placeholder="Enter 6-digit OTP..."
                className="input text-center tracking-[0.5em] text-lg font-bold"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
              />
            </div>

            <div className="space-y-1 relative">
              <label className="text-xs font-semibold text-ink/50 uppercase">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-ink/40" />
                <input
                  type="password"
                  placeholder="New password..."
                  className="input pl-11"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
            {submitting ? "Resetting Password..." : "Reset Password"}
          </Button>

          <div className="flex justify-between items-center text-sm">
            <button
              type="button"
              className="font-semibold text-ink/60 hover:underline"
              onClick={() => setStep(1)}
            >
              ← Back to Email
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default ForgotPasswordPage;
