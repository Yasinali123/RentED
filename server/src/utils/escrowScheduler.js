import RentalRequest from "../models/RentalRequest.js";
import User from "../models/User.js";
import Escrow from "../models/Escrow.js";
import Transaction from "../models/Transaction.js";
import { getSetting, getAllPaymentSettings } from "./settingsHelper.js";
import { notifyUser, notifyAdmins } from "./notificationHelper.js";
import { roundCurrency } from "../services/paymentService.js";
import emailService from "../services/emailService.js";

/**
 * Checks for delivered orders whose escrow holding period has elapsed and auto-releases funds to sellers.
 */
export const checkAndAutoReleaseEscrow = async () => {
  try {
    const autoReleaseHours = await getSetting("escrow_auto_release_hours", 24);
    const cutoffTime = new Date(Date.now() - autoReleaseHours * 60 * 60 * 1000);

    const eligibleOrders = await RentalRequest.find({
      status: "Delivered",
      earningsReleased: false,
      disputed: false,
      updatedAt: { $lte: cutoffTime },
    }).populate("item");

    if (!eligibleOrders || eligibleOrders.length === 0) {
      return;
    }

    console.log(`[Escrow Scheduler] Processing ${eligibleOrders.length} orders eligible for auto-release...`);

    const settings = await getAllPaymentSettings();
    const deliveryFeeDefault = settings.delivery_fee || 50;
    const commissionRate = settings.platform_commission_rate || 10;
    const pocShareRate = settings.poc_share_rate || 80;

    for (const request of eligibleOrders) {
      const isRental = request.requestType === "rental";

      const deliveryFee = request.deliveryFee || deliveryFeeDefault;
      const itemPrice = request.itemPrice || (request.totalPrice - deliveryFee);
      const platformCommission = request.commissionAmount || roundCurrency(itemPrice * (commissionRate / 100));
      const sellerEarnings = request.sellerEarnings || roundCurrency(itemPrice - platformCommission);
      const pocEarnings = request.pocEarnings || roundCurrency(deliveryFee * (pocShareRate / 100));
      const platformDeliveryShare = request.platformDeliveryShare || roundCurrency(deliveryFee - pocEarnings);

      // Release earnings to seller
      const seller = await User.findById(request.owner);
      if (seller) {
        seller.balance = roundCurrency((seller.balance || 0) + sellerEarnings);
        seller.pendingBalance = Math.max(0, roundCurrency((seller.pendingBalance || 0) - sellerEarnings));
        await seller.save();
      }

      // Release delivery fee share to POC if assigned
      if (request.poc) {
        const pocUser = await User.findById(request.poc);
        if (pocUser) {
          pocUser.balance = roundCurrency((pocUser.balance || 0) + pocEarnings);
          await pocUser.save();

          await Transaction.create({
            user: pocUser._id,
            order: request._id,
            amount: pocEarnings,
            type: "delivery_income",
            status: "completed",
            paidAt: new Date(),
          });
        }
      }

      // Update Escrow record
      const escrow = await Escrow.findOne({ rentalRequest: request._id });
      if (escrow) {
        escrow.status = "released";
        escrow.releasedAt = new Date();
        await escrow.save();
      }

      // Update original payment transaction
      try {
        const originalTx = await Transaction.findOne({ order: request._id, type: "payment" });
        if (originalTx) {
          originalTx.escrowStatus = "released";
          originalTx.releasedAt = new Date();
          await originalTx.save();
        }
      } catch (err) {
        console.error("Failed to update original transaction escrow status:", err.message);
      }

      // Log transactions
      await Transaction.create({
        user: request.owner,
        order: request._id,
        amount: sellerEarnings,
        type: "release_to_seller",
        status: "completed",
        paidAt: new Date(),
      });

      await Transaction.create({
        user: request.renter,
        order: request._id,
        amount: platformCommission,
        type: "commission",
        status: "completed",
        paidAt: new Date(),
      });

      await Transaction.create({
        user: request.renter,
        order: request._id,
        amount: platformDeliveryShare,
        type: "delivery_commission",
        status: "completed",
        paidAt: new Date(),
      });

      request.status = isRental ? "Rental Active" : "Completed";
      request.trackingStatus = request.status;
      request.commissionAmount = platformCommission;
      request.sellerEarnings = sellerEarnings;
      request.pocEarnings = pocEarnings;
      request.platformDeliveryShare = platformDeliveryShare;
      request.earningsReleased = true;
      request.trackingHistory.push({ status: request.status, location: "Escrow Auto-Released by System" });
      await request.save();

      await notifyUser(request.owner, "Auto-Release: Earnings Credited!", `Rs. ${sellerEarnings} auto-released to your wallet for order "${request.item?.title || request._id}".`);
      if (request.poc) {
        await notifyUser(request.poc, "Delivery Fee Credited!", `Rs. ${pocEarnings} delivery income credited to your wallet for order ${request._id}.`);
      }
      await notifyUser(request.renter, "Escrow Auto-Released", `Order receipt auto-confirmed after ${autoReleaseHours} hours. Escrow funds released.`);
      await notifyAdmins("Escrow Auto-Released", `Order ID ${request._id}: auto-released Rs. ${sellerEarnings} to Seller.`);

      try {
        if (seller && seller.email) {
          await emailService.sendSellerNotification(seller.email, request, request.item, "release_to_seller");
        }
      } catch (err) {
        console.error("Failed to send seller payout email:", err.message);
      }
    }
  } catch (err) {
    console.error("[Escrow Scheduler] Error during auto-release check:", err.message);
  }
};

/**
 * Initializes the Escrow Auto-Release Scheduler timer (runs every 15 minutes).
 */
export const initEscrowAutoReleaseScheduler = () => {
  console.log("🚀 [Escrow Scheduler] Initializing Escrow Auto-Release background service (Interval: 15 min)...");
  // Run once on startup after 30 seconds
  setTimeout(checkAndAutoReleaseEscrow, 30000);
  // Run every 15 minutes
  setInterval(checkAndAutoReleaseEscrow, 15 * 60 * 1000);
};

export default {
  checkAndAutoReleaseEscrow,
  initEscrowAutoReleaseScheduler,
};
