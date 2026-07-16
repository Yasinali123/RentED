import Dispute from "../models/Dispute.js";
import RentalRequest from "../models/RentalRequest.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { notifyUser, notifyAdmins } from "../utils/notificationHelper.js";
import { getSetting } from "../utils/settingsHelper.js";

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
    // Return all money to student's wallet balance
    if (order.paymentMethod !== "cod") {
      renter.balance += order.totalPrice;
      await renter.save();

      // Log transaction
      await Transaction.create({
        user: renter._id,
        order: order._id,
        amount: order.totalPrice,
        type: "refund",
        status: "completed",
      });
    }

    order.status = "Refund Completed";
    order.trackingStatus = "Refund Completed";
    dispute.status = "resolved_refunded";
  } else if (action === "release") {
    // Release money to seller (after dynamic commission)
    const commissionRate = await getSetting("commission_rate", 10);
    const commission = order.totalPrice * (commissionRate / 100);
    const payout = order.totalPrice - commission;

    seller.balance += payout;
    await seller.save();

    await Transaction.create({
      user: seller._id,
      order: order._id,
      amount: payout,
      type: "release_to_seller",
      status: "completed",
    });

    await Transaction.create({
      user: renter._id,
      order: order._id,
      amount: commission,
      type: "commission",
      status: "completed",
    });

    order.status = "Completed";
    order.trackingStatus = "Completed";
    order.commissionAmount = commission;
    order.earningsReleased = true;
    dispute.status = "resolved_released";
  } else {
    // Dismiss dispute (dismiss means release payout to seller)
    const commissionRate = await getSetting("commission_rate", 10);
    const commission = order.totalPrice * (commissionRate / 100);
    const payout = order.totalPrice - commission;

    seller.balance += payout;
    await seller.save();

    await Transaction.create({
      user: seller._id,
      order: order._id,
      amount: payout,
      type: "release_to_seller",
      status: "completed",
    });

    await Transaction.create({
      user: renter._id,
      order: order._id,
      amount: commission,
      type: "commission",
      status: "completed",
    });

    order.status = "Completed";
    order.trackingStatus = "Completed";
    order.commissionAmount = commission;
    order.earningsReleased = true;
    dispute.status = "dismissed";
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

  res.json({ success: true, message: "Dispute resolved", dispute });
});
