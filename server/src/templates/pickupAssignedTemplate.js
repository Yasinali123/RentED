import { baseLayout } from "./baseLayout.js";

export const pickupAssignedTemplate = (order, item, role) => {
  const isPoc = role === "poc";
  const titleText = isPoc ? "Delivery Task Assigned! 📦" : "Campus Courier Assigned 🚚";

  const content = isPoc
    ? `
      <h2>${titleText}</h2>
      <p>You have successfully claimed a campus delivery task for order ID <b>#${order._id}</b>.</p>
      
      <div class="card">
        <div class="card-title">Task Checklist</div>
        <p>1. Go to the seller's pickup location: <b>${item.location}</b>.</p>
        <p>2. Verify the pickup by scanning the QR code or asking the seller for the OTP: <b>${order.pickupQrCode}</b>.</p>
        <p>3. Safely transport the item to the buyer's delivery location: <b>${order.deliveryAddress}</b>.</p>
        <p>4. Complete the delivery check using the buyer's delivery code: <b>${order.deliveryQrCode}</b>.</p>
      </div>

      <div style="text-align: center;">
        <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard" class="btn">View Tasks</a>
      </div>
    `
    : `
      <h2>${titleText}</h2>
      <p>A campus Point of Contact (POC) courier has claimed your order task and will handle the pickup and delivery.</p>
      
      <div class="card">
        <div class="card-title">Courier Info</div>
        <p>👤 <b>POC Name</b>: ${order.poc?.name || "Campus Courier"}</p>
        <p>📞 <b>POC Contact</b>: ${order.poc?.phone || "N/A"}</p>
        <p>🛍️ <b>Item to Deliver</b>: ${item.title}</p>
      </div>

      <p>Keep your codes handy! The seller will use the pickup code, and the buyer will use the delivery code during handovers.</p>
    `;

  return baseLayout("RentED Logistics Update", content);
};
export default pickupAssignedTemplate;
