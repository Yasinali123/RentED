import "dotenv/config";

import http from "http";
import app from "./app.js";
import { connectDb } from "./config/db.js";
import { verifyConnection } from "./config/emailConfig.js";
import { initSocket } from "./socket/index.js";

const port = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDb();
    await verifyConnection();
  } catch (error) {
    console.error("Failed to connect to database. Running server anyway...", error.message);
  }
  
  const server = http.createServer(app);
  initSocket(server);

  server.listen(port, () => {
    console.log(`RentEd API server with Socket.io listening on port ${port}`);
  });
};

startServer();

