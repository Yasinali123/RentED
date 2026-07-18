import { baseLayout } from "./baseLayout.js";

export const withdrawalTemplate = (name, amount, balance) => {
  const content = `
    <h2>Withdrawal Request Processed Successfully 💸</h2>
    <p>Hi ${name},</p>
    <p>This is to confirm that we have successfully processed your wallet withdrawal request.</p>
    
    <div class="card">
      <div class="card-title">Transaction Details</div>
      <p>💰 <b>Withdrawn Amount</b>: Rs. ${amount}</p>
      <p>🏛️ <b>Settlement Method</b>: Bank Transfer/UPI linked accounts</p>
      <p>📉 <b>Remaining Wallet Balance</b>: Rs. ${balance}</p>
      <p>📅 <b>Processed Time</b>: ${new Date().toLocaleString()}</p>
    </div>

    <p>Normally, funds reflect in your linked account within 2-4 hours. If they do not appear within 24 hours, please contact the support desk immediately.</p>
  `;
  return baseLayout("RentED Withdrawal Confirmation", content);
};
export default withdrawalTemplate;
