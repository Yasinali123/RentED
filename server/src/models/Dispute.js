import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalRequest",
      required: true,
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "resolved_refunded", "resolved_released", "dismissed"],
      default: "pending",
    },
    resolutionDetails: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

disputeSchema.index({ order: 1 });
disputeSchema.index({ raisedBy: 1 });
disputeSchema.index({ status: 1 });

const Dispute = mongoose.model("Dispute", disputeSchema);

export default Dispute;
