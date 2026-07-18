import SecurityLog from "../models/SecurityLog.js";

/**
 * Persists a security audit log inside the database.
 * 
 * @param {object} params
 * @param {string} [params.userId]
 * @param {string} [params.email]
 * @param {string} params.action
 * @param {string} params.details
 * @param {object} [params.req] Express request context to capture IP and User Agent
 */
export const logSecurityEvent = async ({ userId, email, action, details, req }) => {
  try {
    let ipAddress = "";
    let userAgent = "";

    if (req) {
      ipAddress = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
      // Handle array or comma-separated forwarding chains
      if (ipAddress.includes(",")) {
        ipAddress = ipAddress.split(",")[0].trim();
      }
      userAgent = req.headers["user-agent"] || "";
    }

    await SecurityLog.create({
      userId,
      email: email ? email.toLowerCase().trim() : "",
      action,
      details,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    console.error("Failed to write security audit log:", err);
  }
};

export default logSecurityEvent;
