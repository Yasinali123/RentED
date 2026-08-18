import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";

import AppShell from "./components/layout/AppShell";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import CheckoutPage from "./pages/CheckoutPage";
import ItemDetailsPage from "./pages/ItemDetailsPage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import MarketplacePage from "./pages/MarketplacePage";
import SellRentPage from "./pages/SellRentPage";
import SignupPage from "./pages/SignupPage";
import EmailVerificationPage from "./pages/EmailVerificationPage";

function App() {
  // Warm up Render backend on app initial load
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || "/api";
    const healthEndpoint = `${apiUrl.replace(/\/$/, "")}/health`;
    
    // Non-blocking ping to wake up free-tier backend from sleep
    fetch(healthEndpoint, { method: "GET", mode: "cors" }).catch(() => {
      // Ignore background ping errors
    });
  }, []);

  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route
            path="/sell-rent"
            element={
              <ProtectedRoute allowedRoles={["seller", "student", "admin"]}>
                <SellRentPage />
              </ProtectedRoute>
            }
          />
          <Route path="/items/:itemId" element={<ItemDetailsPage />} />
          <Route
            path="/checkout/:itemId"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-email" element={<EmailVerificationPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
