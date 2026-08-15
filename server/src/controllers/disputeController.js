import Dispute from "../models/Dispute.js";
import RentalRequest from "../models/RentalRequest.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import Escrow from "../models/Escrow.js";
import asyncHandler from "../utils/asyncHandler.js";
import { notifyUser, notifyAdmins } from "../utils/notificationHelper.js";
import { getAllPaymentSettings } from "../utils/settingsHelper.js";
import emailService from "../services/emailService.js";
import { createRefund, roundCurrency } from "../services/paymentService.js";

export const raiseDispute = asyncHandler(async (req, res) => {
  const { orderId, reason } = req.body;

  if (!orderId || !reason) {
    res.status(400);
    throw new Error("orderId and reason are required");
  }

  const order = await RentalRequest.findById(orderId).populate("item");
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const isRenter = order.renter.toString() === req.user._id.toString();
  const isOwner = order.owner.toString() === req.user._id.toString();

  if (!isRenter && !isOwner) {
    res.status(403);
    throw new Error("Only involved parties can raise a dispute");
  }

  // Check if already disputed
  if (order.disputed) {
    res.status(400);
    throw new Error("A dispute has already been raised for this order");
  }

  order.disputed = true;
  order.disputeStatus = "pending";
  order.disputeReason = reason;
  await order.save();

  const dispute = await Dispute.create({
    order: order._id,
    raisedBy: req.user._id,
    reason,
    status: "pending",
  });

  // Notify parties
  const otherPartyId = isRenter ? order.owner : order.renter;
  await notifyUser(otherPartyId, "Dispute Raised on Order", `A dispute was raised for order "${order.item?.title}" by the other party. Reason: "${reason}". The funds are on hold.`);
  await notifyUser(req.user._id, "Dispute Filed Successfully", `You have successfully filed a dispute. Admin will review the order details shortly.`);
  await notifyAdmins("Urgent: New Dispute Filed", `Dispute raised on Order ${order._id} by ${req.user.name}. Reason: "${reason}".`);

  // Send email alerts
  try {
    const otherParty = await User.findById(otherPartyId);
    if (otherParty && otherParty.email) {
      await emailService.sendDisputeEmail(otherParty.email, dispute, order, order.item, "created", otherParty.name);
    }
    if (req.user && req.user.email) {
      await emailService.sendDisputeEmail(req.user.email, dispute, order, order.item, "created", req.user.name);
    }
    if (order.totalPrice >= 1000) {
      await emailService.sendAdminAlert(
        "High-Value Dispute Raised",
        `Dispute raised on Order ${order._id} by ${req.user.name} for Rs. ${order.totalPrice}. Reason: "${reason}".`
      );
    }
  } catch (err) {
    console.error("Failed to send dispute raise emails:", err.message);
  }

  res.status(201).json(dispute);
});

export const getDisputes = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied: Admins only");
  }

  const disputes = await Dispute.find({})
    .populate({
      path: "order",
      populate: { path: "item renter owner" },
    })
    .populate("raisedBy", "name email role");

  res.json(disputes);
});

