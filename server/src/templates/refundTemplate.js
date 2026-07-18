import { baseLayout } from "./baseLayout.js";

export const refundTemplate = (order, item) => {
  const content = `
    <h2>Refund Processed Successfully 💳</h2>
    <p>We are writing to confirm that a refund has been issued successfully for the order of: <b>"${item.title}"</b>.</p>
    
    <div class="card">
      <div class="card-title">Refund Details</div>
      <p>🛍️ <b>Item Name</b>: ${item.title}</p>
      <p>💰 <b>Refund Amount</b>: Rs. ${order.totalPrice}</p>
      <p>🏦 <b>Settlement Destination</b>: Your RentED Wallet Balance</p>
      <p>📅 <b>Processed Time</b>: ${new Date().toLocaleString()}</p>
    </div>

    <p>The refunded amount is immediately available for transactions or withdrawal requests inside your settings page.</p>

    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard" class="btn">View Wallet Balance</a>
    </div>
  `;
  return baseLayout("RentED Refund Confirmation", content);
};
export default refundTemplate;
