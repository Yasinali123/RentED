import express from "express";

import { createPaymentIntent, verifyPayment } from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/intent", protect, createPaymentIntent);
router.post("/verify", protect, verifyPayment);

export default router;
