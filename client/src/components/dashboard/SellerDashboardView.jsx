import { useState } from "react";
import { Link } from "react-router-dom";
import { DollarSign, Tag, ShoppingCart, Activity, Plus, Edit3, Trash2, CheckCircle2, XCircle, QrCode } from "lucide-react";

import ItemForm from "../items/ItemForm";
import Button from "../ui/Button";
import { itemApi, rentalApi, disputeApi, getErrorMessage } from "../../api/client";
import UserSettingsView from "./UserSettingsView";

function SellerDashboardView({ dashboard, onRefresh }) {
  const { stats, listedItems, incomingRequests } = dashboard;
  const [activeTab, setActiveTab] = useState("orders"); // "orders", "inventory", "new-listing"
  const [editingItem, setEditingItem] = useState(null);
  const [showQrCodeForOrder, setShowQrCodeForOrder] = useState(null);

  // Dispute state variables
  const [disputeOrderId, setDisputeOrderId] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (payload) => {
    try {
      await itemApi.create(payload);
      alert("New listing published successfully!");
      setActiveTab("inventory");
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleEdit = async (payload) => {
    try {
      await itemApi.update(editingItem._id, payload);
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
            setActiveTab("settings");
            setEditingItem(null);
          }}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "settings" ? "border-accent text-accent" : "border-transparent text-ink/55 hover:text-ink"
          }`}
        >
          ⚙️ Settings
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
