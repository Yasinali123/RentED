import { baseLayout } from "./baseLayout.js";

export const passwordResetTemplate = (name) => {
  const content = `
    <h2>Password Updated Successfully 🔐</h2>
    <p>Hi ${name},</p>
    <p>This is a quick security confirmation that your **RentED account password has been changed successfully**.</p>
    
    <div class="card">
      <div class="card-title">Security Alert details:</div>
      <p>⏰ <b>Time</b>: ${new Date().toLocaleString()}</p>
      <p>🛡️ <b>Action</b>: Password reset verified via secure OTP check</p>
    </div>

    <p>If you did not perform this action, please contact our support team immediately or request another password reset to secure your account.</p>
    
    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/login" class="btn">Log In Now</a>
    </div>
  `;
  return baseLayout("RentED Password Reset Confirmation", content);
};
export default passwordResetTemplate;
