import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Chrome, Shield, UserCheck } from "lucide-react";

import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
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

  const quickLogins = [
    { name: "Mira Patel", email: "mira@campus.edu", role: "Student (Renter)", color: "border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 text-indigo-700" },
    { name: "Aiden Thomas", email: "aiden@campus.edu", role: "Seller (Merchant)", color: "border-emerald-200 hover:border-emerald-400 bg-emerald-50/40 text-emerald-700" },
    { name: "Neha Sharma", email: "neha@campus.edu", role: "Verified POC", color: "border-orange-200 hover:border-orange-400 bg-orange-50/40 text-orange-700" },
    { name: "Rohan Verma", email: "rohan@campus.edu", role: "Platform Admin", color: "border-purple-200 hover:border-purple-400 bg-purple-50/40 text-purple-700" },
  ];

  const handleQuickLogin = async (email) => {
    setSubmitting(true);
    setError("");
    try {
      await login({ email, password: "password123" });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl grid gap-8 md:grid-cols-2">
      {/* Traditional Login Form */}
      <form className="panel space-y-5 p-8 self-start" onSubmit={handleSubmit}>
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-ink/45">Welcome back</p>
          <h1 className="mt-2 text-4xl font-bold">Log in to RentEd</h1>
        </div>
        
        <input
          className="input"
          placeholder="Email"
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

        <div className="flex justify-between items-center text-sm">
          <Link className="font-semibold text-accent hover:underline" to="/forgot-password">
            Forgot Password?
          </Link>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        
        <div className="space-y-3">
          <Button type="submit" variant="secondary" className="w-full" disabled={submitting}>
            {submitting ? "Logging in..." : "Login"}
          </Button>

          <Button
            type="button"
            onClick={handleGoogleLogin}
            variant="ghost"
            className="w-full flex items-center justify-center gap-2 border border-ink/10 bg-white/50 hover:bg-white"
            disabled={submitting}
          >
            <Chrome className="h-4 w-4 text-red-500" />
            Continue with Google
          </Button>
        </div>

        <p className="text-sm text-ink/60">
          New here?{" "}
          <Link className="font-semibold text-accent" to="/signup">
            Create an account
          </Link>
        </p>
      </form>

      {/* Quick Role-Based Testing Dashboard switcher */}
      <div className="panel p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-accent" />
            Evaluation Sandbox
          </h2>
          <p className="text-sm text-ink/65 mt-2">
            RentED is fully role-based. Switch instantly between student, merchant, dispatcher, and administrator accounts to test the complete transaction lifecycle:
          </p>
        </div>

        <div className="grid gap-3">
          {quickLogins.map((q) => (
            <button
              key={q.email}
              type="button"
              onClick={() => handleQuickLogin(q.email)}
              className={`flex items-center justify-between p-4 border rounded-2xl transition-all hover:scale-102 hover:shadow-sm text-left ${q.color}`}
            >
              <div>
                <p className="font-bold text-sm">{q.name}</p>
                <p className="text-xs text-ink/60 mt-0.5">{q.email}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-current bg-white/50">
                  {q.role}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/20 p-4 flex gap-3 text-xs leading-5 text-purple-800">
          <Shield className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Sandboxed Testing Guide:</p>
            <p className="mt-1 text-purple-950/70">
              Log in as <b>Mira (Student)</b> to buy/rent an item, then switch to <b>Aiden (Seller)</b> to accept it, <b>Neha (POC)</b> to pick up and deliver, and <b>Admin</b> to view commission shares.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
