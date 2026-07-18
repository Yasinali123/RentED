import express from "express";

import {
  createPaymentIntent,
  verifyPayment,
  handleWebhook,
  requestWithdrawal,
  getWithdrawals,
  processWithdrawal,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/intent", protect, createPaymentIntent);
router.post("/verify", protect, verifyPayment);
router.post("/webhook", handleWebhook);
router.post("/withdraw", protect, requestWithdrawal);
router.get("/withdrawals", protect, getWithdrawals);
router.patch("/withdrawals/:id", protect, processWithdrawal);

export default router;
