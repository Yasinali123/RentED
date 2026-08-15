import "dotenv/config";
import { connectDb } from "../config/db.js";
import Conversation from "../models/Conversation.js";
import Item from "../models/Item.js";
import Message from "../models/Message.js";
import RentalRequest from "../models/RentalRequest.js";
import Review from "../models/Review.js";
import Notification from "../models/Notification.js";
import Transaction from "../models/Transaction.js";
import Dispute from "../models/Dispute.js";
import WithdrawalRequest from "../models/WithdrawalRequest.js";

/**
 * Clears all sample dummy items, fake test orders, mock chats, reviews, and dummy transactions.
 */
const clearDummyData = async () => {
  try {
    await connectDb();
    console.log("🔥 Purging all dummy items, test orders, and mock transactions from database...");

    const itemResult = await Item.deleteMany({});
    const requestResult = await RentalRequest.deleteMany({});
    const conversationResult = await Conversation.deleteMany({});
    const messageResult = await Message.deleteMany({});
    const reviewResult = await Review.deleteMany({});
    const notificationResult = await Notification.deleteMany({});
    const transactionResult = await Transaction.deleteMany({});
    const disputeResult = await Dispute.deleteMany({});
    const withdrawalResult = await WithdrawalRequest.deleteMany({});

    console.log(`✅ Database Purge Complete!`);
    console.log(`- Items removed: ${itemResult.deletedCount}`);
    console.log(`- Orders removed: ${requestResult.deletedCount}`);
    console.log(`- Conversations removed: ${conversationResult.deletedCount}`);
    console.log(`- Messages removed: ${messageResult.deletedCount}`);
    console.log(`- Reviews removed: ${reviewResult.deletedCount}`);
    console.log(`- Notifications removed: ${notificationResult.deletedCount}`);
    console.log(`- Transactions removed: ${transactionResult.deletedCount}`);
    console.log(`- Disputes removed: ${disputeResult.deletedCount}`);
    console.log(`- Withdrawal requests removed: ${withdrawalResult.deletedCount}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to purge dummy data:", error.message);
    process.exit(1);
  }
};

clearDummyData();
