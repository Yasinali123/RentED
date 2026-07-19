import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";

import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import itemRoutes from "./routes/itemRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import rentalRoutes from "./routes/rentalRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import suggestionRoutes from "./routes/suggestionRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import disputeRoutes from "./routes/disputeRoutes.js";
import collegeRoutes from "./routes/collegeRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");
const hasBuiltClient = fs.existsSync(clientDistPath);

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: function (origin, callback) {
      const isLocalhost = origin && (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"));
      if (!origin || isLocalhost || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "12mb" }));
app.use(morgan("dev"));

// Auth Rate Limiting
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { message: "Too many authentication attempts, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth/login", authRateLimiter);
app.use("/api/auth/signup", authRateLimiter);
app.use("/api/auth/forgot-password", authRateLimiter);
app.use("/api/auth/verify-otp", authRateLimiter);
app.use("/api/auth/verify-email", authRateLimiter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "RentEd API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/suggestions", suggestionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/colleges", collegeRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/invoices", invoiceRoutes);

if (hasBuiltClient) {
  app.use(express.static(clientDistPath));

  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;
