import express from "express";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import {
  getMyInvoices,
  getSalesInvoices,
  getAllInvoices,
  getInvoiceById,
  downloadInvoice,
  streamInvoicePDF,
  resendInvoice,
  getInvoiceByOrder,
} from "../controllers/invoiceController.js";

const router = express.Router();

// Buyer invoices
router.get("/my", authenticate, getMyInvoices);

// Seller invoices
router.get("/sales", authenticate, getSalesInvoices);

// Admin — all invoices
router.get("/all", authenticate, authorize("admin"), getAllInvoices);

// Get invoice by order ID (also triggers on-demand generation)
router.get("/order/:orderId", authenticate, getInvoiceByOrder);

// Stream PDF directly with application/pdf header
router.get("/:id/pdf", authenticate, streamInvoicePDF);

// Single invoice detail
router.get("/:id", authenticate, getInvoiceById);

// Download PDF info
router.get("/:id/download", authenticate, downloadInvoice);

// Resend invoice email
router.post("/:id/resend", authenticate, resendInvoice);

export default router;
