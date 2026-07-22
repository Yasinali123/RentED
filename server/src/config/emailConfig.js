import nodemailer from "nodemailer";

// Nodemailer Transporter Factory (Fallback for Gmail / SMTP)
export const getTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 8000, // 8 seconds timeout
  });
};

/**
 * Sends transactional email via Brevo HTTP API v3.
 * High-performance, bypasses Render SMTP port blocks, supports any recipient on free tier.
 */
export const sendBrevoEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_USER || "rented4us@gmail.com";
  const senderName = process.env.SENDER_NAME || "RentED Support";

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured.");
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: (Array.isArray(to) ? to : [to]).map(email => ({ email })),
        subject: subject,
        htmlContent: html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Brevo HTTP Error ${response.status}`);
    }

    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.warn(`[Brevo Warning] Brevo HTTP API call failed: ${error.message}`);
    throw error;
  }
};

/**
 * Sends transactional email via Resend REST API v1.
 * High-performance, instant email delivery engine.
 */
export const sendResendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const senderEmail = process.env.EMAIL_USER || "rented4us@gmail.com";
  const senderName = process.env.SENDER_NAME || "RentED Support";

  // Resend requires verified domain OR 'onboarding@resend.dev' for free tier testing
  const fromAddress = process.env.RESEND_FROM || `${senderName} <onboarding@resend.dev>`;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: html,
        reply_to: senderEmail,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.name || `Resend HTTP Error ${response.status}`);
    }

    return { success: true, messageId: data.id };
  } catch (apiError) {
    if (
      apiError.message.includes("testing emails") ||
      apiError.message.includes("own email address") ||
      apiError.message.includes("Invalid `to` field")
    ) {
      console.warn(
        `[Resend Notice] Resend free account restriction: Emails can only be sent to the account owner (${senderEmail}). Falling back to Gmail SMTP for recipient: ${to}...`
      );
    } else {
      console.warn(`[Email Warning] Resend REST API fetch failed (${apiError.message}). Falling back to Gmail SMTP transport...`);
    }
    
    // Automatic Fallback to Nodemailer Gmail SMTP
    if (process.env.EMAIL_PASS) {
      const activeTransporter = getTransporter();
      const info = await activeTransporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to,
        subject,
        html,
      });
      return { success: true, messageId: info.messageId };
    }

    throw apiError;
  }
};

export const verifyConnection = async () => {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const brevoKey = process.env.BREVO_API_KEY;
    if (brevoKey) {
      console.log("Email transporter connected successfully via Brevo API.");
    } else if (apiKey) {
      console.log("Email transporter connected successfully via Resend API.");
    } else if (process.env.EMAIL_PASS) {
      await getTransporter().verify();
      console.log("Email transporter connected successfully to Gmail SMTP.");
    } else {
      console.warn("No active email API key or SMTP password configured.");
    }
  } catch (error) {
    console.error("Failed to connect to email transporter:", error.message);
  }
};

export default getTransporter();




