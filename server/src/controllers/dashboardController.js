import Item from "../models/Item.js";
import RentalRequest from "../models/RentalRequest.js";
import User from "../models/User.js";
import Dispute from "../models/Dispute.js";
import Transaction from "../models/Transaction.js";
import Notification from "../models/Notification.js";
import College from "../models/College.js";
import WithdrawalRequest from "../models/WithdrawalRequest.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getSetting, setSetting } from "../utils/settingsHelper.js";

export const getDashboard = asyncHandler(async (req, res) => {
  const role = req.user.role || "student";

  // Shared data variables
  let listedItems = [];
  let withdrawalsList = [];
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
    .limit(10)
    .lean();

  const unreadNotificationsCount = await Notification.countDocuments({
    user: req.user._id,
    isRead: false,
  });

  // STUDENT DASHBOARD DATA
  if (role === "student") {
    const [outgoingRequests, wishlist, suggestions, txs, myItems, myIncomingOrders, myWithdrawals] = await Promise.all([
      RentalRequest.find({ renter: req.user._id })
        .populate("item")
        .populate("owner", "name email collegeName avatarUrl")
        .populate("poc", "name email")
        .sort({ createdAt: -1 })
        .lean(),
      User.findById(req.user._id).populate("wishlist").lean(),
      Item.find({
        owner: { $ne: req.user._id },
        availabilityStatus: "available",
        isApproved: { $ne: false },
        $or: [{ collegeName: req.user.collegeName }, { city: req.user.city }],
      })
        .populate("owner", "name campus collegeName location avatarUrl verifiedCollegeId")
        .limit(8)
        .sort({ createdAt: -1 })
        .lean(),
      Transaction.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Item.find({ owner: req.user._id }).sort({ createdAt: -1 }).lean(),
      RentalRequest.find({ owner: req.user._id })
        .populate("item")
        .populate("renter", "name email collegeName avatarUrl")
        .populate("poc", "name email")
        .sort({ createdAt: -1 })
        .lean(),
      WithdrawalRequest.find({ user: req.user._id }).sort({ createdAt: -1 }).lean(),
    ]);

    rentedItems = outgoingRequests;
    wishlistItems = wishlist?.wishlist || [];
    nearbyItems = suggestions;
    transactions = txs;
    listedItems = myItems;
    incomingRequests = myIncomingOrders;
    withdrawalsList = myWithdrawals;

    const activeRentals = rentedItems.filter((o) => o.status === "Rental Active").length;
    const completedOrders = rentedItems.filter((o) => o.status === "Completed").length;
    const totalSpent = rentedItems
      .filter((o) => ["Delivered", "Rental Active", "Completed"].includes(o.status))
      .reduce((sum, o) => sum + o.totalPrice, 0);

    const totalRevenue = myIncomingOrders
      .filter((o) => ["Delivered", "Rental Active", "Completed"].includes(o.status))
      .reduce((sum, o) => sum + o.totalPrice, 0);

    stats = {
      activeRentals,
      completedOrders,
      totalSpent,
      totalProducts: myItems.length,
      totalRevenue,
      wishlistCount: wishlistItems.length,
      balance: req.user.balance || 0,
      unreadNotificationsCount,
    };
  }

  // SELLER DASHBOARD DATA
  else if (role === "seller") {
    const [myItems, orders, withdrawals] = await Promise.all([
      Item.find({ owner: req.user._id }).sort({ createdAt: -1 }).lean(),
      RentalRequest.find({ owner: req.user._id })
        .populate("item")
        .populate("renter", "name email collegeName avatarUrl")
        .populate("poc", "name email")
        .sort({ createdAt: -1 })
        .lean(),
      WithdrawalRequest.find({ user: req.user._id }).sort({ createdAt: -1 }).lean(),
    ]);

    listedItems = myItems;
    incomingRequests = orders;
    withdrawalsList = withdrawals;

    const orderIds = orders.map((o) => o._id);
    const sellerTransactions = await Transaction.find({
      $or: [
        { order: { $in: orderIds } },
        { user: req.user._id, type: "withdrawal" }
      ]
    }).populate("order").sort({ createdAt: -1 }).lean();

    transactions = sellerTransactions;

    // Filter status
    const pendingOrders = orders.filter((o) => ["Pending Payment", "Payment Successful"].includes(o.status)).length;
    const activeRentals = orders.filter((o) => o.status === "Rental Active").length;
    const completedOrdersCount = orders.filter((o) => o.status === "Completed").length;

    // Calculate revenue
    const totalRevenue = orders
      .filter((o) => ["Delivered", "Rental Active", "Completed"].includes(o.status))
      .reduce((sum, o) => sum + o.totalPrice, 0);

    const monthlyRevenue = orders
      .filter((o) => {
        const isDelivered = ["Delivered", "Rental Active", "Completed"].includes(o.status);
        const thisMonth = new Date().getMonth() === new Date(o.createdAt).getMonth();
        return isDelivered && thisMonth;
      })
      .reduce((sum, o) => sum + o.totalPrice, 0);

    const pendingEscrow = sellerTransactions
      .filter((t) => t.type === "payment" && t.escrowStatus === "held")
      .reduce((sum, t) => sum + (t.sellerAmount || 0), 0);

    const releasedPayments = sellerTransactions
      .filter((t) => t.type === "release_to_seller" && t.status === "completed")
      .reduce((sum, t) => sum + t.amount, 0);

    const commissionWithheld = sellerTransactions
      .filter((t) => t.type === "commission" && t.status === "completed")
      .reduce((sum, t) => sum + t.amount, 0);

    stats = {
      totalProducts: myItems.length,
      activeRentals,
      completedOrders: completedOrdersCount,
      pendingOrders,
      totalRevenue,
      monthlyRevenue,
      commissionWithheld,
      pendingEscrow,
      releasedPayments,
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
        .sort({ createdAt: -1 })
        .lean(),
      RentalRequest.find({ poc: req.user._id })
        .populate("item")
        .populate("owner", "name email collegeName location")
        .populate("renter", "name email collegeName location")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // Grouping tasks
    const pendingPickups = [
      ...allTasks.filter((t) => t.status === "Seller Accepted" && !t.poc),
      ...myTasks.filter((t) => ["POC Assigned", "Pickup Scheduled", "Seller Accepted", "Pending Pickup", "Payment Successful", "COD Pending"].includes(t.status)),
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
    const [items, users, disputes, txs, colleges, allRequests, withdrawals] = await Promise.all([
      Item.find({}).populate("owner", "name email collegeName").lean(),
      User.find({}).select("-passwordHash").lean(),
      Dispute.find({})
        .populate({
          path: "order",
          populate: { path: "item renter owner" },
        })
        .populate("raisedBy", "name email role")
        .sort({ createdAt: -1 })
        .lean(),
      Transaction.find({})
        .populate("user", "name email role collegeName")
        .populate({
          path: "order",
          populate: { path: "item renter owner" },
        })
        .sort({ createdAt: -1 })
        .lean(),
      College.find({}).lean(),
      RentalRequest.find({})
        .populate("item")
        .populate("owner", "name email collegeName campus location ratingsAverage ratingsCount avatarUrl balance")
        .populate("renter", "name email collegeName campus location ratingsAverage ratingsCount avatarUrl balance")
        .populate("poc", "name email campus location")
        .sort({ createdAt: -1 })
        .lean(),
      WithdrawalRequest.find({}).populate("user", "name email collegeName balance").sort({ createdAt: -1 }).lean(),
    ]);

    disputeList = disputes;
    usersList = users;
    listedItems = items;
    transactions = txs;
    incomingRequests = allRequests;
    withdrawalsList = withdrawals;

    // Platform analytics
    const totalRevenue = txs
      .filter((t) => t.type === "payment" && t.status === "completed")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSales = totalRevenue;

    const totalCommissions = txs
      .filter((t) => t.type === "commission" && t.status === "completed")
      .reduce((sum, t) => sum + t.amount, 0);

    const commissionEarned = totalCommissions;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySales = txs
      .filter((t) => t.type === "payment" && t.status === "completed" && new Date(t.createdAt) >= todayStart)
      .reduce((sum, t) => sum + t.amount, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthlySales = txs
      .filter((t) => t.type === "payment" && t.status === "completed" && new Date(t.createdAt) >= monthStart)
      .reduce((sum, t) => sum + t.amount, 0);

    const pendingEscrow = txs
      .filter((t) => t.type === "payment" && t.escrowStatus === "held")
      .reduce((sum, t) => sum + t.amount, 0);

    const releasedEscrow = txs
      .filter((t) => t.type === "payment" && t.escrowStatus === "released")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalRefunds = txs
      .filter((t) => t.type === "refund" && t.status === "completed")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalWithdrawals = txs
      .filter((t) => t.type === "withdrawal" && t.status === "completed")
      .reduce((sum, t) => sum + t.amount, 0);

    const failedPayments = txs
      .filter((t) => t.type === "payment" && t.status === "failed")
      .reduce((sum, t) => sum + t.amount, 0);

    const failedPaymentsCount = txs
      .filter((t) => t.type === "payment" && t.status === "failed")
      .length;

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
      totalSales,
      todaySales,
      monthlySales,
      commissionEarned,
      pendingEscrow,
      releasedEscrow,
      totalRefunds,
      totalWithdrawals,
      failedPayments,
      failedPaymentsCount,
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
    withdrawals: withdrawalsList,
  });
});

export const getSystemSettings = asyncHandler(async (req, res) => {
  const commissionRate = await getSetting("platform_commission_rate", await getSetting("commission_rate", 10));
  const deliveryFee = await getSetting("delivery_fee", 50);
  const pocShareRate = await getSetting("poc_share_rate", 80);
  const platformDeliveryShareRate = await getSetting("platform_delivery_share_rate", 20);
  const minWithdrawalAmount = await getSetting("min_withdrawal_amount", 500);
  const codEnabled = await getSetting("cod_enabled", true);
  const escrowAutoReleaseHours = await getSetting("escrow_auto_release_hours", 24);

  res.json({
    platform_commission_rate: Number(commissionRate),
    delivery_fee: Number(deliveryFee),
    poc_share_rate: Number(pocShareRate),
    platform_delivery_share_rate: Number(platformDeliveryShareRate),
    min_withdrawal_amount: Number(minWithdrawalAmount),
    cod_enabled: Boolean(codEnabled),
    escrow_auto_release_hours: Number(escrowAutoReleaseHours),
  });
});

export const updateSystemSettings = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied: Admins only");
  }

  const {
    platform_commission_rate,
    delivery_fee,
    poc_share_rate,
    platform_delivery_share_rate,
    min_withdrawal_amount,
    cod_enabled,
    escrow_auto_release_hours,
  } = req.body;

  if (platform_commission_rate !== undefined) {
    const rate = Number(platform_commission_rate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      res.status(400);
      throw new Error("Platform commission rate must be between 0 and 100%");
    }
    await setSetting("platform_commission_rate", rate);
    await setSetting("commission_rate", rate);
  }

  if (delivery_fee !== undefined) {
    const fee = Number(delivery_fee);
    if (isNaN(fee) || fee < 0) {
      res.status(400);
      throw new Error("Delivery fee must be a positive number");
    }
    await setSetting("delivery_fee", fee);
  }

  if (poc_share_rate !== undefined) {
    const rate = Number(poc_share_rate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      res.status(400);
      throw new Error("POC share rate must be between 0 and 100%");
    }
    await setSetting("poc_share_rate", rate);
  }

  if (platform_delivery_share_rate !== undefined) {
    const rate = Number(platform_delivery_share_rate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      res.status(400);
      throw new Error("Platform delivery share rate must be between 0 and 100%");
    }
    await setSetting("platform_delivery_share_rate", rate);
  }

  if (min_withdrawal_amount !== undefined) {
    const minW = Number(min_withdrawal_amount);
    if (isNaN(minW) || minW < 0) {
      res.status(400);
      throw new Error("Minimum withdrawal amount must be a positive number");
    }
    await setSetting("min_withdrawal_amount", minW);
  }

  if (cod_enabled !== undefined) {
    await setSetting("cod_enabled", Boolean(cod_enabled));
  }

  if (escrow_auto_release_hours !== undefined) {
    const hours = Number(escrow_auto_release_hours);
    if (isNaN(hours) || hours < 0) {
      res.status(400);
      throw new Error("Escrow auto release hours must be a positive number");
    }
    await setSetting("escrow_auto_release_hours", hours);
  }

  res.json({
    success: true,
    message: "System settings updated successfully",
    settings: {
      platform_commission_rate: await getSetting("platform_commission_rate", 10),
      delivery_fee: await getSetting("delivery_fee", 50),
      poc_share_rate: await getSetting("poc_share_rate", 80),
      platform_delivery_share_rate: await getSetting("platform_delivery_share_rate", 20),
      min_withdrawal_amount: await getSetting("min_withdrawal_amount", 500),
      cod_enabled: await getSetting("cod_enabled", true),
      escrow_auto_release_hours: await getSetting("escrow_auto_release_hours", 24),
    }
  });
});
