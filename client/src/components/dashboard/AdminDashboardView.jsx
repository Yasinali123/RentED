import { useState, useEffect } from "react";
import {
  Users,
  AlertTriangle,
  ShieldCheck,
  DollarSign,
  School,
  Check,
  UserMinus,
  UserCheck,
  Trash2,
  List,
  Search,
  Filter,
  Plus,
  X,
  Eye,
  ShieldAlert,
  Award,
  FileText,
  Settings,
  ShoppingBag,
  Truck,
  CreditCard,
  Home,
  Megaphone,
  BarChart2,
  TrendingUp,
  RefreshCw,
  Clock,
  Unlock,
  Key,
  Tag
} from "lucide-react";

import Button from "../ui/Button";
import {
  authApi,
  disputeApi,
  itemApi,
  collegeApi,
  settingsApi,
  rentalApi,
  dashboardApi,
  couponApi,
  paymentApi,
  getErrorMessage
} from "../../api/client";
import UserSettingsView from "./UserSettingsView";

function AdminDashboardView({ dashboard, onRefresh }) {
  const { stats = {}, disputes = [], users: initialUsers = [], transactions: initialTx = [], listedItems: initialListings = [], incomingRequests: initialOrders = [], withdrawals: initialWithdrawals = [] } = dashboard;

  const [activeTab, setActiveTab] = useState("dashboard"); // sidebar navigation selection
  
  // Users state
  const [users, setUsers] = useState(initialUsers);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null); // Detail drawer

  // Listings state
  const [listings, setListings] = useState(initialListings);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listingsSearch, setListingsSearch] = useState("");
  const [listingsCategoryFilter, setListingsCategoryFilter] = useState("all");
  const [listingsStatusFilter, setListingsStatusFilter] = useState("all"); // "all", "approved", "suspended", "featured"
  
  // Orders state
  const [orders, setOrders] = useState(initialOrders);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null); // Detail modal

  // Payments state
  const [transactions, setTransactions] = useState(initialTx);
  const [txTypeFilter, setTxTypeFilter] = useState("all");

  // Withdrawals state
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);

  // Sync state with props
  useEffect(() => {
    setUsers(initialUsers);
    setTransactions(initialTx);
    setOrders(initialOrders);
    setListings(initialListings);
    setWithdrawals(initialWithdrawals);
  }, [dashboard]);

  // Colleges CRUD state
  const [colleges, setColleges] = useState([]);
  const [loadingColleges, setLoadingColleges] = useState(false);
  const [newCollege, setNewCollege] = useState({ name: "", city: "", state: "" });

  // System Settings state
  const [systemSettings, setSystemSettings] = useState({ commission_rate: 10, min_deposit: 100 });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Coupon state
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: "", discountType: "percentage", value: "", expiryDate: "" });

  // Load dynamically fetched data depending on tab
  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "listings" || activeTab === "rooms") {
      fetchListings();
    } else if (activeTab === "colleges") {
      fetchColleges();
    } else if (activeTab === "settings") {
      fetchSettings();
    } else if (activeTab === "coupons") {
      fetchCoupons();
    } else if (activeTab === "withdrawals") {
      fetchWithdrawals();
    }
  }, [activeTab]);

  const fetchWithdrawals = async () => {
    setLoadingWithdrawals(true);
    try {
      const data = await paymentApi.listWithdrawals();
      setWithdrawals(data);
    } catch (err) {
      console.error("Failed to load withdrawals:", err);
    } finally {
      setLoadingWithdrawals(false);
    }
  };

  const handleProcessWithdrawal = async (id, status) => {
    let adminNotes = "";
    if (status === "rejected") {
      adminNotes = window.prompt("Enter rejection reason:");
      if (adminNotes === null) return;
      if (!adminNotes.trim()) {
        alert("Rejection reason is required");
        return;
      }
    } else {
      adminNotes = window.prompt("Enter payment transaction details (reference ID, bank txn ID, etc.):");
      if (adminNotes === null) return;
    }

    try {
      await paymentApi.processWithdrawal(id, { status, adminNotes });
      alert(`Withdrawal request ${status} successfully!`);
      fetchWithdrawals();
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await authApi.getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchListings = async () => {
    setLoadingListings(true);
    try {
      const data = await itemApi.list({ includeUnavailable: "true" });
      setListings(data);
    } catch (err) {
      console.error("Failed to load items:", err);
    } finally {
      setLoadingListings(false);
    }
  };

  const fetchColleges = async () => {
    setLoadingColleges(true);
    try {
      const data = await collegeApi.list();
      setColleges(data);
    } catch (err) {
      console.error("Failed to load colleges:", err);
    } finally {
      setLoadingColleges(false);
    }
  };

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const data = await settingsApi.get();
      setSystemSettings(data);
    } catch (err) {
      console.error("Failed to load system settings:", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const data = await couponApi.list();
      setCoupons(data);
    } catch (err) {
      console.error("Failed to load coupons:", err);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!newCoupon.code.trim() || newCoupon.value === "" || !newCoupon.expiryDate) {
      alert("Please enter code, value, and expiry date");
      return;
    }
    try {
      await couponApi.create({
        code: newCoupon.code,
        discountType: newCoupon.discountType,
        value: Number(newCoupon.value),
        expiryDate: newCoupon.expiryDate
      });
      alert("Coupon created successfully!");
      setNewCoupon({ code: "", discountType: "percentage", value: "", expiryDate: "" });
      fetchCoupons();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleToggleCoupon = async (id) => {
    try {
      await couponApi.toggle(id);
      fetchCoupons();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await couponApi.delete(id);
      alert("Coupon deleted successfully!");
      fetchCoupons();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await settingsApi.update(systemSettings);
      alert("Settings saved and synced to platform successfully!");
      fetchSettings();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddCollege = async (e) => {
    e.preventDefault();
    if (!newCollege.name || !newCollege.city || !newCollege.state) {
      alert("Please enter all college fields");
      return;
    }
    try {
      await collegeApi.create(newCollege);
      alert("Campus Network Registered Successfully!");
      setNewCollege({ name: "", city: "", state: "" });
      fetchColleges();
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleDeleteCollege = async (id) => {
    if (!window.confirm("Are you sure you want to delete this campus network? It will fail if any active items are registered under it.")) return;
    try {
      await collegeApi.delete(id);
      alert("Campus network deleted.");
      fetchColleges();
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleUserStatus = async (userId, payload) => {
    try {
      await authApi.updateUserStatus(userId, payload);
      alert("User updated successfully!");
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser((prev) => ({ ...prev, ...payload }));
      }
      fetchUsers();
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleResetPassword = async (userId) => {
    const newPassword = window.prompt("Enter new password for this user:");
    if (!newPassword) return;
    try {
      await authApi.updateUserStatus(userId, { password: newPassword });
      alert("User password updated successfully!");
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleResolveDispute = async (disputeId, action) => {
    const details = window.prompt(`Enter resolution logs for action "${action}":`);
    if (details === null) return;
    try {
      await disputeApi.resolve(disputeId, { action, resolutionDetails: details });
      alert("Dispute resolved successfully!");
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleToggleItemApproval = async (itemId, isApproved) => {
    try {
      await itemApi.update(itemId, { isApproved });
      alert(`Listing ${isApproved ? "approved" : "suspended"} successfully!`);
      fetchListings();
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleToggleItemFeatured = async (itemId, isFeatured) => {
    try {
      await itemApi.update(itemId, { isFeatured });
      alert(`Listing ${isFeatured ? "promoted to Featured" : "removed from Featured"}!`);
      fetchListings();
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleItemCategory = async (itemId, category) => {
    try {
      await itemApi.update(itemId, { category });
      alert(`Product category updated to: ${category}`);
      fetchListings();
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleRemoveListing = async (itemId) => {
    if (!window.confirm("Are you sure you want to flag and delete this listing?")) return;
    try {
      await itemApi.delete(itemId);
      alert("Listing deleted.");
      fetchListings();
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleOrderOverride = async (orderId, payload) => {
    try {
      await rentalApi.adminUpdateRental(orderId, payload);
      alert("Order modified successfully!");
      if (selectedOrder && selectedOrder._id === orderId) {
        // Refresh details modal
        const refreshedOrders = await dashboardApi.get();
        const updated = (refreshedOrders.incomingRequests || []).find(o => o._id === orderId);
        if (updated) setSelectedOrder(updated);
      }
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  // Helper arrays
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
    "Room / PG Listings"
  ];

  const orderStatuses = [
    "Pending Payment",
    "Payment Successful",
    "Seller Accepted",
    "POC Assigned",
    "Pickup Scheduled",
    "Picked Up",
    "Out For Delivery",
    "Delivered",
    "Rental Active",
    "Return Requested",
    "Returned",
    "Completed",
    "Cancelled",
    "Refund Completed"
  ];

  // Filters calculations
  const filteredListings = listings.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(listingsSearch.toLowerCase()) ||
      (item.owner?.name || "").toLowerCase().includes(listingsSearch.toLowerCase()) ||
      (item.collegeName || "").toLowerCase().includes(listingsSearch.toLowerCase());
    
    const matchesCategory =
      listingsCategoryFilter === "all" || item.category === listingsCategoryFilter;

    let matchesStatus = true;
    if (listingsStatusFilter === "pending") {
      matchesStatus = item.isApproved === false;
    } else if (listingsStatusFilter === "approved") {
      matchesStatus = item.isApproved !== false;
    } else if (listingsStatusFilter === "featured") {
      matchesStatus = item.isFeatured === true;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredRooms = listings.filter((item) => {
    if (item.category !== "Room / PG Listings") return false;
    const matchesSearch =
      item.title.toLowerCase().includes(listingsSearch.toLowerCase()) ||
      (item.owner?.name || "").toLowerCase().includes(listingsSearch.toLowerCase()) ||
      (item.collegeName || "").toLowerCase().includes(listingsSearch.toLowerCase());
    return matchesSearch;
  });

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.collegeName || "").toLowerCase().includes(userSearch.toLowerCase());
    
    const matchesRole = roleFilter === "all" || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o._id.toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.renter?.name || "").toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.owner?.name || "").toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.item?.title || "").toLowerCase().includes(orderSearch.toLowerCase());

    const matchesStatus = orderStatusFilter === "all" || o.status === orderStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredTransactions = transactions.filter((t) => {
    if (txTypeFilter === "all") return true;
    return t.type === txTypeFilter;
  });

  // POC-specific statistics
  const pocUsers = users.filter(u => u.role === "poc" && u.isPocApproved);
  const getPocMetrics = (pocId) => {
    const pocDeliveries = orders.filter(o => o.poc?._id === pocId);
    const completed = pocDeliveries.filter(o => ["Delivered", "Completed", "Returned"].includes(o.status)).length;
    const active = pocDeliveries.filter(o => ["POC Assigned", "Pickup Scheduled", "Picked Up", "Out For Delivery"].includes(o.status)).length;
    return { completed, active };
  };

  // Nav Items
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart2 },
    { id: "listings", label: "Marketplace", icon: ShoppingBag },
    { id: "users", label: "Users Directory", icon: Users },
    { id: "orders", label: "Orders Logistics", icon: List },
    { id: "poc", label: "POC Dispatch", icon: Truck },
    { id: "payments", label: "Payments Audit", icon: CreditCard },
    { id: "withdrawals", label: "Withdrawals Queue", icon: DollarSign },
    { id: "disputes", label: "Disputes & Claims", icon: AlertTriangle },
    { id: "rooms", label: "PG & Rooms", icon: Home },
    { id: "ads", label: "Promotional Ads", icon: Megaphone },
    { id: "analytics", label: "Analytics Charts", icon: TrendingUp },
    { id: "colleges", label: "College Network", icon: School },
    { id: "coupons", label: "Coupon Codes", icon: Tag },
    { id: "settings", label: "System Settings", icon: Settings },
    { id: "user-settings", label: "⚙️ User Settings", icon: Settings }
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Side Operation Selector */}
      <aside className="w-full lg:w-64 shrink-0 bg-white border border-ink/5 rounded-3xl p-4 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible shadow-sm">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black tracking-wider uppercase transition-all whitespace-nowrap lg:whitespace-normal w-full justify-start ${
                activeTab === item.id
                  ? "bg-accent text-white shadow-md shadow-accent/20"
                  : "bg-transparent text-ink/65 hover:bg-canvas hover:text-ink"
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </aside>

      {/* Main Workspace Console */}
      <div className="flex-1 w-full min-w-0">
        
        {/* TAB 1: OPERATIONAL DASHBOARD OVERVIEW */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <div className="panel p-5 bg-gradient-to-br from-accent to-accent/90 border-none text-white shadow-lg shadow-accent/10">
                <div className="flex items-center justify-between opacity-80">
                  <p className="text-[10px] font-black uppercase tracking-widest">Total Users</p>
                  <Users className="h-5 w-5" />
                </div>
                <p className="text-3xl font-black mt-2">{stats.totalUsers || users.length}</p>
                <div className="flex gap-2 text-[9px] font-bold opacity-75 mt-2 pt-2 border-t border-white/10">
                  <span>Stu: {stats.totalStudents}</span>
                  <span>Sel: {stats.totalSellers}</span>
                  <span>POC: {stats.totalPocs}</span>
                </div>
              </div>

              <div className="panel p-5 bg-gradient-to-br from-accent to-accent/90 border-none text-white shadow-lg shadow-accent/10">
                <div className="flex items-center justify-between opacity-80">
                  <p className="text-[10px] font-black uppercase tracking-widest">Active Orders</p>
                  <List className="h-5 w-5" />
                </div>
                <p className="text-3xl font-black mt-2">{stats.totalOrders || orders.length}</p>
                <div className="flex gap-2 text-[9px] font-bold opacity-75 mt-2 pt-2 border-t border-white/10">
                  <span>Rentals: {stats.activeRentals || 0}</span>
                  <span>Pending Dlv: {stats.pendingDeliveries || 0}</span>
                </div>
              </div>

              <div className="panel p-5 bg-gradient-to-br from-accent to-accent/90 border-none text-white shadow-lg shadow-accent/10">
                <div className="flex items-center justify-between opacity-80">
                  <p className="text-[10px] font-black uppercase tracking-widest">Sales Volume</p>
                  <DollarSign className="h-5 w-5" />
                </div>
                <p className="text-3xl font-black mt-2">Rs. {stats.totalRevenue || 0}</p>
                <p className="text-[9px] font-bold opacity-75 mt-2 pt-2 border-t border-white/10">
                  Total transactions on platform
                </p>
              </div>

              <div className="panel p-5 bg-gradient-to-br from-accent to-accent/90 border-none text-white shadow-lg shadow-accent/10">
                <div className="flex items-center justify-between opacity-80">
                  <p className="text-[10px] font-black uppercase tracking-widest">Commissions</p>
                  <DollarSign className="h-5 w-5" />
                </div>
                <p className="text-3xl font-black mt-2">Rs. {stats.totalCommissions || 0}</p>
                <p className="text-[9px] font-bold opacity-75 mt-2 pt-2 border-t border-white/10">
                  Platform Fee Share (Commission)
                </p>
              </div>
            </div>

            {/* Revenue & Escrow Financial Health Board */}
            <div className="panel p-5 bg-gradient-to-r from-indigo-950 to-slate-950 text-white border-none shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-accent flex items-center gap-2">
                  💳 Platform Financial Ledger & Escrow Health
                </h3>
                <p className="text-[11px] text-white/60">Real-time statistics of payments, escrows, and platform commissions.</p>
              </div>

              <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <span className="text-[9px] font-black uppercase text-white/50 tracking-wider">Today's Sales</span>
                  <p className="text-lg font-black text-white mt-1">Rs. {stats.todaySales || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <span className="text-[9px] font-black uppercase text-white/50 tracking-wider">Monthly Sales</span>
                  <p className="text-lg font-black text-white mt-1">Rs. {stats.monthlySales || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider">Escrow Held</span>
                  <p className="text-lg font-black text-amber-400 mt-1">Rs. {stats.pendingEscrow || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <span className="text-[9px] font-black uppercase text-emerald-500 tracking-wider">Released Escrow</span>
                  <p className="text-lg font-black text-emerald-400 mt-1">Rs. {stats.releasedEscrow || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <span className="text-[9px] font-black uppercase text-red-400 tracking-wider">Total Refunds</span>
                  <p className="text-lg font-black text-red-300 mt-1">Rs. {stats.totalRefunds || 0}</p>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 pt-2">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex justify-between items-center px-4">
                  <span className="text-[10px] font-bold text-white/70">Commission Earned</span>
                  <span className="text-sm font-black text-purple-300">Rs. {stats.commissionEarned || 0}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex justify-between items-center px-4">
                  <span className="text-[10px] font-bold text-white/70">Total Withdrawals (Paid)</span>
                  <span className="text-sm font-black text-blue-300">Rs. {stats.totalWithdrawals || 0}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex justify-between items-center px-4 border-red-500/20 bg-red-950/20">
                  <span className="text-[10px] font-bold text-red-400">Failed Payments</span>
                  <span className="text-sm font-black text-red-400">Rs. {stats.failedPayments || 0} ({stats.failedPaymentsCount || 0} txs)</span>
                </div>
              </div>
            </div>

            {/* Quick Status and Disputes */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="panel p-5 bg-white md:col-span-2 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-2">
                  <Clock className="h-4 w-4 text-accent" /> Recent Transaction Audits
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-ink/5 text-ink/40 uppercase">
                        <th className="py-2">Date</th>
                        <th className="py-2">User</th>
                        <th className="py-2">Type</th>
                        <th className="py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5">
                      {transactions.slice(0, 5).map((t) => (
                        <tr key={t._id}>
                          <td className="py-2 text-ink/50">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2 font-bold text-ink">
                            {t.user?.name || "User"}
                            <span className="text-[9px] text-ink/40 block">{t.user?.email}</span>
                          </td>
                          <td className="py-2 capitalize font-bold text-indigo-600">
                            {t.type.replace(/_/g, " ")}
                          </td>
                          <td className="py-2 text-right font-black text-ink">
                            Rs. {t.amount}
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan="4" className="py-4 text-center text-ink/40">No transactions recorded.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* System Alerts panel */}
              <div className="panel p-5 bg-white space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" /> Platform Security Alerts
                </h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2.5">
                    <AlertTriangle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-black text-red-950">Active disputes</p>
                      <p className="text-[10px] text-red-800/80 mt-0.5">
                        {stats.activeDisputes || disputes.filter(d => d.status === "pending").length} orders are held in escrow due to buyer/seller disputes.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2.5">
                    <UserCheck className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-black text-amber-950">POC Verifications</p>
                      <p className="text-[10px] text-amber-800/80 mt-0.5">
                        {stats.pendingPocApprovals || users.filter(u => u.role === "poc" && !u.isPocApproved).length} new college dispatcher profiles require manual credentials verification.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MARKETPLACE DIRECTORY */}
        {activeTab === "listings" && (
          <div className="panel p-6 bg-white space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-ink/5 pb-4">
              <div>
                <h2 className="text-lg font-black text-ink">Marketplace Products Directory</h2>
                <p className="text-xs text-ink/40">Approve, feature, categorize, or delete campus listings.</p>
              </div>

              {/* Filters grid */}
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <div className="flex items-center bg-canvas rounded-full px-3 py-1.5 border border-ink/10 w-full sm:w-auto">
                  <Search className="h-3.5 w-3.5 text-ink/45 mr-2" />
                  <input
                    placeholder="Search listings, college, seller..."
                    className="bg-transparent outline-none text-xs w-full sm:w-48 text-ink"
                    value={listingsSearch}
                    onChange={(e) => setListingsSearch(e.target.value)}
                  />
                </div>

                <select
                  className="bg-canvas border border-ink/10 rounded-full px-3 py-1.5 text-xs text-ink/75 outline-none font-bold"
                  value={listingsCategoryFilter}
                  onChange={(e) => setListingsCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <select
                  className="bg-canvas border border-ink/10 rounded-full px-3 py-1.5 text-xs text-ink/75 outline-none font-bold"
                  value={listingsStatusFilter}
                  onChange={(e) => setListingsStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved/Active</option>
                  <option value="pending">Suspended/Pending</option>
                  <option value="featured">Featured Listings</option>
                </select>
              </div>
            </div>

            {loadingListings ? (
              <p className="text-xs text-ink/50 text-center py-8">Loading listings directory...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-ink/5 text-ink/40 uppercase">
                      <th className="py-2">Listing info</th>
                      <th className="py-2">Seller profile</th>
                      <th className="py-2">Pricing details</th>
                      <th className="py-2">Campus association</th>
                      <th className="py-2">Category</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {filteredListings.map((item) => (
                      <tr key={item._id} className={item.isApproved === false ? "bg-red-50/20" : ""}>
                        <td className="py-3 flex items-center gap-3">
                          <img src={item.image || "https://placehold.co/100"} alt={item.title} className="h-10 w-10 object-cover rounded-lg bg-mist" />
                          <div>
                            <p className="font-bold text-ink text-sm flex items-center gap-1.5">
                              {item.title}
                              {item.isFeatured && (
                                <span className="text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.25 rounded-full">Featured</span>
                              )}
                            </p>
                            <span className="text-[10px] text-ink/40 block mt-0.5">Availability: <b>{item.availabilityStatus}</b></span>
                          </div>
                        </td>
                        <td className="py-3">
                          <p className="font-bold text-ink">{item.owner?.name || "Seller"}</p>
                          <p className="text-[10px] text-ink/50">{item.owner?.email}</p>
                        </td>
                        <td className="py-3">
                          {item.rentalPrice && <p className="text-accent font-bold">Rent: Rs.{item.rentalPrice}/day</p>}
                          {item.salePrice && <p className="text-ink font-bold">Sale: Rs.{item.salePrice}</p>}
                        </td>
                        <td className="py-3">
                          <p className="font-semibold text-ink/80">{item.collegeName}</p>
                          <p className="text-[10px] text-ink/40">{item.city}, {item.state}</p>
                        </td>
                        <td className="py-3">
                          <select
                            className="bg-transparent text-[11px] font-bold border-b border-ink/10 text-ink/75 outline-none"
                            value={item.category}
                            onChange={(e) => handleItemCategory(item._id, e.target.value)}
                          >
                            {categoriesList.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {item.isApproved !== false ? (
                              <button
                                onClick={() => handleToggleItemApproval(item._id, false)}
                                className="p-1.5 border border-amber-100 text-amber-600 bg-amber-50/50 rounded-lg hover:bg-amber-50"
                                title="Suspend Item Listing"
                              >
                                <UserMinus className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleItemApproval(item._id, true)}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200"
                                title="Approve Listing"
                              >
                                <UserCheck className="h-4 w-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleToggleItemFeatured(item._id, !item.isFeatured)}
                              className={`p-1.5 border rounded-lg ${
                                item.isFeatured 
                                  ? "border-purple-200 text-purple-700 bg-purple-50" 
                                  : "border-ink/10 text-ink/65 hover:bg-canvas"
                              }`}
                              title="Toggle Featured Promo"
                            >
                              <Award className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleRemoveListing(item._id)}
                              className="p-1.5 border border-red-100 text-red-500 bg-red-50/50 rounded-lg hover:bg-red-100"
                              title="Flag & Delete product"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredListings.length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-ink/40">No items match your filter.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: USERS CONTROL PANEL */}
        {activeTab === "users" && (
          <div className="panel p-6 bg-white space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-ink/5 pb-4">
              <div>
                <h2 className="text-lg font-black text-ink">User Directory & CRM</h2>
                <p className="text-xs text-ink/40">Change user roles, verify dispatcher POCs, suspend, or reset passwords.</p>
              </div>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <div className="flex items-center bg-canvas rounded-full px-3 py-1.5 border border-ink/10 w-full sm:w-auto">
                  <Search className="h-3.5 w-3.5 text-ink/45 mr-2" />
                  <input
                    placeholder="Search users by name, email, college..."
                    className="bg-transparent outline-none text-xs w-full sm:w-48 text-ink"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>

                <select
                  className="bg-canvas border border-ink/10 rounded-full px-3 py-1.5 text-xs text-ink/75 outline-none font-bold"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students</option>
                  <option value="seller">Sellers</option>
                  <option value="poc">POC Dispatchers</option>
                  <option value="admin">Administrators</option>
                </select>
              </div>
            </div>

            {loadingUsers ? (
              <p className="text-xs text-ink/50 text-center py-8">Syncing user directory...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-ink/5 text-ink/40 uppercase">
                      <th className="py-2">User details</th>
                      <th className="py-2">Institution & Campus ID</th>
                      <th className="py-2">Account Role</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {filteredUsers.map((u) => (
                      <tr key={u._id} className={u.isSuspended ? "bg-red-50/20" : ""}>
                        <td className="py-3">
                          <p className="font-bold text-sm text-ink">{u.name}</p>
                          <p className="text-xs text-ink/50 mt-0.5">{u.email}</p>
                        </td>
                        <td className="py-3">
                          <p className="font-medium text-ink/80">{u.collegeName || u.campus || "N/A"}</p>
                          <p className="text-[10px] text-ink/45">ID: {u.collegeId || "No ID"}</p>
                        </td>
                        <td className="py-3">
                          <select
                            className="bg-transparent capitalize font-bold border-b border-ink/15 text-ink/75 outline-none"
                            value={u.role || "student"}
                            onChange={(e) => handleUserStatus(u._id, { role: e.target.value })}
                          >
                            <option value="student">Student</option>
                            <option value="seller">Seller</option>
                            <option value="poc">POC Dispatcher</option>
                            <option value="admin">Administrator</option>
                          </select>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-col gap-1 items-start">
                            {u.isSuspended ? (
                              <span className="text-[9px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">Suspended</span>
                            ) : (
                              <span className="text-[9px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">Active</span>
                            )}
                            
                            {u.role === "poc" && (
                              u.isPocApproved ? (
                                <span className="text-[8px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.25 rounded-md mt-0.5">POC Approved</span>
                              ) : (
                                <span className="text-[8px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.25 rounded-md mt-0.5">Pending Review</span>
                              )
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedUser(u)}
                              className="p-1.5 border border-indigo-100 text-indigo-600 bg-indigo-50/50 rounded-lg hover:bg-indigo-100"
                              title="View details profile"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {u.role === "poc" && !u.isPocApproved && (
                              <button
                                onClick={() => handleUserStatus(u._id, { isPocApproved: true })}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200"
                                title="Approve POC"
                              >
                                <UserCheck className="h-4 w-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleResetPassword(u._id)}
                              className="p-1.5 border border-purple-100 text-purple-600 bg-purple-50/50 rounded-lg hover:bg-purple-150"
                              title="Reset Password"
                            >
                              <Key className="h-4 w-4" />
                            </button>

                            {u.isSuspended ? (
                              <Button
                                onClick={() => handleUserStatus(u._id, { isSuspended: false })}
                                variant="ghost"
                                className="text-[10px] text-emerald-600 hover:bg-emerald-50 py-1 px-3.5 rounded-full font-bold border border-emerald-200"
                              >
                                Unsuspend
                              </Button>
                            ) : (
                              <button
                                onClick={() => handleUserStatus(u._id, { isSuspended: true })}
                                className="p-1.5 border border-red-100 text-red-500 bg-red-50/50 rounded-lg hover:bg-red-100"
                                title="Suspend Account"
                              >
                                <UserMinus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-ink/40">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ORDERS LOGISTICS */}
        {activeTab === "orders" && (
          <div className="panel p-6 bg-white space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-ink/5 pb-4">
              <div>
                <h2 className="text-lg font-black text-ink">Orders Operations Hub</h2>
                <p className="text-xs text-ink/40">Manually override logistics statuses or assign campus dispatchers.</p>
              </div>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <div className="flex items-center bg-canvas rounded-full px-3 py-1.5 border border-ink/10 w-full sm:w-auto">
                  <Search className="h-3.5 w-3.5 text-ink/45 mr-2" />
                  <input
                    placeholder="Search ID, buyer, seller..."
                    className="bg-transparent outline-none text-xs w-full sm:w-48 text-ink"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                  />
                </div>

                <select
                  className="bg-canvas border border-ink/10 rounded-full px-3 py-1.5 text-xs text-ink/75 outline-none font-bold"
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  {orderStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-ink/5 text-ink/40 uppercase">
                    <th className="py-2">Order ID</th>
                    <th className="py-2">Product listing</th>
                    <th className="py-2">Transaction party</th>
                    <th className="py-2">Campus POC</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Status override</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {filteredOrders.map((o) => (
                    <tr key={o._id}>
                      <td className="py-3 font-mono font-bold text-ink/75">
                        {o._id.substring(o._id.length - 8).toUpperCase()}
                      </td>
                      <td className="py-3">
                        <p className="font-bold text-ink">{o.item?.title || "Deleted Item"}</p>
                        <p className="text-[10px] capitalize text-ink/40">
                          {o.requestType} • {o.paymentMethod.toUpperCase()}
                        </p>
                      </td>
                      <td className="py-3">
                        <p className="text-ink font-semibold">
                          By: <span className="font-bold">{o.renter?.name || "Student"}</span>
                        </p>
                        <p className="text-[10px] text-ink/50 mt-0.5">
                          From: {o.owner?.name || "Seller"}
                        </p>
                      </td>
                      <td className="py-3">
                        <select
                          className="bg-canvas border border-ink/10 rounded-lg p-1 text-[11px] font-bold text-ink/80 outline-none"
                          value={o.poc?._id || ""}
                          onChange={(e) => handleOrderOverride(o._id, { pocId: e.target.value })}
                        >
                          <option value="">Unassigned</option>
                          {pocUsers.map(poc => (
                            <option key={poc._id} value={poc._id}>{poc.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 font-bold text-ink">
                        Rs. {o.totalPrice}
                      </td>
                      <td className="py-3">
                        <select
                          className="bg-transparent text-[11px] font-bold border-b border-ink/10 text-ink/75 outline-none"
                          value={o.status}
                          onChange={(e) => handleOrderOverride(o._id, { status: e.target.value })}
                        >
                          {orderStatuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-1.5 border border-indigo-100 text-indigo-600 bg-indigo-50/50 rounded-lg hover:bg-indigo-100"
                          title="View Order Details & Timeline"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-ink/40">No orders registered.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: POC DISPATCH MANAGEMENT */}
        {activeTab === "poc" && (
          <div className="panel p-6 bg-white space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink">Campus dispatcher (POC) Hub</h2>
              <p className="text-xs text-ink/40">View logistics performance or approve credentials.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {pocUsers.map((poc) => {
                const metrics = getPocMetrics(poc._id);
                return (
                  <div key={poc._id} className="panel p-5 bg-canvas/30 border border-ink/5 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-black text-base text-ink">{poc.name}</p>
                          <p className="text-xs text-ink/50 mt-0.5">{poc.email}</p>
                        </div>
                        <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Approved</span>
                      </div>
                      <p className="text-[11px] text-ink/65 mt-2">Campus: <b>{poc.collegeName || poc.campus}</b></p>
                      <p className="text-[11px] text-ink/65 mt-0.5">Rating: <b>★ {poc.ratingsAverage}</b> ({poc.ratingsCount || 0} reviews)</p>
                    </div>

                    <div className="flex gap-4 pt-3 border-t border-ink/5 text-center">
                      <div className="flex-1">
                        <p className="text-base font-black text-ink">{metrics.completed}</p>
                        <p className="text-[9px] uppercase tracking-wider text-ink/40 mt-0.5">Completed Tasks</p>
                      </div>
                      <div className="flex-1 border-l border-ink/5">
                        <p className="text-base font-black text-amber-700">{metrics.active}</p>
                        <p className="text-[9px] uppercase tracking-wider text-ink/40 mt-0.5">Active Deliveries</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {pocUsers.length === 0 && (
                <p className="text-xs text-ink/40">No approved POC dispatchers registered on the platform.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: PAYMENTS & FINANCIAL AUDIT */}
        {activeTab === "payments" && (
          <div className="panel p-6 bg-white space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-ink/5 pb-4">
              <div>
                <h2 className="text-lg font-black text-ink">Transactions ledger</h2>
                <p className="text-xs text-ink/40">Audit payments, deposits, seller releases, refunds, and platform commissions.</p>
              </div>

              <select
                className="bg-canvas border border-ink/10 rounded-full px-3 py-1.5 text-xs text-ink/75 outline-none font-bold"
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="payment">Buyer Payments</option>
                <option value="release_to_seller">Payouts</option>
                <option value="commission">Commission Earnings</option>
                <option value="refund">Refunds</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-ink/5 text-ink/40 uppercase">
                    <th className="py-2">Datetime</th>
                    <th className="py-2">User Profile</th>
                    <th className="py-2">Ledger Type</th>
                    <th className="py-2">Linked Order</th>
                    <th className="py-2">Payout Amount</th>
                    <th className="py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {filteredTransactions.map((t) => (
                    <tr key={t._id}>
                      <td className="py-3 text-ink/50">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 font-bold text-ink">
                        {t.user?.name || "User"}
                        <span className="text-[10px] text-ink/40 block mt-0.5">{t.user?.email}</span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border capitalize ${
                          t.type === "commission" ? "bg-purple-50 text-purple-700 border-purple-100" :
                          t.type === "payment" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          t.type === "release_to_seller" ? "bg-blue-50 text-blue-700 border-blue-100" :
                          t.type === "refund" ? "bg-amber-50 text-amber-700 border-amber-100" :
                          "bg-ink/5 text-ink border-ink/10"
                        }`}>
                          {t.type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-ink/65">
                        {t.order ? (
                          <span className="font-mono text-[10px] bg-canvas px-1.5 py-0.5 rounded border border-ink/5">
                            {t.order._id?.substring(t.order._id.length - 8).toUpperCase()}
                          </span>
                        ) : "N/A (Direct Wallet Deposit)"}
                      </td>
                      <td className="py-3 font-black text-ink">
                        Rs. {t.amount}
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-bold">Completed</span>
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-ink/40">No matching transactions logged.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6.5: WITHDRAWALS QUEUE */}
        {activeTab === "withdrawals" && (
          <div className="panel p-6 bg-white space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink">Manual Payouts & Withdrawals Queue</h2>
              <p className="text-xs text-ink/40">Review, approve (with reference details), or reject student/seller payout withdrawal requests.</p>
            </div>

            <div className="space-y-6">
              {/* Section 1: Pending Requests */}
              <div className="space-y-3">
                <h3 className="text-sm font-black uppercase text-amber-700 tracking-wider flex items-center gap-1.5">
                  ⏳ Pending Payout Requests
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-ink/5 text-ink/40 uppercase">
                        <th className="py-2">Date Requested</th>
                        <th className="py-2">User Profile</th>
                        <th className="py-2">Wallet Balance</th>
                        <th className="py-2">Payout Amount</th>
                        <th className="py-2">Transfer Details</th>
                        <th className="py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5">
                      {withdrawals.filter(w => w.status === "pending").map((w) => (
                        <tr key={w._id}>
                          <td className="py-3 text-ink/50">
                            {new Date(w.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 font-bold text-ink">
                            {w.user?.name || "Seller"}
                            <span className="text-[10px] text-ink/40 block mt-0.5">{w.user?.email}</span>
                          </td>
                          <td className="py-3 font-medium text-ink/70">
                            Rs. {w.user?.balance ?? w.amount}
                          </td>
                          <td className="py-3 font-black text-indigo-700">
                            Rs. {w.amount}
                          </td>
                          <td className="py-3 font-semibold text-ink/80 max-w-[200px] truncate" title={w.paymentDetails}>
                            <span className="chip uppercase text-[9px] py-0.5 px-2 bg-mist border text-ink mr-1.5">{w.paymentMethod}</span>
                            {w.paymentDetails}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                onClick={() => handleProcessWithdrawal(w._id, "approved")}
                                variant="secondary"
                                className="text-[10px] py-1 px-3 rounded-full font-bold bg-emerald-600 hover:bg-emerald-700 border-none"
                              >
                                Approve & Payout
                              </Button>
                              <Button
                                onClick={() => handleProcessWithdrawal(w._id, "rejected")}
                                variant="ghost"
                                className="text-[10px] py-1 px-3 rounded-full font-bold border border-red-200 text-red-600 hover:bg-red-50"
                              >
                                Reject Request
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {withdrawals.filter(w => w.status === "pending").length === 0 && (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-ink/40">No pending withdrawal requests in queue.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 2: Historical Request Logs */}
              <div className="space-y-3 pt-4 border-t border-ink/5">
                <h3 className="text-sm font-black uppercase text-ink/60 tracking-wider">
                  📜 Payout Logs Archive
                </h3>
                
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-ink/5 text-ink/40 uppercase">
                        <th className="py-2">Processed Date</th>
                        <th className="py-2">User Profile</th>
                        <th className="py-2">Payout Amount</th>
                        <th className="py-2">Details</th>
                        <th className="py-2">Status</th>
                        <th className="py-2 text-right">Reference Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5">
                      {withdrawals.filter(w => w.status !== "pending").map((w) => (
                        <tr key={w._id}>
                          <td className="py-3 text-ink/50">
                            {new Date(w.updatedAt).toLocaleString()}
                          </td>
                          <td className="py-3 font-bold text-ink">
                            {w.user?.name || "Seller"}
                            <span className="text-[10px] text-ink/40 block mt-0.5">{w.user?.email}</span>
                          </td>
                          <td className="py-3 font-black text-ink">
                            Rs. {w.amount}
                          </td>
                          <td className="py-3 text-ink/60 max-w-[180px] truncate" title={w.paymentDetails}>
                            <span className="chip uppercase text-[9px] py-0.5 px-1.5 bg-mist text-ink mr-1">{w.paymentMethod}</span>
                            {w.paymentDetails}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border capitalize ${
                              w.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                              w.status === "rejected" ? "bg-red-50 text-red-700 border-red-100" :
                              "bg-ink/5 text-ink border-ink/10"
                            }`}>
                              {w.status}
                            </span>
                          </td>
                          <td className="py-3 text-right max-w-[200px] truncate text-[11px]" title={w.adminNotes || ""}>
                            {w.adminNotes ? (
                              <span className={w.status === "rejected" ? "text-red-500 font-medium" : "text-ink/70 font-mono"}>
                                {w.adminNotes}
                              </span>
                            ) : (
                              <span className="text-ink/30">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {withdrawals.filter(w => w.status !== "pending").length === 0 && (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-ink/40">No processed withdrawal history logged.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: PG & ROOM listings */}
        {activeTab === "rooms" && (
          <div className="panel p-6 bg-white space-y-6">
            <div className="flex justify-between items-center border-b border-ink/5 pb-4">
              <div>
                <h2 className="text-lg font-black text-ink">PG & Room Listings Board</h2>
                <p className="text-xs text-ink/40">Manage student housing and PG Listings specifically.</p>
              </div>

              <div className="flex items-center bg-canvas rounded-full px-3 py-1.5 border border-ink/10 w-full sm:w-auto">
                <Search className="h-3.5 w-3.5 text-ink/45 mr-2" />
                <input
                  placeholder="Search rooms, location..."
                  className="bg-transparent outline-none text-xs w-full sm:w-48 text-ink"
                  value={listingsSearch}
                  onChange={(e) => setListingsSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-ink/5 text-ink/40 uppercase">
                    <th className="py-2">Room / PG Listing</th>
                    <th className="py-2">Owner</th>
                    <th className="py-2">Price Info</th>
                    <th className="py-2">Institution Proximity</th>
                    <th className="py-2">Approval Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {filteredRooms.map((item) => (
                    <tr key={item._id} className={item.isApproved === false ? "bg-red-50/20" : ""}>
                      <td className="py-3 flex items-center gap-3">
                        <img src={item.image || "https://placehold.co/100"} alt={item.title} className="h-10 w-10 object-cover rounded-lg bg-mist" />
                        <div>
                          <p className="font-bold text-sm text-ink">{item.title}</p>
                          <span className="text-[10px] text-ink/40">{item.location}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <p className="font-bold">{item.owner?.name}</p>
                        <p className="text-xs text-ink/55">{item.owner?.email}</p>
                      </td>
                      <td className="py-3">
                        {item.rentalPrice && <p className="text-accent font-semibold">Rs.{item.rentalPrice}/month</p>}
                      </td>
                      <td className="py-3">
                        <p>{item.collegeName}</p>
                        <p className="text-[10px] text-ink/40">{item.city}, {item.state}</p>
                      </td>
                      <td className="py-3">
                        {item.isApproved !== false ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-bold">Approved</span>
                        ) : (
                          <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 font-bold">Suspended</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {item.isApproved !== false ? (
                            <button
                              onClick={() => handleToggleItemApproval(item._id, false)}
                              className="p-1.5 border border-amber-100 text-amber-600 rounded-lg hover:bg-amber-50"
                              title="Suspend Room"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleItemApproval(item._id, true)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200"
                              title="Approve Room"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveListing(item._id)}
                            className="p-1.5 border border-red-100 text-red-500 rounded-lg hover:bg-red-50"
                            title="Delete fake PG listing"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRooms.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-ink/40">No PG listings found in marketplace.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7.5: DISPUTES & CLAIMS MEDIATION */}
        {activeTab === "disputes" && (
          <div className="panel p-6 bg-white space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink">Platform Dispute Resolution Center</h2>
              <p className="text-xs text-ink/40">Mediate and resolve escrow disputes between buyers, sellers, and logistics.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-ink/5 text-ink/40 uppercase">
                    <th className="py-2">Order ID</th>
                    <th className="py-2">Raised By</th>
                    <th className="py-2">Reason</th>
                    <th className="py-2">Disputed Parties</th>
                    <th className="py-2">Escrow Value</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {disputes.map((d) => (
                    <tr key={d._id}>
                      <td className="py-3 font-mono font-bold text-ink/70">
                        {d.order?._id ? d.order._id.substring(d.order._id.length - 8).toUpperCase() : "N/A"}
                      </td>
                      <td className="py-3">
                        <p className="font-bold text-ink">{d.raisedBy?.name || "System"}</p>
                        <p className="text-[10px] text-ink/40 capitalize">{d.raisedBy?.role || "user"}</p>
                      </td>
                      <td className="py-3 text-ink/75 max-w-[200px] truncate" title={d.reason}>
                        {d.reason}
                      </td>
                      <td className="py-3 text-[10px]">
                        <p>Buyer: <b>{d.order?.renter?.name || "N/A"}</b></p>
                        <p className="text-ink/45 mt-0.5">Seller: {d.order?.owner?.name || "N/A"}</p>
                      </td>
                      <td className="py-3 font-black text-ink">
                        Rs. {d.order?.totalPrice || 0}
                      </td>
                      <td className="py-3">
                        <span className={`chip text-[9px] py-0.5 px-2 font-bold uppercase rounded-full border ${
                          d.status === "pending"
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : d.status === "resolved_refunded"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : d.status === "resolved_released"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-ink/5 text-ink/50 border-ink/10"
                        }`}>
                          {d.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {d.status === "pending" ? (
                          <div className="flex justify-end gap-1.5">
                            <Button
                              onClick={() => handleResolveDispute(d._id, "refund")}
                              variant="ghost"
                              className="text-[10px] py-1 px-2.5 rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50 font-bold"
                            >
                              Refund Buyer
                            </Button>
                            <Button
                              onClick={() => handleResolveDispute(d._id, "release")}
                              variant="secondary"
                              className="text-[10px] py-1 px-2.5 rounded-full font-bold bg-emerald-600 hover:bg-emerald-700 border-none"
                            >
                              Release Payout
                            </Button>
                            <Button
                              onClick={() => handleResolveDispute(d._id, "dismiss")}
                              variant="ghost"
                              className="text-[10px] py-1 px-2.5 rounded-full border border-ink/10 text-ink/60 hover:bg-canvas font-bold"
                            >
                              Dismiss
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-ink/40 italic font-medium">
                            Resolved on {new Date(d.updatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {disputes.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-ink/40">No dispute claims raised on the platform.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 8: PROMOTIONAL ADS CONTROL */}
        {activeTab === "ads" && (
          <div className="panel p-6 bg-white space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink">Sponsored Listings & Advertisements</h2>
              <p className="text-xs text-ink/40">Promote items to sponsored/featured sections on the homepage.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50/50 to-white border border-orange-100 space-y-3">
                <Megaphone className="h-6 w-6 text-accent" />
                <h3 className="text-sm font-black text-orange-950 uppercase tracking-wide">Featured Advertisements</h3>
                <p className="text-xs text-orange-900/70 leading-relaxed">
                  Mark listings as featured to display them at the top of students' home feeds. Excellent for pg owners or merchants looking for higher impressions.
                </p>
                <div className="pt-2">
                  <Button onClick={() => setActiveTab("listings")} variant="secondary" className="text-xs py-1.5 px-4 rounded-full font-bold">
                    Manage Featured Items
                  </Button>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50/50 to-white border border-orange-100 space-y-3">
                <Award className="h-6 w-6 text-accent" />
                <h3 className="text-sm font-black text-orange-950 uppercase tracking-wide">Premium Merchant Program</h3>
                <p className="text-xs text-orange-900/70 leading-relaxed">
                  Set users' membership to premium status to waive standard listing limits. Change their status inside the Users Directory.
                </p>
                <div className="pt-2">
                  <Button onClick={() => setActiveTab("users")} variant="primary" className="text-xs py-1.5 px-4 rounded-full font-bold">
                    Manage User Memberships
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: ANALYTICS CHARTS (SVG BASED) */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* SVG Charts Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Daily Orders SVG Bar Chart */}
              <div className="panel p-5 bg-white space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-ink">Daily Orders (7 Days)</h3>
                <div className="h-48 w-full flex items-end justify-between px-4 pb-2 pt-6 border-b border-ink/5 relative">
                  {(stats.platformAnalytics?.dailyOrders || []).map((day, idx) => {
                    const maxVal = Math.max(...(stats.platformAnalytics?.dailyOrders || []).map(d => d.value), 1);
                    const percentage = (day.value / maxVal) * 100;
                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 group cursor-pointer relative" style={{ width: "10%" }}>
                        {/* Tooltip */}
                        <span className="absolute -top-6 bg-ink text-white font-mono text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {day.value} Orders
                        </span>
                        {/* Bar */}
                        <div 
                          className="w-full bg-indigo-500 rounded-t-md hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/10" 
                          style={{ height: `${Math.max(percentage, 5)}%`, minHeight: "6px" }}
                        />
                        <span className="text-[9px] font-bold text-ink/40 tracking-tighter truncate w-full text-center">
                          {day.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Daily Revenue Line/Area Chart */}
              <div className="panel p-5 bg-white space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-ink">Daily Revenue (7 Days)</h3>
                <div className="h-48 w-full flex items-end justify-between px-4 pb-2 pt-6 border-b border-ink/5 relative">
                  {(stats.platformAnalytics?.dailyRevenue || []).map((day, idx) => {
                    const maxVal = Math.max(...(stats.platformAnalytics?.dailyRevenue || []).map(d => d.value), 1);
                    const percentage = (day.value / maxVal) * 100;
                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 group cursor-pointer relative" style={{ width: "10%" }}>
                        {/* Tooltip */}
                        <span className="absolute -top-6 bg-ink text-white font-mono text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          Rs. {day.value}
                        </span>
                        {/* Bar styled like area */}
                        <div 
                          className="w-full bg-emerald-500 rounded-t-md hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/10 opacity-75 hover:opacity-100" 
                          style={{ height: `${Math.max(percentage, 5)}%`, minHeight: "6px" }}
                        />
                        <span className="text-[9px] font-bold text-ink/40 tracking-tighter truncate w-full text-center">
                          {day.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Popular Categories Horizontal Progress bars */}
              <div className="panel p-5 bg-white space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-ink">Popular categories</h3>
                <div className="space-y-3">
                  {(stats.platformAnalytics?.popularCategories || []).map((cat, idx) => {
                    const maxVal = Math.max(...(stats.platformAnalytics?.popularCategories || []).map(c => c.value), 1);
                    const percentage = (cat.value / maxVal) * 100;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-ink/75">
                          <span>{cat.label}</span>
                          <span>{cat.value} items</span>
                        </div>
                        <div className="h-2 w-full bg-canvas rounded-full overflow-hidden border border-ink/5">
                          <div className="h-full bg-gradient-to-r from-accent to-indigo-500 rounded-full" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Colleges Horizontal Progress bars */}
              <div className="panel p-5 bg-white space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-ink">Active Campus Networks</h3>
                <div className="space-y-3">
                  {(stats.platformAnalytics?.topColleges || []).map((col, idx) => {
                    const maxVal = Math.max(...(stats.platformAnalytics?.topColleges || []).map(c => c.count), 1);
                    const percentage = (col.count / maxVal) * 100;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-ink/75">
                          <span>{col.name}</span>
                          <span>{col.count} Listings</span>
                        </div>
                        <div className="h-2 w-full bg-canvas rounded-full overflow-hidden border border-ink/5">
                          <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: COLLEGE MANAGEMENT (CRUD) */}
        {activeTab === "colleges" && (
          <div className="space-y-6">
            {/* Register College Form */}
            <div className="panel p-6 bg-white space-y-4">
              <div>
                <h2 className="text-base font-black text-ink uppercase tracking-wide">Register New Campus Network</h2>
                <p className="text-xs text-ink/40">Add institutional networks so students can map items and deliveries to their college.</p>
              </div>

              <form onSubmit={handleAddCollege} className="grid gap-3 sm:grid-cols-4 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink/50">College name</label>
                  <input
                    className="input py-2 px-3 text-xs"
                    placeholder="e.g. St. Xavier College"
                    value={newCollege.name}
                    onChange={(e) => setNewCollege({ ...newCollege, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink/50">City</label>
                  <input
                    className="input py-2 px-3 text-xs"
                    placeholder="e.g. Ahmedabad"
                    value={newCollege.city}
                    onChange={(e) => setNewCollege({ ...newCollege, city: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink/50">State</label>
                  <input
                    className="input py-2 px-3 text-xs"
                    placeholder="e.g. Gujarat"
                    value={newCollege.state}
                    onChange={(e) => setNewCollege({ ...newCollege, state: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" variant="secondary" className="text-xs font-bold py-2 w-full uppercase">
                  Register Campus
                </Button>
              </form>
            </div>

            {/* List Registered Colleges */}
            <div className="panel p-6 bg-white space-y-4">
              <h3 className="text-sm font-black uppercase text-ink">Active College Registries ({colleges.length})</h3>
              {loadingColleges ? (
                <p className="text-xs text-ink/40">Loading list...</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {colleges.map((c) => (
                    <div key={c._id} className="p-3 border border-ink/5 rounded-2xl bg-canvas/30 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-xs text-ink">{c.name}</p>
                        <p className="text-[10px] text-ink/40 mt-0.5">{c.city}, {c.state}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteCollege(c._id)}
                        className="p-1 text-red-500 rounded hover:bg-red-50"
                        title="Remove College Registry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {colleges.length === 0 && (
                    <p className="text-xs text-ink/40 col-span-3 text-center">No college networks registered yet.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: COUPON MANAGEMENT */}
        {activeTab === "coupons" && (
          <div className="space-y-6">
            {/* Create Coupon Form */}
            <div className="panel p-6 bg-white space-y-4">
              <div>
                <h2 className="text-base font-black text-ink uppercase tracking-wide">Create New Coupon</h2>
                <p className="text-xs text-ink/40">Add promotional discount coupons for checkout payments.</p>
              </div>

              <form onSubmit={handleCreateCoupon} className="grid gap-3 sm:grid-cols-5 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink/50">Coupon Code</label>
                  <input
                    className="input py-2 px-3 text-xs uppercase"
                    placeholder="e.g. SAVE20"
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink/50">Discount Type</label>
                  <select
                    className="w-full bg-white border border-ink/10 rounded-xl px-3 py-2 text-xs text-ink/75 font-bold outline-none"
                    value={newCoupon.discountType}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value })}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat (Rs.)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink/50">Discount Value</label>
                  <input
                    type="number"
                    min="0"
                    className="input py-2 px-3 text-xs"
                    placeholder="e.g. 20"
                    value={newCoupon.value}
                    onChange={(e) => setNewCoupon({ ...newCoupon, value: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink/50">Expiry Date</label>
                  <input
                    type="date"
                    className="input py-2 px-3 text-xs"
                    value={newCoupon.expiryDate}
                    onChange={(e) => setNewCoupon({ ...newCoupon, expiryDate: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" variant="secondary" className="text-xs font-bold py-2 w-full uppercase">
                  Create Coupon
                </Button>
              </form>
            </div>

            {/* List Coupons */}
            <div className="panel p-6 bg-white space-y-4">
              <h3 className="text-sm font-black uppercase text-ink">Active Promotional Coupons ({coupons.length})</h3>
              {loadingCoupons ? (
                <p className="text-xs text-ink/40">Loading list...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-ink/5 text-ink/40 uppercase">
                        <th className="py-2">Coupon Code</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Value</th>
                        <th className="py-2">Expiry Date</th>
                        <th className="py-2">Status</th>
                        <th className="py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5">
                      {coupons.map((c) => {
                        const isExpired = new Date(c.expiryDate) < new Date();
                        return (
                          <tr key={c._id} className={isExpired ? "bg-red-50/10" : ""}>
                            <td className="py-3 font-mono font-bold text-sm text-ink">{c.code}</td>
                            <td className="py-3 capitalize text-ink/75">{c.discountType}</td>
                            <td className="py-3 font-black text-ink">
                              {c.discountType === "percentage" ? `${c.value}%` : `Rs. ${c.value}`}
                            </td>
                            <td className="py-3">
                              <span className={isExpired ? "text-red-500 font-bold" : "text-ink/65"}>
                                {new Date(c.expiryDate).toLocaleDateString()}
                              </span>
                              {isExpired && <span className="text-[9px] text-red-500 font-bold ml-2">(Expired)</span>}
                            </td>
                            <td className="py-3">
                              {c.isActive ? (
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-bold">Active</span>
                              ) : (
                                <span className="text-ink/40 bg-ink/5 px-2 py-0.5 rounded-full border border-ink/10 font-bold">Inactive</span>
                              )}
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  onClick={() => handleToggleCoupon(c._id)}
                                  variant="ghost"
                                  className="text-[10px] py-1 px-2.5 rounded-full border border-ink/10 text-ink/60 hover:bg-canvas font-bold"
                                >
                                  {c.isActive ? "Deactivate" : "Activate"}
                                </Button>
                                <button
                                  onClick={() => handleDeleteCoupon(c._id)}
                                  className="p-1.5 border border-red-100 text-red-500 rounded-lg hover:bg-red-50"
                                  title="Delete Coupon"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {coupons.length === 0 && (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-ink/40">No coupons registered yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 11: SYSTEM SETTINGS */}
        {activeTab === "settings" && (
          <div className="panel p-6 bg-white space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink">System settings</h2>
              <p className="text-xs text-ink/40">Configure default platform commission splits and deposit thresholds.</p>
            </div>

            {loadingSettings ? (
              <p className="text-xs text-ink/40">Retrieving system configurations...</p>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-6 max-w-md">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-ink/75 block">Platform Commission Fee (%)</label>
                    <p className="text-[10px] text-ink/45">The fee percentage split automatically deducted from payments. Remainder is released to the seller wallet.</p>
                    <input
                      type="number"
                      className="input"
                      min="0"
                      max="100"
                      value={systemSettings.commission_rate}
                      onChange={(e) => setSystemSettings({ ...systemSettings, commission_rate: Number(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-ink/75 block">Minimum Deposit Threshold (Rs.)</label>
                    <p className="text-[10px] text-ink/45">Minimum deposit wallet value requested for student card/UPI payments.</p>
                    <input
                      type="number"
                      className="input"
                      min="0"
                      value={systemSettings.min_deposit}
                      onChange={(e) => setSystemSettings({ ...systemSettings, min_deposit: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" variant="secondary" className="px-6 py-2 text-xs uppercase font-bold" disabled={savingSettings}>
                    {savingSettings ? "Updating system..." : "Save Config Settings"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 12: USER SETTINGS */}
        {activeTab === "user-settings" && (
          <UserSettingsView onRefresh={onRefresh} />
        )}

      </div>

      {/* USER DETAIL SIDE DRAWER / MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex justify-end z-50 animate-fadeIn">
          <div className="w-full max-w-md bg-white h-full p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-slideInRight">
            <div>
              <div className="flex justify-between items-center border-b border-ink/5 pb-4 mb-4">
                <h3 className="text-base font-black text-ink uppercase tracking-wider">User details profile</h3>
                <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-canvas rounded-full">
                  <X className="h-5 w-5 text-ink/65" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {selectedUser.avatarUrl ? (
                    <img src={selectedUser.avatarUrl} alt="Avatar" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-accent text-white flex items-center justify-center font-black text-lg">
                      {selectedUser.name[0]}
                    </div>
                  )}
                  <div>
                    <h4 className="font-black text-lg text-ink">{selectedUser.name}</h4>
                    <p className="text-xs text-ink/50">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-canvas/30 space-y-2 border border-ink/5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-ink/45 font-semibold">User Role:</span>
                    <span className="font-bold text-ink uppercase">{selectedUser.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/45 font-semibold">Campus Name:</span>
                    <span className="font-bold text-ink">{selectedUser.collegeName || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/45 font-semibold">Campus ID:</span>
                    <span className="font-bold text-ink font-mono">{selectedUser.collegeId || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/45 font-semibold">Wallet Balance:</span>
                    <span className="font-black text-emerald-700">Rs. {selectedUser.balance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/45 font-semibold">Verification status:</span>
                    <span className="font-bold text-ink">{selectedUser.verifiedCollegeId ? "Verified" : "Pending"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/45 font-semibold">Average Rating:</span>
                    <span className="font-bold text-ink">★ {selectedUser.ratingsAverage || 0} ({selectedUser.ratingsCount || 0} reviews)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-6 border-t border-ink/5">
              <Button
                onClick={() => {
                  handleResetPassword(selectedUser._id);
                }}
                variant="ghost"
                className="w-full text-xs font-bold py-2 hover:bg-canvas rounded-full border border-ink/10 text-ink"
              >
                Reset Account Password
              </Button>

              {selectedUser.isSuspended ? (
                <Button
                  onClick={() => handleUserStatus(selectedUser._id, { isSuspended: false })}
                  variant="primary"
                  className="w-full text-xs font-bold py-2 bg-emerald-600 hover:bg-emerald-700 border-none rounded-full"
                >
                  Unsuspend Account
                </Button>
              ) : (
                <Button
                  onClick={() => handleUserStatus(selectedUser._id, { isSuspended: true })}
                  variant="secondary"
                  className="w-full text-xs font-bold py-2 bg-red-600 hover:bg-red-700 border-none rounded-full"
                >
                  Suspend Account
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ORDER DETAILS & LOGISTICS OVERRIDE MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6 animate-zoomIn">
            <button onClick={() => setSelectedOrder(null)} className="absolute top-4 right-4 p-1 hover:bg-canvas rounded-full">
              <X className="h-5 w-5 text-ink/65" />
            </button>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-accent">Order logistics control</p>
              <h3 className="text-lg font-black text-ink mt-1">Order details: {selectedOrder._id}</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-ink/45 font-bold">Renter/Buyer Profile:</span>
                <p className="font-bold text-ink">{selectedOrder.renter?.name}</p>
                <p className="text-[10px] text-ink/50">{selectedOrder.renter?.email}</p>
              </div>
              <div className="space-y-1">
                <span className="text-ink/45 font-bold">Seller/Owner Profile:</span>
                <p className="font-bold text-ink">{selectedOrder.owner?.name}</p>
                <p className="text-[10px] text-ink/50">{selectedOrder.owner?.email}</p>
              </div>
              <div className="space-y-1">
                <span className="text-ink/45 font-bold">Item Title:</span>
                <p className="font-bold text-ink">{selectedOrder.item?.title || "Deleted Item"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-ink/45 font-bold">Order Value & Method:</span>
                <p className="font-bold text-ink">Rs. {selectedOrder.totalPrice} ({selectedOrder.paymentMethod.toUpperCase()})</p>
              </div>
            </div>

            {/* Delivery Timeline / Tracking History */}
            <div className="space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-ink/55 block">Delivery Timeline Tracking</span>
              <div className="space-y-3 pl-2 border-l border-ink/10">
                {(selectedOrder.trackingHistory || []).map((history, idx) => (
                  <div key={idx} className="relative flex items-start gap-3">
                    {/* circle indicator */}
                    <div className="absolute -left-[12.5px] top-1.5 h-2 w-2 rounded-full bg-accent border-2 border-white" />
                    <div>
                      <p className="text-[11px] font-black text-ink">{history.status}</p>
                      <p className="text-[10px] text-ink/45">{history.location}</p>
                      <span className="text-[9px] text-ink/40">{new Date(history.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Override Controller */}
            <div className="bg-canvas/50 border border-ink/5 rounded-2xl p-4 space-y-4">
              <span className="text-xs font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-accent" /> Logistics Override Control
              </span>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink/55">Status override</label>
                  <select
                    className="w-full bg-white border border-ink/10 rounded-xl px-3 py-2 text-xs text-ink/75 font-bold outline-none"
                    value={selectedOrder.status}
                    onChange={(e) => handleOrderOverride(selectedOrder._id, { status: e.target.value })}
                  >
                    {orderStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-ink/55">POC Courier Assignment</label>
                  <select
                    className="w-full bg-white border border-ink/10 rounded-xl px-3 py-2 text-xs text-ink/75 font-bold outline-none"
                    value={selectedOrder.poc?._id || ""}
                    onChange={(e) => handleOrderOverride(selectedOrder._id, { pocId: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {pocUsers.map(poc => (
                      <option key={poc._id} value={poc._id}>{poc.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboardView;
