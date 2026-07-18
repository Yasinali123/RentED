import { baseLayout } from "./baseLayout.js";

export const deliveryTemplate = (order, item, status) => {
  let titleText = "Delivery Status Update 🚚";
  let statusMessage = "";

  if (status === "Picked Up") {
    titleText = "Order Picked Up by Courier 📦";
    statusMessage = "Your item has been successfully collected from the seller's location and is currently in transit.";
  } else if (status === "Out For Delivery") {
    titleText = "Order Out For Delivery! 🛵";
    statusMessage = "The courier has left the campus hub and is heading towards your delivery address. Please keep your delivery QR code or OTP ready.";
  } else if (status === "Delivered") {
    titleText = "Delivery Completed successfully! 🎉";
    statusMessage = "Your order has been handed over. Please inspect the item. If you are satisfied, confirm receipt in your dashboard to release the seller's payment.";
  }

  const content = `
    <h2>${titleText}</h2>
    <p>${statusMessage}</p>
    
    <div class="card">
      <div class="card-title">Delivery Details</div>
      <p>🛍️ <b>Item</b>: ${item.title}</p>
      <p>📍 <b>Delivery Address</b>: ${order.deliveryAddress}</p>
      <p>⚙️ <b>Status</b>: ${status.toUpperCase()}</p>
      ${
        status === "Out For Delivery"
          ? `<p>🔑 <b>Delivery OTP</b>: <b>${order.deliveryQrCode}</b></p>`
          : ""
      }
    </div>

    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard" class="btn">View Order Details</a>
    </div>
  `;
  return baseLayout("RentED Delivery Update", content);
};
export default deliveryTemplate;
