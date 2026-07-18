import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import cloudinary from "../config/cloudinary.js";
import Invoice from "../models/Invoice.js";
import { sendEmail } from "./emailService.js";
import invoiceEmailTemplate from "../templates/invoiceEmailTemplate.js";

/**
 * Generate a unique invoice number: INV-YYYYMMDD-XXXXX
 */
const generateInvoiceNumber = () => {
  const now = new Date();
  const datePart =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const randomPart = Math.floor(10000 + Math.random() * 90000).toString();
  return `INV-${datePart}-${randomPart}`;
};

/**
 * Calculate rental duration in days.
 */
const getRentalDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.max(Math.ceil(ms / (1000 * 60 * 60 * 24)), 1);
};

/**
 * Generate a QR code data URI from a string.
 */
const generateQRCodeDataURI = async (text) => {
  try {
    return await QRCode.toDataURL(text, { width: 120, margin: 1 });
  } catch (err) {
    console.error("[Invoice] QR Code generation failed:", err.message);
    return null;
  }
};

/**
 * Build and return a PDF buffer using PDFKit.
 */
const generateInvoicePDF = async (invoiceData) => {
  const {
    invoiceNumber,
    date,
    buyerName,
    buyerEmail,
    buyerCollege,
    sellerName,
    sellerEmail,
    itemTitle,
    itemCategory,
    invoiceType,
    quantity,
    rentalDays,
    startDate,
    endDate,
    price,
    deliveryCharge,
    platformCommission,
    totalAmount,
    paymentMethod,
    paymentId,
    orderId,
  } = invoiceData;

  const qrText = `RentED Invoice | ${invoiceNumber} | Order: ${orderId} | Amount: Rs.${totalAmount}`;
  const qrDataURI = await generateQRCodeDataURI(qrText);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    // ─── Header ───────────────────────────────────────────
    doc
      .fontSize(26)
      .fillColor("#4f46e5")
      .font("Helvetica-Bold")
      .text("RentED", margin, margin);

    doc
      .fontSize(8)
      .fillColor("#64748b")
      .font("Helvetica")
      .text("Hyperlocal Student Sharing Escrow Platform", margin, margin + 30);

    doc
      .fontSize(18)
      .fillColor("#94a3b8")
      .font("Helvetica-Bold")
      .text("INVOICE", pageWidth - margin - 120, margin, { width: 120, align: "right" });

    doc
      .fontSize(9)
      .fillColor("#64748b")
      .font("Helvetica")
      .text(`No: ${invoiceNumber}`, pageWidth - margin - 120, margin + 22, { width: 120, align: "right" })
      .text(`Date: ${date}`, pageWidth - margin - 120, margin + 34, { width: 120, align: "right" });

    // Separator
    doc
      .moveTo(margin, margin + 55)
      .lineTo(pageWidth - margin, margin + 55)
      .strokeColor("#e2e8f0")
      .lineWidth(1.5)
      .stroke();

    // ─── Buyer & Seller Details ───────────────────────────
    const detailsY = margin + 70;

    doc
      .fontSize(8)
      .fillColor("#94a3b8")
      .font("Helvetica-Bold")
      .text("BILLED TO (BUYER)", margin, detailsY);

    doc
      .fontSize(10)
      .fillColor("#1e293b")
      .font("Helvetica-Bold")
      .text(buyerName, margin, detailsY + 14);

    doc
      .fontSize(9)
      .fillColor("#64748b")
      .font("Helvetica")
      .text(buyerCollege || "Campus Member", margin, detailsY + 28)
      .text(buyerEmail || "", margin, detailsY + 40);

    doc
      .fontSize(8)
      .fillColor("#94a3b8")
      .font("Helvetica-Bold")
      .text("SOLD BY (SELLER)", pageWidth / 2, detailsY, { width: contentWidth / 2, align: "right" });

    doc
      .fontSize(10)
      .fillColor("#1e293b")
      .font("Helvetica-Bold")
      .text(sellerName, pageWidth / 2, detailsY + 14, { width: contentWidth / 2, align: "right" });

    doc
      .fontSize(9)
      .fillColor("#64748b")
      .font("Helvetica")
      .text("RentED Partner Network", pageWidth / 2, detailsY + 28, { width: contentWidth / 2, align: "right" })
      .text(sellerEmail || "", pageWidth / 2, detailsY + 40, { width: contentWidth / 2, align: "right" });

    // ─── Item Table ───────────────────────────────────────
    const tableTop = detailsY + 65;

    // Table header background
    doc
      .rect(margin, tableTop, contentWidth, 24)
      .fillColor("#f8fafc")
      .fill();

    const cols = [margin + 8, margin + 200, margin + 310, pageWidth - margin - 70];
    const colHeaders = ["Description", "Category", "Type", "Amount"];

    doc.fontSize(8).fillColor("#64748b").font("Helvetica-Bold");
    colHeaders.forEach((header, i) => {
      const align = i === colHeaders.length - 1 ? "right" : "left";
      const w = i === colHeaders.length - 1 ? 60 : 100;
      doc.text(header.toUpperCase(), cols[i], tableTop + 7, { width: w, align });
    });

    // Table row
    const rowY = tableTop + 30;

    doc.fontSize(10).fillColor("#1e293b").font("Helvetica-Bold");
    doc.text(itemTitle || "Product Listing", cols[0], rowY, { width: 185 });

    doc.fontSize(8).fillColor("#64748b").font("Helvetica");
    doc.text(`Order ID: ${orderId}`, cols[0], rowY + 14, { width: 185 });

    doc.fontSize(9).fillColor("#1e293b").font("Helvetica");
    doc.text(itemCategory || "General", cols[1], rowY, { width: 100 });
    doc.text(invoiceType === "rental" ? "Rental" : "Purchase", cols[2], rowY, { width: 100 });
    doc.text(`Rs. ${price}`, cols[3], rowY, { width: 60, align: "right" });

    // Separator
    doc
      .moveTo(margin, rowY + 30)
      .lineTo(pageWidth - margin, rowY + 30)
      .strokeColor("#f1f5f9")
      .lineWidth(0.5)
      .stroke();

    // Rental duration row
    let nextRowY = rowY + 36;
    if (invoiceType === "rental" && rentalDays > 0) {
      doc.fontSize(9).fillColor("#64748b").font("Helvetica");
      doc.text("Rental Duration", cols[0], nextRowY);
      doc.text(
        `${rentalDays} day${rentalDays > 1 ? "s" : ""} (${startDate} → ${endDate})`,
        cols[1],
        nextRowY,
        { width: 250 }
      );
      nextRowY += 18;
    }

    // Quantity row
    doc.fontSize(9).fillColor("#64748b").font("Helvetica");
    doc.text("Quantity", cols[0], nextRowY);
    doc.text(String(quantity), cols[1], nextRowY);
    nextRowY += 18;

    // Payment row
    doc.text("Payment Method", cols[0], nextRowY);
    doc.text(paymentMethod.toUpperCase(), cols[1], nextRowY);
    nextRowY += 14;
    doc.text("Payment ID", cols[0], nextRowY);
    doc.fontSize(8).text(paymentId || "N/A", cols[1], nextRowY, { width: 300 });
    nextRowY += 22;

    // ─── Summary Block ───────────────────────────────────
    const summaryX = pageWidth - margin - 200;
    const summaryW = 200;

    const drawSummaryRow = (label, value, bold = false) => {
      doc.fontSize(9).fillColor("#64748b").font("Helvetica");
      doc.text(label, summaryX, nextRowY, { width: summaryW - 70 });

      doc.fontSize(9).fillColor("#1e293b").font(bold ? "Helvetica-Bold" : "Helvetica");
      doc.text(value, summaryX + summaryW - 70, nextRowY, { width: 70, align: "right" });
      nextRowY += 16;
    };

    drawSummaryRow("Subtotal", `Rs. ${price}`);
    if (deliveryCharge > 0) {
      drawSummaryRow("Delivery Charge", `Rs. ${deliveryCharge}`);
    }
    drawSummaryRow("Platform Commission", `Rs. ${platformCommission}`);

    // Total separator
    doc
      .moveTo(summaryX, nextRowY)
      .lineTo(summaryX + summaryW, nextRowY)
      .strokeColor("#cbd5e1")
      .lineWidth(1)
      .stroke();
    nextRowY += 8;

    doc.fontSize(14).fillColor("#4f46e5").font("Helvetica-Bold");
    doc.text("Total Paid", summaryX, nextRowY, { width: summaryW - 80 });
    doc.text(`Rs. ${totalAmount}`, summaryX + summaryW - 80, nextRowY, { width: 80, align: "right" });
    nextRowY += 30;

    // ─── QR Code ──────────────────────────────────────────
    if (qrDataURI) {
      try {
        doc.image(qrDataURI, margin, nextRowY, { width: 80, height: 80 });
        doc.fontSize(7).fillColor("#94a3b8").font("Helvetica");
        doc.text("Scan to verify invoice", margin, nextRowY + 84, { width: 80, align: "center" });
      } catch (e) {
        // Silently skip if QR fails
      }
    }

    // ─── Footer ───────────────────────────────────────────
    const footerY = nextRowY + 110;

    doc
      .moveTo(margin, footerY)
      .lineTo(pageWidth - margin, footerY)
      .strokeColor("#f1f5f9")
      .lineWidth(0.5)
      .stroke();

    doc
      .fontSize(8)
      .fillColor("#94a3b8")
      .font("Helvetica")
      .text(
        "This invoice is electronically generated. No physical signature is required.",
        margin,
        footerY + 10,
        { width: contentWidth, align: "center" }
      )
      .text(
        "RentED © 2026. For support, reach out to support@rented.com",
        margin,
        footerY + 22,
        { width: contentWidth, align: "center" }
      );

    doc.end();
  });
};

