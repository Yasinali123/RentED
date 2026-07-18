import path from "path";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// File filter for security: Accept only image MIME types, reject executables
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp/i;
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedExtensions.test(file.mimetype);

  // Security Check: Accept only images, reject executables or script files
  if (file.mimetype.startsWith("image/") && extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error("Security Error: Only JPG, JPEG, PNG, and WEBP image files are allowed. Executable and non-image files are strictly rejected."));
};

// Storage configuration for items
const itemStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "RentED/items",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ quality: "auto", fetch_format: "auto" }],
    public_id: (req, file) => {
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
      return `${name}_${Date.now()}`;
    },
  },
});

// Storage configuration for profile avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "RentED/avatars",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ quality: "auto", fetch_format: "auto" }],
    public_id: (req, file) => {
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
      return `${name}_${Date.now()}`;
    },
  },
});

// Multer upload configurations
const uploadItemsMulter = multer({
  storage: itemStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter,
});

const uploadAvatarMulter = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter,
});

// Helper function to handle standard errors and Cloudinary availability errors
const handleUploadError = (err, res, next, messagePrefix) => {
  if (err instanceof multer.MulterError) {
    res.status(400);
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(new Error(`${messagePrefix} File too large. Maximum size allowed is 10MB.`));
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return next(new Error(`${messagePrefix} Too many files uploaded. Maximum is 5 images.`));
    }
    return next(new Error(`${messagePrefix} Upload error: ${err.message}`));
  } else if (err) {
    // Check if error is due to Cloudinary service/credentials failure
    const errStr = String(err.message || "").toLowerCase();
    if (
      errStr.includes("cloudinary") || 
      errStr.includes("cloud_name") || 
      errStr.includes("api_key") || 
      errStr.includes("credentials") || 
      errStr.includes("enoent") ||
      errStr.includes("auth")
    ) {
      res.status(503);
      return next(new Error("Image upload service (Cloudinary) is currently unavailable. Please check backend config."));
    }
    res.status(400);
    return next(err);
  }
  next();
};

// Middleware for multiple photo uploads (max 5)
export const uploadPhotos = (req, res, next) => {
  const uploadArray = uploadItemsMulter.array("photos", 5);

  uploadArray(req, res, (err) => {
    handleUploadError(err, res, next, "Photos Upload:");
  });
};

// Middleware for user profile avatar upload (single)
export const uploadAvatar = (req, res, next) => {
  const uploadSingle = uploadAvatarMulter.single("avatar");

  uploadSingle(req, res, (err) => {
    handleUploadError(err, res, next, "Avatar Upload:");
  });
};

// Storage configuration for chat attachments (images and PDFs)
const chatStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "RentED/chat",
    allowed_formats: ["jpg", "png", "jpeg", "webp", "pdf"],
    transformation: [{ quality: "auto", fetch_format: "auto" }],
    public_id: (req, file) => {
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
      return `${name}_${Date.now()}`;
    },
  },
});

const uploadChatAttachmentMulter = multer({
  storage: chatStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|webp|pdf/i;
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedExtensions.test(file.mimetype) || file.mimetype === "application/pdf";

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Security Error: Only image files (JPG, JPEG, PNG, WEBP) and PDFs are allowed."));
  },
});

// Middleware for chat attachment upload (single)
export const uploadChatAttachment = (req, res, next) => {
  const uploadSingle = uploadChatAttachmentMulter.single("attachment");

  uploadSingle(req, res, (err) => {
    handleUploadError(err, res, next, "Chat Attachment Upload:");
  });
};
