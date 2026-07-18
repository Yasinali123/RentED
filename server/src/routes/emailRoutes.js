import express from "express";
import emailService from "../services/emailService.js";

const router = express.Router();

router.get("/test", async (req, res) => {
  const { to, type } = req.query;

  if (!to) {
    return res.status(400).json({ success: false, message: "Query parameter 'to' is required." });
  }

  const dummyOrder = {
    _id: "65b1d40a3333333333333333",
    totalPrice: 450,
    paymentMethod: "online",
    requestType: "rental",
    startDate: new Date(),
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    deliveryAddress: "Hostel 3, Room 45, Ahmedabad Design Campus",
    pickupQrCode: "P-123456",
    deliveryQrCode: "D-654321",
    commissionAmount: 45,
    poc: {
      name: "John Doe (POC)",
      phone: "+91 98765 43210",
    },
  };

  const dummyItem = {
    title: "Engineering Physics Textbook",
    category: "Books",
    location: "Block B, Room 102",
  };

  const dummyDispute = {
    reason: "Damaged book pages on delivery",
    status: "resolved",
    resolutionNotes: "Seller offered replacement, order completed.",
  };

  try {
    let result;
    switch (type) {
      case "welcome":
        result = await emailService.sendWelcomeEmail(to, "Test Student");
        break;
      case "otp":
        result = await emailService.sendOTPEmail(to, "123456", "signup");
        break;
      case "reset":
        result = await emailService.sendOTPEmail(to, "987654", "reset");
        break;
      case "reset-confirm":
        result = await emailService.sendPasswordResetConfirmationEmail(to, "Test Student");
        break;
      case "order":
        result = await emailService.sendOrderConfirmation(to, dummyOrder, dummyItem);
        break;
      case "cancel":
        result = await emailService.sendOrderCancelledEmail(to, dummyOrder, dummyItem, "buyer");
        break;
      case "seller-order":
        result = await emailService.sendSellerNotification(to, dummyOrder, dummyItem, "new_order");
        break;
      case "seller-payout":
        result = await emailService.sendSellerNotification(to, dummyOrder, dummyItem, "release_to_seller");
        break;
      case "pickup-assigned":
        result = await emailService.sendPickupNotification(to, dummyOrder, dummyItem, "poc");
        break;
      case "delivery-out":
        result = await emailService.sendDeliveryConfirmation(to, dummyOrder, dummyItem, "Out For Delivery");
        break;
      case "delivery-done":
        result = await emailService.sendDeliveryConfirmation(to, dummyOrder, dummyItem, "Delivered");
        break;
      case "refund":
        result = await emailService.sendRefundEmail(to, dummyOrder, dummyItem);
        break;
      case "withdrawal":
        result = await emailService.sendWithdrawalEmail(to, "Test Seller", 500, 1200);
        break;
      case "dispute":
        result = await emailService.sendDisputeEmail(to, dummyDispute, dummyOrder, dummyItem, "created", "Test Student");
        break;
      case "admin":
        result = await emailService.sendEmail({
          to,
          subject: "Test Admin Alert",
          html: "<h3>Admin Alert Test</h3><p>This is a testing alert message from the RentED admin channel.</p>",
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `Unknown email type '${type}'. Valid types are: welcome, otp, reset, reset-confirm, order, cancel, seller-order, seller-payout, pickup-assigned, delivery-out, delivery-done, refund, withdrawal, dispute, admin.`,
        });
    }

    if (result && result.success) {
      return res.json({ success: true, message: `Test email of type '${type}' sent successfully to ${to}.` });
    } else {
      return res.status(500).json({ success: false, message: `Failed to send email.`, error: result?.error });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