export const resolveDispute = asyncHandler(async (req, res) => {
  const { action, resolutionDetails } = req.body; // action: "refund" or "release" or "dismiss"

  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied: Admins only");
  }

  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) {
    res.status(404);
    throw new Error("Dispute not found");
  }

  if (dispute.status !== "pending") {
    res.status(400);
    throw new Error("Dispute is already resolved");
  }

  const order = await RentalRequest.findById(dispute.order).populate("item");
  if (!order) {
    res.status(404);
    throw new Error("Linked order not found");
  }

  const renter = await User.findById(order.renter);
  const seller = await User.findById(order.owner);

  if (action === "refund") {
    // Unlock seller's pending balance
    if (seller) {
      seller.pendingBalance = Math.max(0, roundCurrency((seller.pendingBalance || 0) - (order.sellerEarnings || 0)));
      await seller.save();
    }

    // Update Escrow record
    const escrow = await Escrow.findOne({ rentalRequest: order._id });
    if (escrow) {
      escrow.status = "refunded";
      await escrow.save();
    }

    // Return money to student's wallet / original payment
    if (order.paymentMethod !== "cod" || order.codCollected) {
      const originalTx = await Transaction.findOne({ order: order._id, type: "payment" });

      if (
        originalTx &&
        originalTx.gateway === "razorpay" &&
        originalTx.paymentId &&
        originalTx.paymentId.startsWith("pay_") &&
        !originalTx.paymentId.startsWith("pay_wallet_")
      ) {
        try {
          const refund = await createRefund(originalTx.paymentId, order.totalPrice);
          originalTx.escrowStatus = "refunded";
          originalTx.refundId = refund.id;
          originalTx.refundStatus = "processed";
          await originalTx.save();

          await Transaction.create({
            user: renter._id,
            order: order._id,
            amount: order.totalPrice,
            type: "refund",
            status: "completed",
            paymentId: refund.id,
            gateway: "razorpay",
            refundId: refund.id,
            refundStatus: "processed",
          });
        } catch (err) {
          console.error("Dispute Razorpay refund failed, fallback to wallet:", err.message);
          renter.balance = roundCurrency((renter.balance || 0) + order.totalPrice);
          await renter.save();

          await Transaction.create({
            user: renter._id,
            order: order._id,
            amount: order.totalPrice,
            type: "refund",
            status: "completed",
          });
        }
      } else {
        if (renter) {
          renter.balance = roundCurrency((renter.balance || 0) + order.totalPrice);
          await renter.save();
        }

        await Transaction.create({
          user: order.renter,
          order: order._id,
          amount: order.totalPrice,
          type: "refund",
          status: "completed",
        });

        if (originalTx) {
          originalTx.escrowStatus = "refunded";
          originalTx.refundStatus = "completed";
          await originalTx.save();
        }
      }
    }

    order.status = "Refund Completed";
    order.trackingStatus = "Refund Completed";
    dispute.status = "resolved_refunded";
  } else {
    // Release or Dismiss: Release earnings to seller and POC
    if (order.earningsReleased) {
      res.status(400);
      throw new Error("Earnings for this order have already been released");
    }

    const settings = await getAllPaymentSettings();
    const deliveryFee = order.deliveryFee || settings.delivery_fee || 50;
    const commissionRate = settings.platform_commission_rate || 10;
    const pocShareRate = settings.poc_share_rate || 80;

    const itemPrice = order.itemPrice || (order.totalPrice - deliveryFee);
    const platformCommission = order.commissionAmount || roundCurrency(itemPrice * (commissionRate / 100));
    const sellerEarnings = order.sellerEarnings || roundCurrency(itemPrice - platformCommission);
    const pocEarnings = order.pocEarnings || roundCurrency(deliveryFee * (pocShareRate / 100));
    const platformDeliveryShare = order.platformDeliveryShare || roundCurrency(deliveryFee - pocEarnings);

    // 1. Credit seller balance and decrement pending balance
    if (seller) {
      seller.balance = roundCurrency((seller.balance || 0) + sellerEarnings);
      seller.pendingBalance = Math.max(0, roundCurrency((seller.pendingBalance || 0) - sellerEarnings));
      await seller.save();
    }

    // 2. Credit POC balance if assigned
    if (order.poc) {
      const pocUser = await User.findById(order.poc);
      if (pocUser) {
        pocUser.balance = roundCurrency((pocUser.balance || 0) + pocEarnings);
        await pocUser.save();

        await Transaction.create({
          user: pocUser._id,
          order: order._id,
          amount: pocEarnings,
          type: "delivery_income",
          status: "completed",
          paidAt: new Date(),
        });
      }
    }

    // 3. Update Escrow record
    const escrow = await Escrow.findOne({ rentalRequest: order._id });
    if (escrow) {
      escrow.status = "released";
      escrow.releasedAt = new Date();
      await escrow.save();
    }

    // 4. Update payment transaction
    const originalTx = await Transaction.findOne({ order: order._id, type: "payment" });
    if (originalTx) {
      originalTx.escrowStatus = "released";
      originalTx.releasedAt = new Date();
      await originalTx.save();
    }

    // 5. Create transaction logs
    await Transaction.create({
      user: order.owner,
      order: order._id,
      amount: sellerEarnings,
      type: "release_to_seller",
      status: "completed",
      paidAt: new Date(),
    });

    await Transaction.create({
      user: req.user._id,
      order: order._id,
      amount: platformCommission,
      type: "commission",
      status: "completed",
      paidAt: new Date(),
    });

    await Transaction.create({
      user: req.user._id,
      order: order._id,
      amount: platformDeliveryShare,
      type: "delivery_commission",
      status: "completed",
      paidAt: new Date(),
    });

    order.status = "Completed";
    order.trackingStatus = "Completed";
    order.commissionAmount = platformCommission;
    order.sellerEarnings = sellerEarnings;
    order.pocEarnings = pocEarnings;
    order.platformDeliveryShare = platformDeliveryShare;
    order.earningsReleased = true;
    dispute.status = action === "release" ? "resolved_released" : "dismissed";
  }

  // Update order dispute status
  order.disputed = false;
  order.disputeStatus = "resolved";
  await order.save();

  dispute.resolutionDetails = resolutionDetails || `Resolved with action: ${action}`;
  await dispute.save();

  // Reset item availability status if refunded
  if (action === "refund") {
    order.item.availabilityStatus = "available";
    await order.item.save();
  }

  // Notify parties
  await notifyUser(renter._id, "Dispute Resolution Update", `The dispute for "${order.item.title}" was resolved. Action: ${action === "refund" ? "Full Refund Issued" : "Funds Released to Seller"}.`);
  await notifyUser(seller._id, "Dispute Resolution Update", `The dispute for "${order.item.title}" was resolved. Action: ${action === "refund" ? "Transaction Cancelled/Refunded" : "Funds Credited to Your Wallet"}.`);

  // Send email alerts
  try {
    if (renter && renter.email) {
      await emailService.sendDisputeEmail(renter.email, dispute, order, order.item, "resolved", renter.name);
      if (action === "refund" && order.paymentMethod !== "cod") {
        await emailService.sendRefundEmail(renter.email, order, order.item);
      }
    }
    if (seller && seller.email) {
      await emailService.sendDisputeEmail(seller.email, dispute, order, order.item, "resolved", seller.name);
      if ((action === "release" || action === "dismiss") && order.paymentMethod !== "cod") {
        await emailService.sendSellerNotification(seller.email, order, order.item, "release_to_seller");
      }
    }
  } catch (err) {
    console.error("Failed to send dispute resolution emails:", err.message);
  }

  res.json({ success: true, message: "Dispute resolved", dispute });
});
