import "dotenv/config";

import app from "./app.js";
import { connectDb } from "./config/db.js";
import { verifyConnection } from "./config/emailConfig.js";

const port = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDb();
    await verifyConnection();
  } catch (error) {
    console.error("Failed to connect to database. Running server anyway...", error.message);
  }
  
  app.listen(port, () => {
    console.log(`RentEd API listening on port ${port}`);
  });
};

startServer();

