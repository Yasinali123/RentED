import { baseLayout } from "./baseLayout.js";

export const sellerOrderTemplate = (order, item, action) => {
  const isNewOrder = action === "new_order";
  const titleText = isNewOrder ? "New Order Received! 🔔" : "Funds Released to Wallet! 💰";
  
  const content = isNewOrder
    ? `
      <h2>${titleText}</h2>
      <p>Great news! A student wants to purchase or rent your item: <b>"${item.title}"</b>.</p>
      
      <div class="card">
        <div class="card-title">Order Summary</div>
        <p>🛍️ <b>Item</b>: ${item.title}</p>
        <p>📦 <b>Type</b>: ${order.requestType === "rental" ? "Rental Booking" : "Direct Purchase"}</p>
        <p>💰 <b>Renter Paid</b>: Rs. ${order.totalPrice}</p>
        <p>🏫 <b>Campus Delivery Location</b>: ${order.deliveryAddress}</p>
      </div>

      <div class="card">
        <div class="card-title">Required Action</div>
        <p>Please log in to your Seller Studio dashboard and accept this request to proceed with the transaction. A campus POC courier will collect the item once accepted.</p>
      </div>

      <div style="text-align: center;">
        <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard" class="btn">Go to Dashboard</a>
      </div>
    `
    : `
      <h2>${titleText}</h2>
      <p>The buyer has confirmed receipt of the item, and the escrow hold has been released successfully.</p>
      
      <div class="card">
        <div class="card-title">Payout Breakdown</div>
        <p>🛍️ <b>Item</b>: ${item.title}</p>
        <p>💰 <b>Gross Total</b>: Rs. ${order.totalPrice}</p>
        <p>💸 <b>Platform Commission</b>: Rs. ${order.commissionAmount || 0}</p>
        <hr />
        <p>🎉 <b>Credited to Wallet Balance</b>: <b>Rs. ${order.totalPrice - (order.commissionAmount || 0)}</b></p>
      </div>

      <p>Your new balance is now available for direct withdrawal or checkout inside the RentED settings page.</p>

      <div style="text-align: center;">
        <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard" class="btn">Manage Wallet</a>
      </div>
    `;

  return baseLayout("RentED Seller Alert", content);
};
export default sellerOrderTemplate;
