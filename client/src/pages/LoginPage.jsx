import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Chrome } from "lucide-react";

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

  return (
    <div className="mx-auto max-w-md">
      {/* Traditional Login Form */}
      <form className="panel space-y-5 p-8" onSubmit={handleSubmit}>
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
    </div>
  );
}

export default LoginPage;
