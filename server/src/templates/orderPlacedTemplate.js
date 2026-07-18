import { baseLayout } from "./baseLayout.js";

export const orderPlacedTemplate = (order, item) => {
  const content = `
    <h2>Order Placed Successfully! 🧾</h2>
    <p>Thank you for shopping on RentED. We have successfully recorded your order. Below are the order summary details:</p>
    
    <div class="card">
      <div class="card-title">Order Details</div>
      <p>🛍️ <b>Item</b>: ${item.title}</p>
      <p>🏷️ <b>Category</b>: ${item.category}</p>
      <p>💰 <b>Amount Paid</b>: Rs. ${order.totalPrice}</p>
      <p>💳 <b>Method</b>: ${order.paymentMethod.toUpperCase()}</p>
      <p>📦 <b>Type</b>: ${order.requestType === "rental" ? "Rental Booking" : "Direct Purchase"}</p>
      ${
        order.requestType === "rental"
          ? `<p>📅 <b>Duration</b>: ${new Date(order.startDate).toLocaleDateString()} to ${new Date(order.endDate).toLocaleDateString()}</p>`
          : ""
      }
    </div>

    <div class="card">
      <div class="card-title">Next Steps</div>
      <p>1. The seller must accept this order.</p>
      <p>2. A campus Point of Contact (POC) dispatcher will claim the delivery task.</p>
      <p>3. Once they arrive, show them your delivery verification code: <b>${order.deliveryQrCode}</b>.</p>
    </div>

    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard" class="btn">View Dashboard</a>
    </div>
  `;
  return baseLayout("RentED Order Confirmation", content);
};
export default orderPlacedTemplate;
