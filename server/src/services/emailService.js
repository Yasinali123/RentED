import transporter, { sendResendEmail, sendBrevoEmail } from "../config/emailConfig.js";
import welcomeTemplate from "../templates/welcomeTemplate.js";
import otpTemplate from "../templates/otpTemplate.js";
import passwordResetTemplate from "../templates/passwordResetTemplate.js";
import orderPlacedTemplate from "../templates/orderPlacedTemplate.js";
import orderCancelledTemplate from "../templates/orderCancelledTemplate.js";
import sellerOrderTemplate from "../templates/sellerOrderTemplate.js";
import pickupAssignedTemplate from "../templates/pickupAssignedTemplate.js";
import deliveryTemplate from "../templates/deliveryTemplate.js";
import withdrawalTemplate from "../templates/withdrawalTemplate.js";
import refundTemplate from "../templates/refundTemplate.js";
import disputeTemplate from "../templates/disputeTemplate.js";
import { baseLayout } from "../templates/baseLayout.js";
import User from "../models/User.js";

/**
 * Base email sender with retry mechanism and Resend / Brevo API integration.
 */
export const sendEmail = async ({ to, subject, html }) => {
  const maxRetries = 1; // Reduced from 2 to 1 to prevent extremely long request hangs on connection timeout
  let attempts = 0;

  while (attempts <= maxRetries) {
    try {
      let result;
      if (process.env.BREVO_API_KEY) {
        result = await sendBrevoEmail({ to, subject, html });
      } else if (process.env.RESEND_API_KEY) {
        result = await sendResendEmail({ to, subject, html });
      } else {
        const info = await transporter.sendMail({
          from: `"${process.env.SENDER_NAME || 'RentED Support'}" <${process.env.EMAIL_USER}>`,
          to,
          subject,
          html,
        });
        result = { success: true, messageId: info.messageId };
      }

      console.log(
        `[Email Log] SUCCESS | Timestamp: ${new Date().toISOString()} | To: ${to} | Subject: "${subject}" | MsgId: ${result.messageId} | Attempts: ${attempts + 1}`
      );
      return { success: true, messageId: result.messageId };
    } catch (error) {
      attempts++;
      console.error(
        `[Email Log] RETRYING | Attempt ${attempts} Failed | Timestamp: ${new Date().toISOString()} | To: ${to} | Subject: "${subject}" | Error: ${error.message}`
      );

      if (attempts > maxRetries) {
        console.error(
          `[Email Log] FAILURE | Final Failure | Timestamp: ${new Date().toISOString()} | To: ${to} | Subject: "${subject}" | Error: ${error.message}`
        );
        return { success: false, error: error.message };
      }

      // 1.5 second backoff delay before retrying connection
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
};

/**
 * Send OTP for verification or password reset.
 */
export const sendOTPEmail = async (email, otp, type) => {
  const subject = type === "reset" ? "Reset Your RentED Password" : "Verify Your RentED Account";
  const html = otpTemplate(otp, type);
  return sendEmail({ to: email, subject, html });
};

/**
 * Send Welcome email.
 */
export const sendWelcomeEmail = async (email, name) => {
  const subject = "Welcome to RentED!";
  const html = welcomeTemplate(name);
  return sendEmail({ to: email, subject, html });
};

/**
 * Send password reset confirmation email.
 */
export const sendPasswordResetConfirmationEmail = async (email, name) => {
  const subject = "Your RentED Password was Changed";
  const html = passwordResetTemplate(name);
  return sendEmail({ to: email, subject, html });
};

/**
 * Send Order Placement/Confirmation email to Buyer.
 */
export const sendOrderConfirmation = async (email, order, item) => {
  const subject = `Order Confirmed: ${item.title}`;
  const html = orderPlacedTemplate(order, item);
  return sendEmail({ to: email, subject, html });
};

/**
 * Send Order Cancellation email.
 */
export const sendOrderCancelledEmail = async (email, order, item, initiatorRole) => {
  const subject = `Order Cancelled: ${item.title}`;
  const html = orderCancelledTemplate(order, item, initiatorRole);
  return sendEmail({ to: email, subject, html });
};

/**
 * Send Seller alert email (new order or wallet payout release).
 */
export const sendSellerNotification = async (email, order, item, action) => {
  const subject = action === "new_order" ? `New Order Received for: ${item.title}` : `Funds Released: ${item.title}`;
  const html = sellerOrderTemplate(order, item, action);
  return sendEmail({ to: email, subject, html });
};

/**
 * Send Pickup/Delivery Logistics Assignment notification to POC or Buyer/Seller.
 */
export const sendPickupNotification = async (email, order, item, role) => {
  const subject = role === "poc" ? `New Courier Task Claimed: #${order._id}` : `Campus Courier Assigned for: ${item.title}`;
  const html = pickupAssignedTemplate(order, item, role);
  return sendEmail({ to: email, subject, html });
};

/**
 * Send Delivery Status update notification to Buyer.
 */
export const sendDeliveryConfirmation = async (email, order, item, status) => {
  const subject = `Delivery Update: ${status}`;
  const html = deliveryTemplate(order, item, status);
  return sendEmail({ to: email, subject, html });
};

/**
 * Send Refund completed confirmation email.
 */
export const sendRefundEmail = async (email, order, item) => {
  const subject = `Refund Processed for: ${item.title}`;
  const html = refundTemplate(order, item);
  return sendEmail({ to: email, subject, html });
};

/**
 * Send Withdrawal request completed email.
 */
export const sendWithdrawalEmail = async (email, name, amount, balance) => {
  const subject = `Withdrawal Request Completed: Rs. ${amount}`;
  const html = withdrawalTemplate(name, amount, balance);
  return sendEmail({ to: email, subject, html });
};

/**
 * Send Dispute status alert to Buyer or Seller.
 */
export const sendDisputeEmail = async (email, dispute, order, item, action, recipientName) => {
  const subject = `Dispute Update: ${action.toUpperCase()} - Order #${order._id}`;
  const html = disputeTemplate(dispute, order, item, action, recipientName);
  return sendEmail({ to: email, subject, html });
};

/**
 * Notify administrators about important events.
 */
export const sendAdminAlert = async (subject, message) => {
  try {
    const admins = await User.find({ role: "admin" });
    const content = `
      <h2>Admin Alert Notification 🚨</h2>
      <div class="card">
        <p><b>Event</b>: ${subject}</p>
        <p><b>Message</b>: ${message}</p>
      </div>
      <p style="color: #64748b; font-size: 11px;">This is an automated system administrator warning.</p>
    `;
    const html = baseLayout("RentED Admin Alert", content);

    for (const admin of admins) {
      if (admin.email) {
        await sendEmail({ to: admin.email, subject: `[RentED Admin] ${subject}`, html });
      }
    }
  } catch (error) {
    console.error("Failed to send admin alert email:", error.message);
  }
};

export default {
  sendEmail,
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetConfirmationEmail,
  sendOrderConfirmation,
  sendOrderCancelledEmail,
  sendSellerNotification,
  sendPickupNotification,
  sendDeliveryConfirmation,
  sendRefundEmail,
  sendWithdrawalEmail,
  sendDisputeEmail,
  sendAdminAlert,
};
