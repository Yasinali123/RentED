const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL;

try {
  if (isVercel) {
    console.log("Detected Vercel environment. Building frontend client...");
    console.log("Installing client dependencies...");
    execSync("npm --prefix client install", { stdio: "inherit" });
    
    console.log("Building client...");
    execSync("npm --prefix client run build", { stdio: "inherit" });
    
    // Copy client/dist to root dist so Vercel can find it at the default location
    const srcDist = path.resolve(__dirname, "client/dist");
    const destDist = path.resolve(__dirname, "dist");
    
    if (fs.existsSync(destDist)) {
      fs.rmSync(destDist, { recursive: true, force: true });
    }
    
    console.log(`Copying client build output from ${srcDist} to root ${destDist}...`);
    fs.cpSync(srcDist, destDist, { recursive: true });
    console.log("Client build compiled and copied successfully!");
  } else {
    console.log("Detected Render/Server environment. Building backend server and frontend client...");
    console.log("Installing server dependencies...");
    execSync("npm --prefix server install", { stdio: "inherit" });
    console.log("Installing client dependencies...");
    execSync("npm --prefix client install", { stdio: "inherit" });
    console.log("Building client...");
    execSync("npm --prefix client run build", { stdio: "inherit" });
    console.log("Build and dependencies installation completed successfully!");
  }
} catch (error) {
  console.error("Build failed:", error.message);
  process.exit(1);
}
