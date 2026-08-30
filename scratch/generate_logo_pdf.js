import PDFDocument from "../server/node_modules/pdfkit/js/pdfkit.js";
import fs from "fs";
import path from "path";

async function createLogoPdf() {
  const logoIconPath = path.resolve("client/public/logo-icon.png");
  const logoTransparentPath = path.resolve("client/public/logo-transparent.png");

  const outputPath = "C:\\Users\\Lenovo\\.gemini\\antigravity-ide\\brain\\796c94bd-dd87-4862-ab79-9ed7eb22fc67\\rented_logo.pdf";

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const writeStream = fs.createWriteStream(outputPath);

  doc.pipe(writeStream);

  const pageWidth = doc.page.width;
  const margin = 50;

  // Title Banner
  doc
    .fontSize(28)
    .fillColor("#ea580c") // accent orange
    .font("Helvetica-Bold")
    .text("RentED Official Brand Logos", margin, margin, { align: "center" });

  doc
    .fontSize(12)
    .fillColor("#64748b")
    .font("Helvetica")
    .text("Hyperlocal Student Marketplace & Escrow Platform", margin, margin + 36, { align: "center" });

  doc
    .moveTo(margin, margin + 60)
    .lineTo(pageWidth - margin, margin + 60)
    .strokeColor("#e2e8f0")
    .lineWidth(1)
    .stroke();

  // Section 1: Icon Logo
  let currentY = margin + 80;
  doc
    .fontSize(16)
    .fillColor("#1e293b")
    .font("Helvetica-Bold")
    .text("1. RentED Icon Mark (logo-icon.png)", margin, currentY);

  currentY += 25;

  if (fs.existsSync(logoIconPath)) {
    doc.image(logoIconPath, margin, currentY, { width: 180 });
  }

  currentY += 200;

  doc
    .moveTo(margin, currentY)
    .lineTo(pageWidth - margin, currentY)
    .strokeColor("#e2e8f0")
    .lineWidth(1)
    .stroke();

  // Section 2: Transparent Logo
  currentY += 20;

  doc
    .fontSize(16)
    .fillColor("#1e293b")
    .font("Helvetica-Bold")
    .text("2. RentED Full Brand Logo (logo-transparent.png)", margin, currentY);

  currentY += 25;

  if (fs.existsSync(logoTransparentPath)) {
    doc.image(logoTransparentPath, margin, currentY, { width: 260 });
  }

  doc.end();

  writeStream.on("finish", () => {
    console.log("PDF generated successfully at:", outputPath);
  });
}

createLogoPdf();
