import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const verifyConnection = async () => {
  try {
    await transporter.verify();
    console.log("Email transporter connected successfully to Gmail SMTP.");
  } catch (error) {
    console.error("Failed to connect to email transporter:", error.message);
  }
};

export default transporter;