/**
 * Upload PDF buffer to Cloudinary.
 */
const uploadInvoiceToCloudinary = async (pdfBuffer, invoiceNumber) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "rented/invoices",
        public_id: invoiceNumber,
        format: "pdf",
      },
      (error, result) => {
        if (error) {
          console.error("[Invoice] Cloudinary upload failed:", error.message);
          return reject(error);
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(pdfBuffer);
  });
};

/**
 * Create and store an invoice for a completed order.
 * @param {Object} order — A fully populated RentalRequest document
 */
export const createAndStoreInvoice = async (order) => {
  try {
    // Check if invoice already exists for this order
    const existing = await Invoice.findOne({ order: order._id });
    if (existing) {
      console.log(`[Invoice] Invoice already exists for order ${order._id}: ${existing.invoiceNumber}`);
      return existing;
    }

    const invoiceNumber = generateInvoiceNumber();
    const isRental = order.requestType === "rental";
    const rentalDays = isRental ? getRentalDays(order.startDate, order.endDate) : 0;
    const commission = order.commissionAmount || Math.round(order.totalPrice * 0.1);
    const dateStr = new Date(order.createdAt || Date.now()).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const invoiceData = {
      invoiceNumber,
      date: dateStr,
      buyerName: order.renter?.name || "Buyer",
      buyerEmail: order.renter?.email || "",
      buyerCollege: order.renter?.collegeName || order.item?.collegeName || "Campus Member",
      sellerName: order.owner?.name || "Seller",
      sellerEmail: order.owner?.email || "",
      itemTitle: order.item?.title || "Product",
      itemCategory: order.item?.category || "General",
      invoiceType: isRental ? "rental" : "purchase",
      quantity: 1,
      rentalDays,
      startDate: order.startDate
        ? new Date(order.startDate).toLocaleDateString("en-IN")
        : "",
      endDate: order.endDate
        ? new Date(order.endDate).toLocaleDateString("en-IN")
        : "",
      price: order.totalPrice,
      deliveryCharge: 0,
      platformCommission: commission,
      totalAmount: order.totalPrice,
      paymentMethod: order.paymentMethod || "online",
      paymentId: order.paymentReference || order.dummyPaymentReference || "",
      orderId: order._id.toString(),
    };

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoiceData);

    // Upload to Cloudinary
    const { url, publicId } = await uploadInvoiceToCloudinary(pdfBuffer, invoiceNumber);

    // Save Invoice document
    const invoice = await Invoice.create({
      invoiceNumber,
      order: order._id,
      buyer: order.renter?._id || order.renter,
      seller: order.owner?._id || order.owner,
      item: order.item?._id || order.item,
      invoiceType: isRental ? "rental" : "purchase",
      quantity: 1,
      rentalDuration: isRental
        ? { days: rentalDays, startDate: order.startDate, endDate: order.endDate }
        : { days: null, startDate: null, endDate: null },
      price: order.totalPrice,
      deliveryCharge: 0,
      platformCommission: commission,
      totalAmount: order.totalPrice,
      paymentMethod: order.paymentMethod || "online",
      paymentId: order.paymentReference || order.dummyPaymentReference || "",
      pdfUrl: url,
      pdfPublicId: publicId,
      qrCodeData: `RentED Invoice | ${invoiceNumber} | Order: ${order._id} | Amount: Rs.${order.totalPrice}`,
      status: "generated",
    });

    // Email the invoice to the buyer
    try {
      const buyerEmail = order.renter?.email;
      if (buyerEmail) {
        const html = invoiceEmailTemplate({
          buyerName: order.renter?.name || "Customer",
          invoiceNumber,
          itemTitle: order.item?.title || "Product",
          totalAmount: order.totalPrice,
          date: dateStr,
          pdfUrl: url,
        });

        await sendEmail({
          to: buyerEmail,
          subject: `Your RentED Invoice — ${invoiceNumber}`,
          html,
        });

        invoice.status = "emailed";
        invoice.emailedAt = new Date();
        await invoice.save();
      }
    } catch (emailErr) {
      console.error("[Invoice] Failed to email invoice:", emailErr.message);
    }

    console.log(`[Invoice] Created ${invoiceNumber} for order ${order._id} → ${url}`);
    return invoice;
  } catch (error) {
    console.error("[Invoice] Failed to create invoice:", error.message);
    throw error;
  }
};

export default {
  createAndStoreInvoice,
  generateInvoicePDF,
  uploadInvoiceToCloudinary,
};
