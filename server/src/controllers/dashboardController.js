import Item from "../models/Item.js";
import RentalRequest from "../models/RentalRequest.js";
import User from "../models/User.js";
import Dispute from "../models/Dispute.js";
import Transaction from "../models/Transaction.js";
import Notification from "../models/Notification.js";
import College from "../models/College.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getSetting, setSetting } from "../utils/settingsHelper.js";

export const getDashboard = asyncHandler(async (req, res) => {
  const role = req.user.role || "student";

  // Shared data variables
  let listedItems = [];
  let incomingRequests = [];
  let rentedItems = [];
  let nearbyItems = [];
  let transactions = [];
  let notifications = [];
  let wishlistItems = [];
  let disputeList = [];
  let usersList = [];
  let stats = {};

  // Fetch notifications
  notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(10);

  const unreadNotificationsCount = await Notification.countDocuments({
    user: req.user._id,
    isRead: false,
  });

  // STUDENT DASHBOARD DATA
  if (role === "student") {
    const [outgoingRequests, wishlist, suggestions, txs] = await Promise.all([
      RentalRequest.find({ renter: req.user._id })
        .populate("item")
        .populate("owner", "name email collegeName avatarUrl")
        .populate("poc", "name email")
        .sort({ createdAt: -1 }),
      User.findById(req.user._id).populate("wishlist"),
      Item.find({
        owner: { $ne: req.user._id },
        availabilityStatus: "available",
        isApproved: { $ne: false },
        $or: [{ collegeName: req.user.collegeName }, { city: req.user.city }],
      })
        .populate("owner", "name campus collegeName location avatarUrl verifiedCollegeId")
        .limit(8)
        .sort({ createdAt: -1 }),
      Transaction.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    rentedItems = outgoingRequests;
    wishlistItems = wishlist?.wishlist || [];
    nearbyItems = suggestions;
    transactions = txs;

    const activeRentals = rentedItems.filter((o) => o.status === "Rental Active").length;
    const completedOrders = rentedItems.filter((o) => o.status === "Completed").length;
    const totalSpent = rentedItems
      .filter((o) => ["Delivered", "Rental Active", "Completed"].includes(o.status))
      .reduce((sum, o) => sum + o.totalPrice, 0);

    stats = {
      activeRentals,
      completedOrders,
      totalSpent,
      wishlistCount: wishlistItems.length,
      balance: req.user.balance || 0,
      unreadNotificationsCount,
    };
  }

  // SELLER DASHBOARD DATA
  else if (role === "seller") {
    const [myItems, orders] = await Promise.all([
      Item.find({ owner: req.user._id }).sort({ createdAt: -1 }),
      RentalRequest.find({ owner: req.user._id })
        .populate("item")
        .populate("renter", "name email collegeName avatarUrl")
        .populate("poc", "name email")
        .sort({ createdAt: -1 }),
    ]);

    listedItems = myItems;
    incomingRequests = orders;

    // Filter status
    const pendingOrders = orders.filter((o) => ["Pending Payment", "Payment Successful"].includes(o.status)).length;
    const activeRentals = orders.filter((o) => o.status === "Rental Active").length;
    const completedOrdersCount = orders.filter((o) => o.status === "Completed").length;

    // Calculate revenue
    const totalRevenue = orders
      .filter((o) => ["Delivered", "Rental Active", "Completed"].includes(o.status))
      .reduce((sum, o) => sum + o.totalPrice, 0);

    const commissionWithheld = orders
      .filter((o) => o.earningsReleased)
      .reduce((sum, o) => sum + (o.commissionAmount || 0), 0);

    const monthlyRevenue = orders
      .filter((o) => {
        const isDelivered = ["Delivered", "Rental Active", "Completed"].includes(o.status);
        const thisMonth = new Date().getMonth() === new Date(o.createdAt).getMonth();
        return isDelivered && thisMonth;
      })
      .reduce((sum, o) => sum + o.totalPrice, 0);

    stats = {
      totalProducts: myItems.length,
      activeRentals,
      completedOrders: completedOrdersCount,
      pendingOrders,
      totalRevenue,
      monthlyRevenue,
      commissionWithheld,
      balance: req.user.balance || 0,
      unreadNotificationsCount,
    };
  }

  // POC DASHBOARD DATA
  else if (role === "poc") {
    // POC views tasks for their college
    const collegeQuery = {
      $or: [
        { collegeName: req.user.collegeName },
        { campus: req.user.campus },
        { city: req.user.city }
      ]
    };

    const relatedItems = await Item.find(collegeQuery).distinct("_id");

    const [allTasks, myTasks] = await Promise.all([
      RentalRequest.find({
        item: { $in: relatedItems },
        status: { $in: ["Seller Accepted", "Return Requested"] },
      })
        .populate("item")
        .populate("owner", "name email collegeName location")
        .populate("renter", "name email collegeName location")
        .sort({ createdAt: -1 }),
      RentalRequest.find({ poc: req.user._id })
        .populate("item")
        .populate("owner", "name email collegeName location")
        .populate("renter", "name email collegeName location")
        .sort({ createdAt: -1 }),
    ]);

    // Grouping tasks
    const pendingPickups = [
      ...allTasks.filter((t) => t.status === "Seller Accepted"),
      ...myTasks.filter((t) => t.status === "POC Assigned" || t.status === "Pickup Scheduled"),
    ];

    const outForDelivery = myTasks.filter((t) => t.status === "Out For Delivery" || t.status === "Picked Up");
    const delivered = myTasks.filter((t) => ["Delivered", "Rental Active", "Completed"].includes(t.status) && t.requestType !== "rental");
    const returns = [
      ...allTasks.filter((t) => t.status === "Return Requested"),
      ...myTasks.filter((t) => t.status === "Returned"),
    ];

    stats = {
      pendingPickupsCount: pendingPickups.length,
      outForDeliveryCount: outForDelivery.length,
      deliveredCount: delivered.length,
      returnsCount: returns.length,
      unreadNotificationsCount,
    };

    // Return custom sets
    rentedItems = myTasks; // delivery logs
    incomingRequests = pendingPickups; // tasks to claim
    wishlistItems = returns;
    nearbyItems = outForDelivery;
  }

  // ADMIN DASHBOARD DATA
  else if (role === "admin") {
    const [items, users, disputes, txs, colleges, allRequests] = await Promise.all([
      Item.find({}).populate("owner", "name email collegeName"),
      User.find({}),
      Dispute.find({})
        .populate({
          path: "order",
          populate: { path: "item renter owner" },
        })
        .populate("raisedBy", "name email role")
        .sort({ createdAt: -1 }),
      Transaction.find({})
        .populate("user", "name email role collegeName")
        .populate({
          path: "order",
          populate: { path: "item renter owner" },
        })
        .sort({ createdAt: -1 }),
      College.find({}),
      RentalRequest.find({})
        .populate("item")
        .populate("owner", "name email collegeName campus location ratingsAverage ratingsCount avatarUrl balance")
        .populate("renter", "name email collegeName campus location ratingsAverage ratingsCount avatarUrl balance")
        .populate("poc", "name email campus location")
        .sort({ createdAt: -1 }),
    ]);

    disputeList = disputes;
    usersList = users;
    listedItems = items;
    transactions = txs;
    incomingRequests = allRequests;

    // Platform analytics
    const totalRevenue = txs
      .filter((t) => t.type === "payment")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalCommissions = txs
      .filter((t) => t.type === "commission")
      .reduce((sum, t) => sum + t.amount, 0);

    const activeDisputes = disputes.filter((d) => d.status === "pending").length;

    // College listing stats
    const collegeStats = {};
    items.forEach((item) => {
      const cName = item.collegeName || "Unknown College";
      collegeStats[cName] = (collegeStats[cName] || 0) + 1;
    });

    const formattedCollegeStats = Object.keys(collegeStats).map((name) => ({
      name,
      count: collegeStats[name],
    }));

    // SVG Analytics Charting Data
    // 1. Daily Orders (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentRequests = allRequests.filter(r => new Date(r.createdAt) >= sevenDaysAgo);
    const dailyOrders = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dailyOrders[dateStr] = 0;
    }
    recentRequests.forEach(req => {
      const dateStr = new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (dailyOrders[dateStr] !== undefined) {
        dailyOrders[dateStr]++;
      }
    });
    const formattedDailyOrders = Object.keys(dailyOrders).map(key => ({ label: key, value: dailyOrders[key] }));

    // 2. Daily Revenue (Last 7 days)
    const recentTx = txs.filter(t => t.type === "payment" && new Date(t.createdAt) >= sevenDaysAgo);
    const dailyRevenue = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dailyRevenue[dateStr] = 0;
    }
    recentTx.forEach(t => {
      const dateStr = new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (dailyRevenue[dateStr] !== undefined) {
        dailyRevenue[dateStr] += t.amount;
      }
    });
    const formattedDailyRevenue = Object.keys(dailyRevenue).map(key => ({ label: key, value: dailyRevenue[key] }));

    // 3. Most Rented/Purchased Items (Top 5)
    const itemRentalCounts = {};
    allRequests.forEach(r => {
      if (r.item && r.item.title) {
        itemRentalCounts[r.item.title] = (itemRentalCounts[r.item.title] || 0) + 1;
      }
    });
    const formattedTopRented = Object.keys(itemRentalCounts)
      .map(title => ({ label: title, value: itemRentalCounts[title] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 4. Popular Categories
    const categoryCounts = {};
    items.forEach(item => {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });
    const formattedPopularCategories = Object.keys(categoryCounts)
      .map(cat => ({ label: cat, value: categoryCounts[cat] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // 5. Monthly Growth (Signups this month vs last month)
    const thisMonth = new Date().getMonth();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const thisMonthYear = new Date().getFullYear();
    const lastMonthYear = thisMonth === 0 ? thisMonthYear - 1 : thisMonthYear;

    const signupsThisMonth = users.filter(u => {
      const d = new Date(u.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisMonthYear;
    }).length;
    
    const signupsLastMonth = users.filter(u => {
      const d = new Date(u.createdAt);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    }).length;

    const monthlyGrowthPercentage = signupsLastMonth === 0 
      ? (signupsThisMonth > 0 ? 100 : 0) 
      : Math.round(((signupsThisMonth - signupsLastMonth) / signupsLastMonth) * 100);

    const platformAnalytics = {
      dailyOrders: formattedDailyOrders,
      dailyRevenue: formattedDailyRevenue,
      topColleges: formattedCollegeStats.sort((a, b) => b.count - a.count).slice(0, 5),
      topRentedItems: formattedTopRented,
      popularCategories: formattedPopularCategories,
      monthlyGrowth: {
        thisMonth: signupsThisMonth,
        lastMonth: signupsLastMonth,
        growth: monthlyGrowthPercentage
      }
    };

    // Calculate active rentals & pending deliveries count
    const activeRentalsCount = allRequests.filter(r => r.status === "Rental Active").length;
    const pendingDeliveriesCount = allRequests.filter(r => 
      ["Seller Accepted", "POC Assigned", "Pickup Scheduled", "Picked Up", "Out For Delivery"].includes(r.status)
    ).length;

    stats = {
      totalUsers: users.length,
      totalSellers: users.filter((u) => u.role === "seller").length,
      totalStudents: users.filter((u) => u.role === "student").length,
      totalPocs: users.filter((u) => u.role === "poc").length,
      pendingPocApprovals: users.filter((u) => u.role === "poc" && !u.isPocApproved).length,
      totalListings: items.length,
      totalOrders: allRequests.length,
      activeRentals: activeRentalsCount,
      pendingDeliveries: pendingDeliveriesCount,
      activeDisputes,
      totalRevenue,
      totalCommissions,
      collegesCount: colleges.length,
      collegeStats: formattedCollegeStats,
      platformAnalytics,
      unreadNotificationsCount,
    };
  }

  // Respond
  res.json({
    role,
    stats,
    listedItems,
    incomingRequests,
    rentedItems,
    nearbyItems,
    wishlistItems,
    transactions,
    notifications,
    disputes: disputeList,
    users: usersList,
  });
});

export const getSystemSettings = asyncHandler(async (req, res) => {
  const commissionRate = await getSetting("commission_rate", 10);
  const minDeposit = await getSetting("min_deposit", 100);

  res.json({
    commission_rate: commissionRate,
    min_deposit: minDeposit,
  });
});

export const updateSystemSettings = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied: Admins only");
  }

  const { commission_rate, min_deposit } = req.body;

  if (commission_rate !== undefined) {
    const rate = Number(commission_rate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      res.status(400);
      throw new Error("Commission rate must be a number between 0 and 100");
    }
    await setSetting("commission_rate", rate);
  }

  if (min_deposit !== undefined) {
    const minDep = Number(min_deposit);
    if (isNaN(minDep) || minDep < 0) {
      res.status(400);
      throw new Error("Minimum deposit must be a positive number");
    }
    await setSetting("min_deposit", minDep);
  }

  res.json({
    success: true,
    message: "Settings updated successfully",
    settings: {
      commission_rate: await getSetting("commission_rate", 10),
      min_deposit: await getSetting("min_deposit", 100),
    }
  });
});
