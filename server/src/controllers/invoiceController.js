import Invoice from "../models/Invoice.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createAndStoreInvoice } from "../services/invoiceService.js";
import { sendEmail } from "../services/emailService.js";
import invoiceEmailTemplate from "../templates/invoiceEmailTemplate.js";
import RentalRequest from "../models/RentalRequest.js";

/**
 * GET /api/invoices/my — Get all invoices for the logged-in buyer.
 */
export const getMyInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ buyer: req.user._id })
    .populate("item", "title category images")
    .populate("seller", "name email")
    .populate("order", "status requestType")
    .sort({ createdAt: -1 });

  res.json(invoices);
});

/**
 * GET /api/invoices/sales — Get all invoices for the logged-in seller.
 */
export const getSalesInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ seller: req.user._id })
    .populate("item", "title category images")
    .populate("buyer", "name email")
    .populate("order", "status requestType")
    .sort({ createdAt: -1 });

  res.json(invoices);
});

/**
 * GET /api/invoices/all — Get all invoices (Admin only).
 */
export const getAllInvoices = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied: Admins only");
  }

  const invoices = await Invoice.find({})
    .populate("item", "title category images")
    .populate("buyer", "name email")
    .populate("seller", "name email")
    .populate("order", "status requestType totalPrice")
    .sort({ createdAt: -1 });

  res.json(invoices);
});

/**
 * GET /api/invoices/:id — Get single invoice detail.
 */
export const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate("item", "title category images")
    .populate("buyer", "name email collegeName")
    .populate("seller", "name email")
    .populate("order", "status requestType totalPrice paymentMethod paymentReference");

  if (!invoice) {
    res.status(404);
    throw new Error("Invoice not found");
  }

  // Only allow buyer, seller, or admin to view
  const userId = req.user._id.toString();
  const isBuyer = invoice.buyer?._id?.toString() === userId;
  const isSeller = invoice.seller?._id?.toString() === userId;
  const isAdmin = req.user.role === "admin";

  if (!isBuyer && !isSeller && !isAdmin) {
    res.status(403);
    throw new Error("Access denied");
  }

  res.json(invoice);
});

/**
 * GET /api/invoices/:id/download — Redirect to Cloudinary PDF URL.
 */
export const downloadInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    res.status(404);
    throw new Error("Invoice not found");
  }

  const userId = req.user._id.toString();
  const isBuyer = invoice.buyer?.toString() === userId;
  const isSeller = invoice.seller?.toString() === userId;
  const isAdmin = req.user.role === "admin";

  if (!isBuyer && !isSeller && !isAdmin) {
    res.status(403);
    throw new Error("Access denied");
  }

  if (!invoice.pdfUrl) {
    res.status(404);
    throw new Error("Invoice PDF not available");
  }

  res.json({ pdfUrl: invoice.pdfUrl });
});

/**
 * POST /api/invoices/:id/resend — Re-send invoice email to the buyer.
 */
export const resendInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate("buyer", "name email")
    .populate("item", "title");

  if (!invoice) {
    res.status(404);
    throw new Error("Invoice not found");
  }

  const userId = req.user._id.toString();
  const isBuyer = invoice.buyer?._id?.toString() === userId;
  const isAdmin = req.user.role === "admin";

  if (!isBuyer && !isAdmin) {
    res.status(403);
    throw new Error("Access denied");
  }

  if (!invoice.buyer?.email) {
    res.status(400);
    throw new Error("Buyer email not found");
  }

  const html = invoiceEmailTemplate({
    buyerName: invoice.buyer?.name || "Customer",
    invoiceNumber: invoice.invoiceNumber,
    itemTitle: invoice.item?.title || "Product",
    totalAmount: invoice.totalAmount,
    date: new Date(invoice.createdAt).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    pdfUrl: invoice.pdfUrl,
  });

  await sendEmail({
    to: invoice.buyer.email,
    subject: `Your RentED Invoice — ${invoice.invoiceNumber}`,
    html,
  });

  invoice.status = "emailed";
  invoice.emailedAt = new Date();
  await invoice.save();

  res.json({ success: true, message: "Invoice resent successfully" });
});

/**
 * GET /api/invoices/order/:orderId — Get invoice by order ID.
 */
export const getInvoiceByOrder = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ order: req.params.orderId })
    .populate("item", "title category images")
    .populate("buyer", "name email collegeName")
    .populate("seller", "name email")
    .populate("order", "status requestType totalPrice");

  if (!invoice) {
    // Try to generate invoice on-demand if order exists
    const order = await RentalRequest.findById(req.params.orderId)
      .populate("item")
      .populate("owner", "name email collegeName")
      .populate("renter", "name email collegeName");

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    // Only generate for completed payment orders
    const validStatuses = [
      "Payment Successful", "Seller Accepted", "POC Assigned",
      "Pickup Scheduled", "Picked Up", "Out For Delivery",
      "Delivered", "Rental Active", "Completed",
    ];

    if (!validStatuses.includes(order.status)) {
      res.status(404);
      throw new Error("Invoice not available for this order status");
    }

    try {
      const newInvoice = await createAndStoreInvoice(order);
      const populated = await Invoice.findById(newInvoice._id)
        .populate("item", "title category images")
        .populate("buyer", "name email collegeName")
        .populate("seller", "name email")
        .populate("order", "status requestType totalPrice");
      return res.json(populated);
    } catch (err) {
      res.status(500);
      throw new Error("Failed to generate invoice: " + err.message);
    }
  }

  // Access check
  const userId = req.user._id.toString();
  const isBuyer = invoice.buyer?._id?.toString() === userId;
  const isSeller = invoice.seller?._id?.toString() === userId;
  const isAdmin = req.user.role === "admin";

  if (!isBuyer && !isSeller && !isAdmin) {
    res.status(403);
    throw new Error("Access denied");
  }

  res.json(invoice);
});
