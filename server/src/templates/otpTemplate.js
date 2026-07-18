import { baseLayout } from "./baseLayout.js";

export const otpTemplate = (otp, type) => {
  const isReset = type === "reset";
  const actionText = isReset ? "resetting your password" : "verifying your RentED account details";
  
  const content = `
    <h2>Security Verification Code 🔑</h2>
    <p>We received a request for ${actionText}. Please use the following 6-digit verification code to complete the process. This code will expire in <b>5 minutes</b>.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <div style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 18px 30px; display: inline-block;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 0.15em; color: #4f46e5;">${otp}</span>
      </div>
    </div>

    <p style="color: #64748b; font-size: 13px;">If you did not initiate this request, you can safely ignore this email. Your account details remain secure.</p>
  `;
  return baseLayout("RentED Verification Code", content);
};
export default otpTemplate;
