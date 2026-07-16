import "dotenv/config";

import app from "./app.js";
import { connectDb } from "./config/db.js";

const port = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDb();
  } catch (error) {
    console.error("Failed to connect to database. Running server anyway...", error.message);
  }
  
  app.listen(port, () => {
    console.log(`RentEd API listening on port ${port}`);
  });
};

startServer();

