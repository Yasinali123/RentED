import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalRequest",
      required: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    invoiceType: {
      type: String,
      enum: ["purchase", "rental"],
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    rentalDuration: {
      days: { type: Number, default: null },
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    platformCommission: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      default: "online",
    },
    paymentId: {
      type: String,
      default: "",
    },
    pdfUrl: {
      type: String,
      default: "",
    },
    pdfPublicId: {
      type: String,
      default: "",
    },
    qrCodeData: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["generated", "emailed", "void"],
      default: "generated",
    },
    emailedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

invoiceSchema.index({ order: 1 });
invoiceSchema.index({ buyer: 1 });
invoiceSchema.index({ seller: 1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ createdAt: -1 });

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
