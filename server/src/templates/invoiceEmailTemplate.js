import { baseLayout } from "./baseLayout.js";

/**
 * Invoice email template sent to buyers after invoice generation.
 */
const invoiceEmailTemplate = ({ buyerName, invoiceNumber, itemTitle, totalAmount, date, pdfUrl }) => {
  const content = `
    <h2 style="color: #1e293b; margin: 0;">Your Invoice is Ready 🧾</h2>
    <p style="color: #64748b; font-size: 14px; margin-top: 8px;">
      Hi <strong>${buyerName}</strong>, your invoice for the recent transaction on RentED has been generated successfully.
    </p>

    <div class="card" style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Invoice No.</td>
          <td style="padding: 6px 0; font-weight: 700; text-align: right; font-size: 13px;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Item</td>
          <td style="padding: 6px 0; font-weight: 700; text-align: right; font-size: 13px;">${itemTitle}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Amount</td>
          <td style="padding: 6px 0; font-weight: 700; text-align: right; font-size: 13px; color: #4f46e5;">Rs. ${totalAmount}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Date</td>
          <td style="padding: 6px 0; font-weight: 700; text-align: right; font-size: 13px;">${date}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer"
        style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">
        📄 Download Invoice PDF
      </a>
    </div>

    <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 20px;">
      This is an automatically generated invoice. For queries, contact support@rented.com.
    </p>
  `;

  return baseLayout("Your RentED Invoice", content);
};

export default invoiceEmailTemplate;
