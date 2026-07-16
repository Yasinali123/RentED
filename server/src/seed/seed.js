import "dotenv/config";
import bcrypt from "bcryptjs";

import { connectDb } from "../config/db.js";
import Conversation from "../models/Conversation.js";
import Item from "../models/Item.js";
import Message from "../models/Message.js";
import RentalRequest from "../models/RentalRequest.js";
import Review from "../models/Review.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import Transaction from "../models/Transaction.js";
import Dispute from "../models/Dispute.js";
import College from "../models/College.js";
import Category from "../models/Category.js";
import Coupon from "../models/Coupon.js";
import { conversations, items, rentalRequests, reviews, users } from "./sampleData.js";

const seed = async () => {
  await connectDb();

  console.log("Cleaning database...");
  await Promise.all([
    Message.deleteMany({}),
    Conversation.deleteMany({}),
    Review.deleteMany({}),
    RentalRequest.deleteMany({}),
    Item.deleteMany({}),
    User.deleteMany({}),
    Notification.deleteMany({}),
    Transaction.deleteMany({}),
    Dispute.deleteMany({}),
    College.deleteMany({}),
    Category.deleteMany({}),
    Coupon.deleteMany({}),
  ]);

  console.log("Seeding colleges...");
  const collegesList = [
    { name: "Ahmedabad Design Campus", city: "Ahmedabad", state: "Gujarat" },
    { name: "City Science College", city: "Ahmedabad", state: "Gujarat" },
    { name: "Delhi University", city: "Delhi", state: "Delhi" },
    { name: "IIT Bombay", city: "Mumbai", state: "Maharashtra" },
  ];
  await College.insertMany(collegesList);

  console.log("Seeding categories...");
  const categoriesList = [
    "Books",
    "Topper Notes",
    "Medical Books",
    "Law Books",
    "Commerce Books",
    "Engineering Books",
    "Calculators",
    "Lab Equipment",
    "Electronics",
    "Hostel Essentials",
    "Furniture",
    "Room / PG Listings",
  ].map((name) => ({ name, description: `${name} rentals and sales` }));
  await Category.insertMany(categoriesList);

  console.log("Seeding coupons...");
  await Coupon.create({
    code: "STUDENT50",
    discountType: "percentage",
    value: 50,
    expiryDate: new Date("2027-12-31"),
    isActive: true,
  });

  console.log("Seeding users...");
  const userDocs = await User.insertMany(
    await Promise.all(
      users.map(async (user) => ({
        name: user.name,
        email: user.email,
        passwordHash: await bcrypt.hash(user.password, 10),
        collegeId: user.collegeId,
        campus: user.campus,
        location: user.location,
        avatarUrl: user.avatarUrl,
        verifiedCollegeId: true,
        state: "Gujarat",
        city: "Ahmedabad",
        institutionType: "Engineering",
        collegeName: user.campus || "Ahmedabad Design Campus",
        role: user.role || "student",
        isPocApproved: user.role === "poc" ? true : false,
        balance: user.balance || 0,
        geometry: {
          type: "Point",
          coordinates: [72.5714, 23.0225],
        },
      })),
    ),
  );

  const userMap = Object.fromEntries(userDocs.map((user) => [user.email, user]));

  console.log("Seeding items...");
  const itemDocs = await Item.insertMany(
    items.map((item) => ({
      owner: userMap[item.ownerEmail]._id,
      title: item.title,
      description: item.description,
      price: item.rentalPrice ?? item.salePrice ?? item.price,
      listingType: item.listingType || "rent",
      rentalPrice: item.rentalPrice ?? item.price ?? null,
      salePrice: item.salePrice ?? null,
      category: item.category,
      location: item.location,
      campus: item.campus,
      image: item.photos?.[0] || item.image,
      photos: item.photos || (item.image ? [item.image] : []),
      condition: item.condition || "Good",
      brand: item.brand || "",
      details: item.details || [],
      tags: item.tags,
      state: "Gujarat",
      city: "Ahmedabad",
      collegeName: item.campus || "Ahmedabad Design Campus",
      isApproved: true,
      geometry: {
        type: "Point",
        coordinates: [72.5714, 23.0225],
      },
    })),
  );

  const itemMap = Object.fromEntries(itemDocs.map((item) => [item.title, item]));

  console.log("Seeding orders/rentals...");
  const requestDocs = await RentalRequest.insertMany(
    rentalRequests.map((request) => ({
      item: itemMap[request.itemTitle]._id,
      owner: itemMap[request.itemTitle].owner,
      renter: userMap[request.renterEmail]._id,
      startDate: request.startDate,
      endDate: request.endDate,
      message: request.message,
      status: request.status,
      totalPrice: request.totalPrice,
      dummyPaymentStatus: request.dummyPaymentStatus,
      dummyPaymentReference: request.dummyPaymentReference,
      deliveryAddress: request.deliveryAddress,
      pickupQrCode: request.pickupQrCode,
      deliveryQrCode: request.deliveryQrCode,
      trackingStatus: request.trackingStatus,
      trackingHistory: [{ status: request.trackingStatus, location: "Seed Creation" }],
    })),
  );

  await Promise.all(
    requestDocs.map(async (request) => {
      const linkedItem = itemDocs.find((item) => item._id.toString() === request.item.toString());
      linkedItem.availabilityStatus =
        request.status === "Rental Active" ? "rented" : request.status === "Payment Successful" ? "pending" : "available";
      await linkedItem.save();
    }),
  );

  console.log("Seeding conversations...");
  for (const conversationSeed of conversations) {
    const conversation = await Conversation.create({
      item: itemMap[conversationSeed.itemTitle]._id,
      participants: conversationSeed.participantEmails.map((email) => userMap[email]._id),
      lastMessage: conversationSeed.messages.at(-1)?.text || "",
      lastMessageAt: new Date(),
    });

    for (const messageSeed of conversationSeed.messages) {
      await Message.create({
        conversation: conversation._id,
        sender: userMap[messageSeed.senderEmail]._id,
        text: messageSeed.text,
      });
    }
  }

  console.log("Seeding reviews...");
  for (const reviewSeed of reviews) {
    const matchingRequest = requestDocs.find(
      (request) => itemDocs.find((item) => item._id.toString() === request.item.toString())?.title === reviewSeed.itemTitle,
    );

    await Review.create({
      reviewer: userMap[reviewSeed.reviewerEmail]._id,
      reviewee: userMap[reviewSeed.revieweeEmail]._id,
      item: itemMap[reviewSeed.itemTitle]._id,
      rentalRequest: matchingRequest._id,
      rating: reviewSeed.rating,
      comment: reviewSeed.comment,
    });
  }

  const reviewStats = await Review.aggregate([
    {
      $group: {
        _id: "$reviewee",
        avgRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  await Promise.all(
    reviewStats.map((entry) =>
      User.findByIdAndUpdate(entry._id, {
        ratingsAverage: entry.avgRating,
        ratingsCount: entry.reviewCount,
      }),
    ),
  );

  console.log("RentEd sample data seeded successfully.");
  process.exit(0);
};

seed().catch((error) => {
  console.error("Failed to seed data:", error);
  process.exit(1);
});
