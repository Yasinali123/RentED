import "dotenv/config";

import http from "http";
import app from "./app.js";
import { connectDb } from "./config/db.js";
import { verifyConnection } from "./config/emailConfig.js";
import { initSocket } from "./socket/index.js";

const port = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to the database and fail fast if we cannot connect.
    await connectDb();
    console.log("Successfully connected to the database.");
  } catch (error) {
    console.error("Failed to connect to database:", error);
    // Exit the process so the problem is visible and can be fixed instead of running a server with no DB
    process.exit(1);
  }

  try {
    // Email verification is useful but not critical for the HTTP API to run.
    await verifyConnection();
    console.log("Email service verified.");
  } catch (error) {
    console.warn("Email verification failed, continuing without email service:", error);
  }
  
  const server = http.createServer(app);
  initSocket(server);

  server.listen(port, () => {
    console.log(`RentEd API server with Socket.io listening on port ${port}`);
  });
};

startServer();
