import path from "path";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// Set up storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "rented_uploads",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

// File filter for file types
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp/;
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedExtensions.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error("Only JPG, JPEG, PNG, and WEBP image files are allowed."));
};

// Multer upload config
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Middleware for multiple photo uploads (max 5)
export const uploadPhotos = (req, res, next) => {
  const uploadArray = upload.array("photos", 5);

  uploadArray(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      res.status(400);
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new Error("File too large. Maximum size allowed is 5MB per image."));
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return next(new Error("Too many files uploaded. Maximum is 5 images."));
      }
      return next(new Error(`Upload error: ${err.message}`));
    } else if (err) {
      res.status(400);
      return next(err);
    }
    next();
  });
};

// Middleware for user profile avatar upload (single)
export const uploadAvatar = (req, res, next) => {
  const uploadSingle = upload.single("avatar");

  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      res.status(400);
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new Error("File too large. Maximum size allowed is 5MB."));
      }
      return next(new Error(`Upload error: ${err.message}`));
    } else if (err) {
      res.status(400);
      return next(err);
    }
    next();
  });
};
