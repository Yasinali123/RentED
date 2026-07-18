import { baseLayout } from "./baseLayout.js";

export const orderCancelledTemplate = (order, item, initiatorRole) => {
  const content = `
    <h2>Order Cancelled ❌</h2>
    <p>We are writing to let you know that the transaction for item <b>"${item.title}"</b> has been cancelled.</p>
    
    <div class="card">
      <div class="card-title">Cancellation Summary</div>
      <p>🛍️ <b>Item</b>: ${item.title}</p>
      <p>🚫 <b>Cancelled By</b>: ${initiatorRole === "buyer" ? "Renter/Buyer" : initiatorRole === "seller" ? "Seller/Owner" : "Administrator"}</p>
      <p>💰 <b>Order Value</b>: Rs. ${order.totalPrice}</p>
      <p>💳 <b>Refund Status</b>: ${order.paymentMethod === "cod" ? "No charge (COD order)" : "Fully refunded back to Renter's Wallet balance."}</p>
    </div>

    <p>If you have any questions or require mediation, please feel free to raise a dispute from your RentED dashboard.</p>

    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/marketplace" class="btn">Back to Marketplace</a>
    </div>
  `;
  return baseLayout("RentED Order Cancellation", content);
};
export default orderCancelledTemplate;
