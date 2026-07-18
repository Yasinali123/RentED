import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";
import asyncHandler from "../utils/asyncHandler.js";

// Reusable authenticate middleware (prioritizes cookies)
export const authenticate = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.accessToken;

  // Fallback to Authorization Header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Authentication token is missing. Please log in.");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (!user) {
      res.status(401);
      throw new Error("Account not found.");
    }

    if (user.isSuspended) {
      res.status(403);
      throw new Error("Your account has been suspended by the administrator.");
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    if (error.name === "TokenExpiredError") {
      throw new Error("Access token has expired. Please refresh your session.");
    }
    throw new Error("Invalid access token. Please log in again.");
  }
});

// protect middleware - alias to preserve compatibility with existing routes
export const protect = authenticate;

// Reusable authorize middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      return next(new Error("Authentication required."));
    }
    if (!roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error(`Access denied. Roles allowed: ${roles.join(", ")}`));
    }
    next();
  };
};

// Reusable verifyEmail middleware
export const verifyEmail = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    res.status(401);
    throw new Error("Authentication required.");
  }
  if (!req.user.isEmailVerified) {
    res.status(403);
    throw new Error("Your email address is not verified. Please verify your email to unlock all features.");
  }
  next();
});

// Reusable verifyRole middleware
export const verifyRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      return next(new Error("Authentication required."));
    }
    if (req.user.role !== role) {
      res.status(403);
      return next(new Error(`Access denied. Action restricted to ${role} role only.`));
    }
    next();
  };
};

// Reusable verifySession middleware
export const verifySession = asyncHandler(async (req, res, next) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    res.status(401);
    throw new Error("Refresh token missing. Session expired.");
  }

  const session = await Session.findOne({ userId: req.user._id, refreshToken, isActive: true });

  if (!session) {
    res.status(401);
    throw new Error("Your session is invalid or has been revoked. Please log in again.");
  }

  req.sessionRecord = session;
  next();
});

export const optionalProtect = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.accessToken;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-passwordHash");
      if (user && !user.isSuspended) {
        req.user = user;
      }
    } catch (err) {
      // Silently pass
    }
  }
  next();
});

