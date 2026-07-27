import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Chrome, Eye, EyeOff } from "lucide-react";

import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(form);
      navigate(location.state?.from || "/dashboard");
    } catch (submitError) {
      if (submitError?.needsVerification) {
        navigate("/verify-email", { state: { email: submitError.email || form.email } });
      } else {
        setError(submitError.message || "Failed to log in.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    setError("");
    try {
      await googleLogin({
        email: "google.student@gmail.com",
        name: "Google Student",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80",
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-2 sm:px-0">
      {/* Traditional Login Form */}
      <form className="panel space-y-5 p-5 sm:p-8" onSubmit={handleSubmit}>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-ink/45 font-bold">Welcome back</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-ink">Log in to RentEd</h1>
        </div>
        
        <div>
          <label className="text-xs font-bold uppercase text-ink/50 mb-1 block">Email address</label>
          <input
            className="input"
            placeholder="student@college.edu"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
        </div>
        
        <div className="relative">
          <label className="text-xs font-bold uppercase text-ink/50 mb-1 block">Password</label>
          <div className="relative">
            <input
              className="input pr-12"
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-ink/40 hover:text-ink min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end items-center text-xs">
          <Link className="font-bold text-accent hover:underline" to="/forgot-password">
            Forgot Password?
          </Link>
        </div>

        {error ? <p className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p> : null}
        
        <div className="space-y-3 pt-2">
          <Button type="submit" variant="secondary" className="w-full min-h-[48px] font-bold" disabled={submitting}>
            {submitting ? "Logging in..." : "Login"}
          </Button>

          <Button
            type="button"
            onClick={handleGoogleLogin}
            variant="ghost"
            className="w-full flex items-center justify-center gap-2 border border-ink/10 bg-white/50 hover:bg-white min-h-[48px] font-bold"
            disabled={submitting}
          >
            <Chrome className="h-4 w-4 text-red-500" />
            Continue with Google
          </Button>
        </div>

        <p className="text-xs text-center sm:text-left text-ink/60 pt-2">
          New here?{" "}
          <Link className="font-bold text-accent hover:underline" to="/signup">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;
