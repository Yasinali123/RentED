import { baseLayout } from "./baseLayout.js";

export const disputeTemplate = (dispute, order, item, action, recipientName) => {
  let titleText = "Dispute File Notification ⚖️";
  let statusText = "Raised";
  let actionMessage = "";

  if (action === "created") {
    titleText = "New Dispute Filed ⚖️";
    statusText = "Opened";
    actionMessage = `A dispute has been raised regarding the order of item "${item.title}". The platform administrator is reviewing the claim details and will intervene shortly.`;
  } else if (action === "updated") {
    titleText = "Dispute Details Updated 📝";
    statusText = dispute.status;
    actionMessage = `The details or status of the dispute for item "${item.title}" have been updated by the admin or participant.`;
  } else if (action === "resolved") {
    titleText = "Dispute Resolved! ✅";
    statusText = "Resolved";
    actionMessage = `Good news! The dispute raised on the item "${item.title}" order has been marked as RESOLVED by the administrator. Resolution details are available below.`;
  }

  const content = `
    <h2>${titleText}</h2>
    <p>Hi ${recipientName},</p>
    <p>${actionMessage}</p>
    
    <div class="card">
      <div class="card-title">Dispute Record Info</div>
      <p>🛍️ <b>Item</b>: ${item.title}</p>
      <p>🔢 <b>Order ID</b>: #${order._id}</p>
      <p>🚩 <b>Reason/Claim</b>: ${dispute.reason}</p>
      <p>⚙️ <b>Dispute Status</b>: <b>${statusText.toUpperCase()}</b></p>
      ${
        dispute.resolutionNotes
          ? `<p>💬 <b>Resolution Details</b>: ${dispute.resolutionNotes}</p>`
          : ""
      }
    </div>

    <p>Please log in to your dashboard to review comments, upload files/proofs, or verify resolution steps.</p>

    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard" class="btn">View Disputes</a>
    </div>
  `;
  return baseLayout("RentED Dispute Notification", content);
};
export default disputeTemplate;
