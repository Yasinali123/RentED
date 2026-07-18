import { useState } from "react";
import { Link } from "react-router-dom";
import { DollarSign, Tag, ShoppingCart, Activity, Plus, Edit3, Trash2, CheckCircle2, XCircle, QrCode, FileText, RefreshCw } from "lucide-react";

import ItemForm from "../items/ItemForm";
import Button from "../ui/Button";
import { itemApi, rentalApi, disputeApi, paymentApi, invoiceApi, getErrorMessage } from "../../api/client";
import UserSettingsView from "./UserSettingsView";

function SellerDashboardView({ dashboard, onRefresh }) {
  const { stats, listedItems, incomingRequests } = dashboard;
  const [activeTab, setActiveTab] = useState("orders"); // "orders", "inventory", "new-listing"
  const [editingItem, setEditingItem] = useState(null);
  const [showQrCodeForOrder, setShowQrCodeForOrder] = useState(null);

  // Invoice state
  const [salesInvoices, setSalesInvoices] = useState([]);
  const [salesInvoicesLoading, setSalesInvoicesLoading] = useState(false);

  const fetchSalesInvoices = async () => {
    setSalesInvoicesLoading(true);
    try {
      const data = await invoiceApi.getSalesInvoices();
      setSalesInvoices(data);
    } catch (err) {
      console.error("Failed to fetch sales invoices:", err);
    } finally {
      setSalesInvoicesLoading(false);
    }
  };

  // Dispute state variables
  const [disputeOrderId, setDisputeOrderId] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Withdrawal state variables
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalMethod, setWithdrawalMethod] = useState("upi"); // "upi" or "bank"
  const [upiId, setUpiId] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [withdrawFeedback, setWithdrawFeedback] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    setWithdrawFeedback("");

    const amount = Number(withdrawalAmount);
    if (!amount || amount <= 0) {
      setWithdrawFeedback("Please enter a valid amount to withdraw.");
      return;
    }

    if (amount > (stats.balance || 0)) {
      setWithdrawFeedback("Insufficient balance available for withdrawal.");
      return;
    }

    if (amount < 100) {
      setWithdrawFeedback("Minimum withdrawal amount is Rs. 100.");
      return;
    }

    let paymentDetails = "";
    if (withdrawalMethod === "upi") {
      if (!upiId.trim()) {
        setWithdrawFeedback("Please enter your UPI ID.");
        return;
      }
      paymentDetails = `UPI ID: ${upiId.trim()}`;
    } else {
      if (!bankAccount.trim() || !bankName.trim() || !ifscCode.trim()) {
        setWithdrawFeedback("Please fill out all bank account fields.");
        return;
      }
      paymentDetails = `Bank: ${bankName.trim()} • A/C: ${bankAccount.trim()} • IFSC: ${ifscCode.trim()}`;
    }

    setWithdrawLoading(true);
    try {
      await paymentApi.withdraw({
        amount,
        paymentMethod: withdrawalMethod,
        paymentDetails,
      });
      alert("Withdrawal request submitted successfully!");
      setWithdrawalAmount("");
      setUpiId("");
      setBankAccount("");
      setBankName("");
      setIfscCode("");
      onRefresh();
    } catch (err) {
      setWithdrawFeedback(getErrorMessage(err));
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleCreate = async (payload, config = {}) => {
    try {
      await itemApi.create(payload, config);
      alert("New listing published successfully!");
      setActiveTab("inventory");
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleEdit = async (payload, config = {}) => {
    try {
      await itemApi.update(editingItem._id, payload, config);
      alert("Listing updated successfully!");
      setEditingItem(null);
      setActiveTab("inventory");
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this listing? This action is permanent.")) return;
    try {
      await itemApi.delete(itemId);
      alert("Listing deleted successfully.");
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleAccept = async (orderId) => {
    try {
      await rentalApi.accept(orderId);
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleReject = async (orderId) => {
    if (!window.confirm("Are you sure you want to reject this order?")) return;
    try {
      await rentalApi.reject(orderId);
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleCompleteReturn = async (orderId) => {
    if (!window.confirm("Confirm completion of this return? This will close the rental order.")) return;
    try {
      await rentalApi.completeReturn(orderId);
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleRepostItem = async (itemId) => {
    try {
      await itemApi.update(itemId, { availabilityStatus: "available" });
      alert("Item reposted successfully! It is now active and visible in the marketplace.");
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleHandoverSignal = async (orderId) => {
    setShowQrCodeForOrder(showQrCodeForOrder === orderId ? null : orderId);
    if (showQrCodeForOrder !== orderId) {
      try {
        await rentalApi.handoverSignal(orderId);
      } catch (err) {
        console.error("Failed to notify POC:", err.message);
      }
    }
  };

  const handleRaiseDisputeSubmit = async (e) => {
    e.preventDefault();
    if (!disputeReason.trim()) return;
    setIsSubmitting(true);
    try {
      await disputeApi.raise({ orderId: disputeOrderId, reason: disputeReason });
      alert("Dispute raised successfully! Escrow funds locked.");
      setDisputeOrderId("");
      setDisputeReason("");
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Analytics Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="panel p-5 bg-gradient-to-br from-emerald-50/55 to-white border-emerald-100/60">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">Total Revenue</p>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-800 mt-2">Rs. {stats.totalRevenue}</p>
        </div>

        <div className="panel p-5 bg-gradient-to-br from-indigo-50/55 to-white border-indigo-100/60">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">Monthly Revenue</p>
            <DollarSign className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-800 mt-2">Rs. {stats.monthlyRevenue}</p>
        </div>

        <div className="panel p-5 bg-gradient-to-br from-orange-50/55 to-white border-orange-100/60">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">Active Rentals</p>
            <ShoppingCart className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-2xl font-black text-orange-800 mt-2">{stats.activeRentals}</p>
        </div>

        <div className="panel p-5 bg-gradient-to-br from-purple-50/55 to-white border-purple-100/60">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">Products Listed</p>
            <Tag className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-800 mt-2">{stats.totalProducts}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ink/5 gap-6">
        <button
          onClick={() => {
            setActiveTab("orders");
            setEditingItem(null);
          }}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "orders" ? "border-accent text-accent" : "border-transparent text-ink/55 hover:text-ink"
          }`}
        >
          Incoming Orders & Requests ({incomingRequests.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("inventory");
            setEditingItem(null);
          }}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "inventory" ? "border-accent text-accent" : "border-transparent text-ink/55 hover:text-ink"
          }`}
        >
          Manage Inventory ({listedItems.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("new-listing");
            setEditingItem(null);
          }}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "new-listing" ? "border-accent text-accent" : "border-transparent text-ink/55 hover:text-ink"
          }`}
        >
          {editingItem ? "Edit Listing" : "Add New Listing"}
        </button>
        <button
          onClick={() => {
            setActiveTab("wallet");
            setEditingItem(null);
          }}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "wallet" ? "border-accent text-accent" : "border-transparent text-ink/55 hover:text-ink"
          }`}
        >
          💳 Wallet & Payouts
        </button>
        <button
          onClick={() => {
            setActiveTab("settings");
            setEditingItem(null);
          }}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "settings" ? "border-accent text-accent" : "border-transparent text-ink/55 hover:text-ink"
          }`}
        >
          ⚙️ Settings
        </button>
        <button
          onClick={() => {
            setActiveTab("invoices");
            setEditingItem(null);
            fetchSalesInvoices();
          }}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "invoices" ? "border-accent text-accent" : "border-transparent text-ink/55 hover:text-ink"
          }`}
        >
          🧾 Sales Invoices
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {incomingRequests.length === 0 ? (
            <div className="panel p-10 text-center text-ink/50">
              <ShoppingCart className="h-12 w-12 mx-auto text-ink/20 mb-3" />
              <p className="font-bold">No orders or bookings yet</p>
              <p className="text-xs text-ink/40 mt-1">Make sure you have active listings and your prices are competitive.</p>
            </div>
          ) : (
            incomingRequests.map((request) => (
              <div key={request._id} className="panel p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-ink/5 bg-white">
                <div className="flex items-start gap-4">
                  <img
                    src={request.item?.image || "https://placehold.co/150x150?text=Item"}
                    alt={request.item?.title}
                    className="h-14 w-14 rounded-xl object-cover shrink-0 border bg-mist"
                  />
                  <div>
                    <h4 className="font-bold text-base text-ink">{request.item?.title}</h4>
                    <p className="text-xs text-ink/65 mt-0.5">
                      Renter: <b>{request.renter?.name}</b> • School: {request.renter?.collegeName || request.item?.collegeName}
                    </p>
                    <p className="text-xs text-ink/50 mt-1">
                      Type: <span className="capitalize font-semibold text-accent">{request.requestType}</span> • Status: <span className="font-semibold text-indigo-600">{request.status}</span>
                    </p>
                    {["POC Assigned", "Pickup Scheduled"].includes(request.status) && (
                      <div className="mt-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl inline-flex items-center gap-1.5 animate-pulse">
                        🔑 Handover OTP for POC: <span className="font-mono text-sm tracking-wider font-black">{request.pickupQrCode}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto justify-end">
                  <div className="text-left md:text-right pr-4">
                    <p className="text-xs text-ink/40 uppercase">Payout Share</p>
                    <p className="text-lg font-black text-ink">Rs. {request.totalPrice - (request.totalPrice * 0.1)}</p>
                  </div>

                  {/* Accept / Reject actions */}
                  {request.status === "Payment Successful" && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleReject(request._id)}
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 py-1.5 px-3 rounded-full text-xs font-bold"
                      >
                        Reject
                      </Button>
                      <Button
                        onClick={() => handleAccept(request._id)}
                        variant="primary"
                        className="py-1.5 px-4 rounded-full text-xs font-bold"
                      >
                        Accept Order
                      </Button>
                    </div>
                  )}

                  {/* QR Handover Code display */}
                  {["Seller Accepted", "POC Assigned", "Pickup Scheduled"].includes(request.status) && (
                    <Button
                      onClick={() => handleHandoverSignal(request._id)}
                      variant="secondary"
                      className="flex items-center gap-1 py-1.5 px-4 rounded-full text-xs font-bold"
                    >
                      <QrCode className="h-4 w-4" />
                      Handover to POC
                    </Button>
                  )}

                  {!request.disputed && ["Payment Successful", "Seller Accepted", "POC Assigned", "Pickup Scheduled", "Picked Up", "Out For Delivery", "Delivered", "Rental Active", "Return Requested", "Returned"].includes(request.status) && (
                    <Button
                      onClick={() => setDisputeOrderId(request._id)}
                      variant="ghost"
                      className="text-red-500 hover:bg-red-50 text-[10px] py-1.5 px-3 border border-red-100 rounded-full font-bold"
                    >
                      Raise Dispute
                    </Button>
                  )}

                  {request.disputed && (
                    <span className="text-[10px] font-black tracking-wider uppercase text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full animate-pulse">
                      ⚠️ Escrow Disputed: Under mediation
                    </span>
                  )}

                  {/* Seller inspects return */}
                  {request.status === "Returned" && (
                    <Button
                      onClick={() => handleCompleteReturn(request._id)}
                      variant="primary"
                      className="py-1.5 px-4 rounded-full text-xs font-bold"
                    >
                      Complete Return
                    </Button>
                  )}

                  {/* Repost Cancelled Item */}
                  {request.status === "Cancelled" && request.item && (
                    <Button
                      onClick={() => handleRepostItem(request.item._id)}
                      variant="secondary"
                      className="py-1.5 px-4 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                    >
                      Repost Item
                    </Button>
                  )}
                </div>

                {/* Handover QR Modal drawer */}
                {showQrCodeForOrder === request._id && (
                  <div className="w-full border-t border-ink/5 pt-4 mt-2">
                    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-amber-900">Provide OTP to Campus Courier</p>
                        <p className="text-xs text-amber-800/80 mt-1">Once the Point of Contact arrives, show them this OTP code to complete the verification handover.</p>
                      </div>
                      <div className="bg-white border border-amber-200 py-2 px-6 rounded-2xl text-center">
                        <p className="text-[10px] uppercase tracking-wider text-ink/40">Handover OTP</p>
                        <p className="text-xl font-black text-amber-800 mt-0.5 tracking-widest">{request.pickupQrCode}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "inventory" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-ink">Active Campus Listings ({listedItems.length})</h3>
            <Button onClick={() => setActiveTab("new-listing")} variant="secondary" className="text-xs py-1.5 px-3 rounded-full flex items-center gap-1">
              <Plus className="h-4 w-4" /> New Listing
            </Button>
          </div>

          {listedItems.length === 0 ? (
            <div className="panel p-10 text-center text-ink/50">
              <Tag className="h-12 w-12 mx-auto text-ink/20 mb-3" />
              <p className="font-bold">No products listed yet</p>
              <p className="text-xs text-ink/40 mt-1">Click the "New Listing" button to post your books, kits, and spaces.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {listedItems.map((item) => (
                <div key={item._id} className="panel p-5 flex flex-col justify-between space-y-4 bg-white border border-ink/5">
                  <div className="space-y-3">
                    <img
                      src={item.image || "https://placehold.co/320x240?text=Listing"}
                      alt={item.title}
                      className="h-36 w-full object-cover rounded-xl bg-mist"
                    />
                    <div>
                      <span className="chip text-[10px] py-0.5 px-2">{item.category}</span>
                      <h4 className="font-bold text-base mt-2 truncate">{item.title}</h4>
                      <p className="text-xs text-ink/50 truncate mt-0.5">{item.location}, {item.campus}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-ink/5 pt-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-ink/40">Status</p>
                      <span className={`text-xs font-bold capitalize ${item.availabilityStatus === "available" ? "text-emerald-600" : "text-amber-600"}`}>
                        {item.availabilityStatus}
                      </span>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setActiveTab("new-listing");
                        }}
                        className="p-2 border border-ink/10 rounded-full hover:bg-ink/5 text-ink/60"
                        title="Edit Item"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-2 border border-ink/10 rounded-full hover:bg-red-50 text-red-500"
                        title="Delete Item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "new-listing" && (
        <ItemForm
          onSubmit={editingItem ? handleEdit : handleCreate}
          itemToEdit={editingItem}
          onCancel={() => {
            setEditingItem(null);
            setActiveTab("inventory");
          }}
        />
      )}

      {activeTab === "settings" && (
        <UserSettingsView onRefresh={onRefresh} />
      )}

      {activeTab === "wallet" && (
        <div className="space-y-6">
          {/* Financial Overview Grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="panel p-5 bg-gradient-to-br from-indigo-50/50 to-white border-indigo-100">
              <span className="text-xs font-black uppercase text-indigo-700 tracking-wider">Available Balance</span>
              <p className="text-3xl font-black text-indigo-950 mt-1">Rs. {stats.balance || 0}</p>
              <p className="text-[10px] text-indigo-600/70 mt-1">Funds available to instantly request for manual withdrawal.</p>
            </div>
            
            <div className="panel p-5 bg-gradient-to-br from-amber-50/50 to-white border-amber-100">
              <span className="text-xs font-black uppercase text-amber-700 tracking-wider">Escrow Held</span>
              <p className="text-3xl font-black text-amber-950 mt-1">Rs. {stats.pendingEscrow || 0}</p>
              <p className="text-[10px] text-amber-600/70 mt-1">Payments held in platform escrow until renters confirm delivery.</p>
            </div>

            <div className="panel p-5 bg-gradient-to-br from-emerald-50/50 to-white border-emerald-100">
              <span className="text-xs font-black uppercase text-emerald-700 tracking-wider">Released to Wallet</span>
              <p className="text-3xl font-black text-emerald-950 mt-1">Rs. {stats.releasedPayments || 0}</p>
              <p className="text-[10px] text-emerald-600/70 mt-1">Life-time revenue successfully released from escrow (after platform commission of Rs. {stats.commissionWithheld || 0}).</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-5">
            {/* Request Payout Form */}
            <div className="panel p-6 md:col-span-2 space-y-4 bg-white border border-ink/5">
              <h3 className="text-lg font-bold text-ink">Request Withdrawal</h3>
              <p className="text-xs text-ink/60">Submit a payout request to withdraw funds from your RentED wallet to UPI/Bank account.</p>

              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                <div>
                  <label className="label text-xs block mb-1">Amount to Withdraw (Rs.)</label>
                  <input
                    type="number"
                    min="100"
                    placeholder="e.g. 500"
                    className="input w-full"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    disabled={withdrawLoading}
                  />
                </div>

                <div>
                  <label className="label text-xs block mb-1.5 font-bold">Payout Method</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="method"
                        checked={withdrawalMethod === "upi"}
                        onChange={() => setWithdrawalMethod("upi")}
                        disabled={withdrawLoading}
                      />
                      UPI Transfer
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="method"
                        checked={withdrawalMethod === "bank"}
                        onChange={() => setWithdrawalMethod("bank")}
                        disabled={withdrawLoading}
                      />
                      Bank Account
                    </label>
                  </div>
                </div>

                {withdrawalMethod === "upi" ? (
                  <div>
                    <label className="label text-xs block mb-1">UPI ID</label>
                    <input
                      type="text"
                      placeholder="e.g. name@upi"
                      className="input w-full"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      disabled={withdrawLoading}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="label text-xs block mb-1">Bank Name</label>
                      <input
                        type="text"
                        placeholder="e.g. State Bank of India"
                        className="input w-full"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        disabled={withdrawLoading}
                      />
                    </div>
                    <div>
                      <label className="label text-xs block mb-1">Account Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 1234567890"
                        className="input w-full"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        disabled={withdrawLoading}
                      />
                    </div>
                    <div>
                      <label className="label text-xs block mb-1">IFSC Code</label>
                      <input
                        type="text"
                        placeholder="e.g. SBIN0001234"
                        className="input w-full uppercase"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                        disabled={withdrawLoading}
                      />
                    </div>
                  </div>
                )}

                {withdrawFeedback && (
                  <p className="text-xs font-bold text-red-500 bg-red-50 border border-red-200 p-2.5 rounded-xl">{withdrawFeedback}</p>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-xs font-bold py-2.5"
                  disabled={withdrawLoading || !stats.balance || stats.balance < 100}
                >
                  {withdrawLoading ? "Submitting..." : "Submit Payout Request"}
                </Button>
              </form>
            </div>

            {/* Wallet History Lists */}
            <div className="md:col-span-3 space-y-6">
              {/* Withdrawal Payout Status list */}
              <div className="panel p-5 space-y-3 bg-white border border-ink/5">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Withdrawal History</h4>
                {(!dashboard.withdrawals || dashboard.withdrawals.length === 0) ? (
                  <p className="text-xs text-ink/40 py-4 text-center">No withdrawal request history yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-ink/10 text-ink/50 font-bold">
                          <th className="py-2">Date</th>
                          <th className="py-2">Amount</th>
                          <th className="py-2">Details</th>
                          <th className="py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.withdrawals.map((w) => (
                          <tr key={w._id} className="border-b border-ink/5 hover:bg-mist/30">
                            <td className="py-2.5 text-ink/60">{new Date(w.createdAt).toLocaleDateString()}</td>
                            <td className="py-2.5 font-bold">Rs. {w.amount}</td>
                            <td className="py-2.5 text-[10px] text-ink/50 max-w-[150px] truncate" title={w.paymentDetails}>
                              {w.paymentMethod.toUpperCase()} ({w.paymentDetails})
                            </td>
                            <td className="py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                w.status === "approved" ? "bg-emerald-50 text-emerald-700" :
                                w.status === "rejected" ? "bg-red-50 text-red-700" :
                                "bg-amber-50 text-amber-700 animate-pulse"
                              }`}>
                                {w.status}
                              </span>
                              {w.adminNotes && (
                                <p className="text-[9px] text-red-500/80 font-medium mt-0.5 leading-snug">Note: {w.adminNotes}</p>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Transactions list */}
              <div className="panel p-5 space-y-3 bg-white border border-ink/5">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Transaction Ledger</h4>
                {(!dashboard.transactions || dashboard.transactions.length === 0) ? (
                  <p className="text-xs text-ink/40 py-4 text-center">No transactions recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-ink/10 text-ink/50 font-bold">
                          <th className="py-2">Date</th>
                          <th className="py-2">Type</th>
                          <th className="py-2">Amount</th>
                          <th className="py-2">Escrow Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.transactions.map((tx) => (
                          <tr key={tx._id} className="border-b border-ink/5 hover:bg-mist/30">
                            <td className="py-2.5 text-ink/60">{new Date(tx.createdAt).toLocaleDateString()}</td>
                            <td className="py-2.5 capitalize font-semibold">
                              {tx.type.replace(/_/g, " ")}
                              {tx.paymentId && <p className="text-[9px] font-mono text-ink/40">{tx.paymentId}</p>}
                            </td>
                            <td className={`py-2.5 font-black ${
                              ["release_to_seller", "refund"].includes(tx.type) ? "text-emerald-700" : "text-ink/80"
                            }`}>
                              Rs. {tx.amount}
                            </td>
                            <td className="py-2.5">
                              {tx.escrowStatus ? (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  tx.escrowStatus === "released" ? "bg-emerald-50 text-emerald-700" :
                                  tx.escrowStatus === "refunded" ? "bg-red-50 text-red-700" :
                                  "bg-amber-50 text-amber-700"
                                }`}>
                                  {tx.escrowStatus}
                                </span>
                              ) : (
                                <span className="text-[10px] text-ink/40">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              Sales Invoices
            </h2>
            <button onClick={fetchSalesInvoices} className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          {salesInvoicesLoading ? (
            <div className="panel p-10 text-center text-ink/50">
              <p className="font-bold">Loading invoices...</p>
            </div>
          ) : salesInvoices.length === 0 ? (
            <div className="panel p-10 text-center text-ink/50">
              <FileText className="h-12 w-12 mx-auto text-ink/20 mb-3" />
              <p className="font-bold">No sales invoices yet</p>
              <p className="text-xs text-ink/40 mt-1">Invoices are generated when buyers place orders for your listings.</p>
            </div>
          ) : (
            <div className="panel overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/5">
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-wider text-ink/40">Invoice #</th>
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-wider text-ink/40">Item</th>
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-wider text-ink/40">Buyer</th>
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-wider text-ink/40">Type</th>
                    <th className="text-right p-3 text-[10px] font-black uppercase tracking-wider text-ink/40">Amount</th>
                    <th className="text-right p-3 text-[10px] font-black uppercase tracking-wider text-ink/40">Commission</th>
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-wider text-ink/40">Date</th>
                    <th className="text-right p-3 text-[10px] font-black uppercase tracking-wider text-ink/40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salesInvoices.map((inv) => (
                    <tr key={inv._id} className="border-b border-ink/5 hover:bg-canvas/50 transition-colors">
                      <td className="p-3 font-mono text-xs font-bold text-accent">{inv.invoiceNumber}</td>
                      <td className="p-3 font-semibold">{inv.item?.title || "—"}</td>
                      <td className="p-3 text-xs">{inv.buyer?.name || "—"}</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          inv.invoiceType === "rental" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {inv.invoiceType}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold">Rs. {inv.totalAmount}</td>
                      <td className="p-3 text-right text-xs text-ink/60">Rs. {inv.platformCommission}</td>
                      <td className="p-3 text-xs text-ink/60">{new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="p-3 text-right">
                        {inv.pdfUrl && (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-full hover:bg-indigo-50 transition-colors"
                          >
                            📄 Download
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DISPUTE MODAL */}
      {disputeOrderId && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative space-y-4 animate-zoomIn">
            <button onClick={() => setDisputeOrderId("")} className="absolute top-4 right-4 p-1 hover:bg-canvas rounded-full">
              <span className="text-xs font-bold text-ink/40 hover:text-ink">Close</span>
            </button>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Raise Transaction Dispute</p>
              <h3 className="text-base font-black text-ink mt-1">Order Dispute Statement</h3>
            </div>

            <form onSubmit={handleRaiseDisputeSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/75 block">Reason details</label>
                <textarea
                  className="input text-xs min-h-24"
                  placeholder="Provide details on the issue (e.g. Buyer claims item not received, damaged during rental period, return not sent)..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" variant="secondary" className="w-full text-xs py-2 uppercase bg-red-600 hover:bg-red-700 border-none font-bold" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting dispute..." : "Confirm Dispute"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SellerDashboardView;
