import { useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, Heart, ShoppingBag, MapPin, School, Plus, Bookmark, List, RefreshCw, FileText, Tag, Edit3, Trash2, QrCode, DollarSign, PackagePlus } from "lucide-react";

import OrderTimeline from "./OrderTimeline";
import ItemCard from "../items/ItemCard";
import Button from "../ui/Button";
import { rentalApi, authApi, disputeApi, reviewApi, paymentApi, invoiceApi, itemApi, getErrorMessage } from "../../api/client";
import UserSettingsView from "./UserSettingsView";

function StudentDashboardView({ dashboard, onRefresh, initialTab }) {
  const { stats, rentedItems = [], wishlistItems = [], nearbyItems = [], listedItems = [], incomingRequests = [] } = dashboard;
  const [activeTab, setActiveTab] = useState(initialTab || "orders"); // "orders", "wishlist", "wallet", "sell-rent"

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [showQrCodeForOrder, setShowQrCodeForOrder] = useState(null);
  const [addAmount, setAddAmount] = useState("");
  const [walletFeedback, setWalletFeedback] = useState("");
  const [cancellingId, setCancellingId] = useState("");

  // Disputes & Reviews modal state
  const [disputeOrderId, setDisputeOrderId] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [reviewOrder, setReviewOrder] = useState(null);
  const [itemRating, setItemRating] = useState(5);
  const [itemComment, setItemComment] = useState("");
  const [pocRatingInput, setPocRatingInput] = useState(5);
  const [pocCommentInput, setPocCommentInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invoice state
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const fetchInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const data = await invoiceApi.getMyInvoices();
      setInvoices(data);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleDownloadInvoice = async (order) => {
    try {
      const invoice = await invoiceApi.getByOrder(order._id);
      if (invoice?._id) {
        await invoiceApi.downloadPdf(invoice._id, invoice.invoiceNumber);
      } else if (invoice?.pdfUrl) {
        window.open(invoice.pdfUrl, "_blank");
      } else {
        alert("Invoice PDF is not available yet. Please try again in a moment.");
      }
    } catch (err) {
      alert(getErrorMessage(err) || "Failed to fetch invoice.");
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order? Any payment made will be refunded to your wallet.")) return;
    setCancellingId(orderId);
    try {
      await rentalApi.cancel(orderId);
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setCancellingId("");
    }
  };

  const handleConfirmReceipt = async (orderId) => {
    if (!window.confirm("Confirming delivery will release the funds to the seller. Proceed?")) return;
    try {
      await rentalApi.complete(orderId); // Call confirmation route
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleRequestReturn = async (orderId) => {
    if (!window.confirm("Requesting a return will notify the college POC to collect the item. Proceed?")) return;
    try {
      await rentalApi.requestReturn(orderId); // Return request route
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleAddFunds = async (e) => {
    e.preventDefault();
    setWalletFeedback("");
    const amount = Number(addAmount);
    if (!amount || amount <= 0) {
      setWalletFeedback("Please enter a valid amount");
      return;
    }

    try {
      setWalletFeedback("Initiating transaction...");
      // 1. Create Order intent on backend
      const intent = await paymentApi.createIntent({
        amount,
      });

      if (intent.isSandbox) {
        // Sandbox mode fallback
        const verification = await paymentApi.verify({
          razorpay_order_id: intent.orderId,
          razorpay_payment_id: `pay_sandbox_${Date.now()}`,
          razorpay_signature: "sandbox_sig",
          amount,
          type: "wallet",
        });

        alert(verification.message || `Success! Rs. ${amount} added to your wallet (Sandbox).`);
        setAddAmount("");
        onRefresh();
      } else {
        // Open Razorpay Checkout Modal
        const options = {
          key: intent.keyId,
          amount: intent.amount,
          currency: intent.currency,
          name: "RentEd Wallet Deposit",
          description: `Add Rs. ${amount} to RentEd Escrow Wallet`,
          order_id: intent.orderId,
          handler: async function (response) {
            try {
              setWalletFeedback("Verifying deposit transaction...");
              const verification = await paymentApi.verify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount,
                type: "wallet",
              });

              alert(verification.message || `Success! Rs. ${amount} added to your wallet.`);
              setAddAmount("");
              onRefresh();
            } catch (err) {
              setWalletFeedback(getErrorMessage(err));
            }
          },
          prefill: {
            name: stats?.userName || "",
          },
          theme: {
            color: "#4f46e5",
          },
          modal: {
            ondismiss: function () {
              setWalletFeedback("Deposit cancelled.");
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      setWalletFeedback(getErrorMessage(err));
    }
  };

  const handleRaiseDisputeSubmit = async (e) => {
    e.preventDefault();
    if (!disputeReason.trim()) return;
    setIsSubmitting(true);
    try {
      await disputeApi.raise({ orderId: disputeOrderId, reason: disputeReason });
      alert("Dispute raised successfully! Escrow funds have been locked under platform mediation.");
      setDisputeOrderId("");
      setDisputeReason("");
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateReviewSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await reviewApi.create({
        rentalRequestId: reviewOrder._id,
        rating: itemRating,
        comment: itemComment,
        pocRating: reviewOrder.poc ? pocRatingInput : undefined,
        pocComment: reviewOrder.poc ? pocCommentInput : undefined,
      });
      alert("Thank you! Review and ratings submitted successfully.");
      setReviewOrder(null);
      setItemRating(5);
      setItemComment("");
      setPocRatingInput(5);
      setPocCommentInput("");
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteListing = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this listing? This action is permanent.")) return;
    try {
      await itemApi.delete(itemId);
      alert("Listing deleted successfully.");
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

  const handleAcceptOrder = async (orderId) => {
    try {
      await rentalApi.accept(orderId);
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleRejectOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to reject this order?")) return;
    try {
      await rentalApi.reject(orderId);
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

  const categories = [
    { name: "Books", path: "/marketplace?category=Books" },
    { name: "Topper Notes", path: "/marketplace?category=Topper+Notes" },
    { name: "Engineering Books", path: "/marketplace?category=Engineering+Books" },
    { name: "Calculators", path: "/marketplace?category=Calculators" },
    { name: "Lab Equipment", path: "/marketplace?category=Lab+Equipment" },
    { name: "Electronics", path: "/marketplace?category=Electronics" },
    { name: "Hostel Essentials", path: "/marketplace?category=Hostel+Essentials" },
    { name: "Furniture", path: "/marketplace?category=Furniture" },
    { name: "Room / PG Listings", path: "/marketplace?category=Room+%2F+PG+Listings" },
  ];

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel p-4 sm:p-5 bg-gradient-to-br from-indigo-50 to-white border-indigo-100 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-ink/40 truncate">Escrow Wallet</p>
            <p className="text-xl sm:text-2xl font-black text-indigo-700 mt-1 truncate">Rs. {stats.balance}</p>
          </div>
          <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        <div className="panel p-4 sm:p-5 bg-gradient-to-br from-emerald-50 to-white border-emerald-100 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-ink/40 truncate">Active Rentals</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 truncate">{stats.activeRentals}</p>
          </div>
          <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </div>

        <div className="panel p-4 sm:p-5 bg-gradient-to-br from-purple-50 to-white border-purple-100 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-ink/40 truncate">My Listings</p>
            <p className="text-xl sm:text-2xl font-black text-purple-700 mt-1 truncate">{stats.totalProducts || listedItems.length}</p>
          </div>
          <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
            <Tag className="h-5 w-5" />
          </div>
        </div>

        <div className="panel p-4 sm:p-5 bg-gradient-to-br from-orange-50 to-white border-orange-100 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-ink/40 truncate">Total Escrow Spent</p>
            <p className="text-xl sm:text-2xl font-black text-orange-700 mt-1 truncate">Rs. {stats.totalSpent}</p>
          </div>
          <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-700 shrink-0">
            <Heart className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-ink/10 gap-1 sm:gap-6 overflow-x-auto whitespace-nowrap no-scrollbar pb-1 px-1">
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-2.5 sm:pb-3 px-2.5 sm:px-3 text-xs sm:text-sm font-extrabold border-b-2 transition-colors shrink-0 min-h-[44px] flex items-center ${
            activeTab === "orders" ? "border-accent text-accent" : "border-transparent text-ink/60 hover:text-ink"
          }`}
        >
          Your Orders & Bookings ({rentedItems.length})
        </button>
        <button
          onClick={() => setActiveTab("sell-rent")}
          className={`pb-2.5 sm:pb-3 px-2.5 sm:px-3 text-xs sm:text-sm font-extrabold border-b-2 transition-colors shrink-0 min-h-[44px] flex items-center ${
            activeTab === "sell-rent" ? "border-accent text-accent" : "border-transparent text-ink/60 hover:text-ink"
          }`}
        >
          🏷️ Sell / Rent ({listedItems.length})
        </button>
        <button
          onClick={() => setActiveTab("wishlist")}
          className={`pb-2.5 sm:pb-3 px-2.5 sm:px-3 text-xs sm:text-sm font-extrabold border-b-2 transition-colors shrink-0 min-h-[44px] flex items-center ${
            activeTab === "wishlist" ? "border-accent text-accent" : "border-transparent text-ink/60 hover:text-ink"
          }`}
        >
          Wishlist ({wishlistItems.length})
        </button>
        <button
          onClick={() => setActiveTab("wallet")}
          className={`pb-2.5 sm:pb-3 px-2.5 sm:px-3 text-xs sm:text-sm font-extrabold border-b-2 transition-colors shrink-0 min-h-[44px] flex items-center ${
            activeTab === "wallet" ? "border-accent text-accent" : "border-transparent text-ink/60 hover:text-ink"
          }`}
        >
          Wallet Deposit
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-2.5 sm:pb-3 px-2.5 sm:px-3 text-xs sm:text-sm font-extrabold border-b-2 transition-colors shrink-0 min-h-[44px] flex items-center ${
            activeTab === "settings" ? "border-accent text-accent" : "border-transparent text-ink/60 hover:text-ink"
          }`}
        >
          ⚙️ Settings
        </button>
        <button
          onClick={() => { setActiveTab("invoices"); fetchInvoices(); }}
          className={`pb-2.5 sm:pb-3 px-2.5 sm:px-3 text-xs sm:text-sm font-extrabold border-b-2 transition-colors shrink-0 min-h-[44px] flex items-center ${
            activeTab === "invoices" ? "border-accent text-accent" : "border-transparent text-ink/60 hover:text-ink"
          }`}
        >
          🧾 My Invoices
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          {rentedItems.length === 0 ? (
            <div className="panel p-6 sm:p-10 text-center text-ink/50">
              <ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-ink/20 mb-3" />
              <p className="font-bold text-sm sm:text-base">No active orders or rentals</p>
              <p className="text-xs text-ink/40 mt-1">Browse the student marketplace to rent books, calculators, and PG listings!</p>
              <Link to="/marketplace" className="inline-flex mt-4 text-xs font-bold text-accent hover:underline">
                Go to Marketplace →
              </Link>
            </div>
          ) : (
            rentedItems.map((request) => (
              <div key={request._id} className="panel p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                    <img
                      src={request.item?.image || "https://placehold.co/150x150?text=Item"}
                      alt={request.item?.title}
                      className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl object-cover border border-ink/5 shrink-0 bg-mist"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-base sm:text-lg text-ink break-words">{request.item?.title}</h3>
                      <p className="text-xs text-ink/50 mt-0.5 break-words">
                        Seller: <b>{request.owner?.name}</b> • Campus: {request.item?.collegeName}
                      </p>
                      <p className="text-xs text-ink/50 mt-1 flex flex-wrap items-center gap-2">
                        <span>Type: <span className="capitalize font-semibold text-accent">{request.requestType}</span></span> • 
                        <span>Delivery: <span className="font-semibold">{request.paymentMethod === "cod" ? "COD" : "Online"}</span></span>
                        {request.earningsReleased ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            ✅ Escrow Released
                          </span>
                        ) : request.paymentMethod === "cod" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            💵 COD Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                            🔒 Locked in Escrow
                          </span>
                        )}
                      </p>
                      {request.paymentMethod !== "cod" && request.paymentReference && (
                        <p className="text-[10px] text-ink/40 mt-1 font-mono break-all">
                          TxID: {request.paymentReference}
                        </p>
                      )}
                      {["Picked Up", "Out For Delivery", "Delivered"].includes(request.status) && request.deliveryQrCode && (
                        <div className="mt-2 text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl flex flex-wrap items-center justify-between gap-2 animate-pulse">
                          <span>🔑 Delivery OTP for Campus Courier:</span>
                          <span className="font-mono text-sm tracking-widest font-black text-indigo-700 bg-white px-2.5 py-0.5 rounded border border-indigo-200">{request.deliveryQrCode}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-left sm:text-right sm:self-center shrink-0">
                    <p className="text-xs font-semibold text-ink/40">Amount Paid</p>
                    <p className="text-lg sm:text-xl font-black text-ink">Rs. {request.totalPrice}</p>
                  </div>
                </div>

                {/* Tracking Progress */}
                <OrderTimeline request={request} />

                {/* Operations */}
                <div className="flex flex-wrap gap-2 pt-2 justify-start sm:justify-end items-center w-full">
                  {request.disputed && (
                    <span className="text-[10px] font-black tracking-wider uppercase text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full animate-pulse w-full sm:w-auto sm:mr-auto text-center">
                      ⚠️ Escrow Disputed: Under Investigation
                    </span>
                  )}

                  {["Payment Successful", "Seller Accepted", "POC Assigned", "Pickup Scheduled", "Picked Up", "Out For Delivery", "Delivered", "Rental Active", "Completed"].includes(request.status) && (
                    <Button
                      variant="ghost"
                      className="text-indigo-600 hover:bg-indigo-50 text-[10px] py-1.5 px-3 border border-indigo-200 rounded-full font-bold mr-auto"
                      onClick={() => handleDownloadInvoice(request)}
                    >
                      Download Invoice
                    </Button>
                  )}

                  {!request.disputed && ["Payment Successful", "Seller Accepted", "POC Assigned", "Pickup Scheduled", "Picked Up", "Out For Delivery", "Delivered", "Rental Active", "Return Requested", "Returned"].includes(request.status) && (
                    <Button
                      variant="ghost"
                      className="text-red-500 hover:bg-red-50 text-[10px] py-1.5 px-3 border border-red-100 rounded-full font-bold"
                      onClick={() => setDisputeOrderId(request._id)}
                    >
                      Raise Dispute
                    </Button>
                  )}

                  {["Pending Payment", "Payment Successful"].includes(request.status) && (
                    <Button
                      variant="ghost"
                      className="text-red-500 hover:bg-red-50 text-xs py-2 px-4 rounded-full"
                      onClick={() => handleCancelOrder(request._id)}
                      disabled={cancellingId === request._id}
                    >
                      {cancellingId === request._id ? "Cancelling..." : "Cancel Order"}
                    </Button>
                  )}

                  {request.status === "Delivered" && (
                    <Button
                      variant="primary"
                      className="text-xs py-2 px-5 rounded-full"
                      onClick={() => handleConfirmReceipt(request._id)}
                    >
                      Confirm Delivery & Release Escrow
                    </Button>
                  )}

                  {request.status === "Rental Active" && (
                    <Button
                      variant="secondary"
                      className="text-xs py-2 px-5 rounded-full"
                      onClick={() => handleRequestReturn(request._id)}
                    >
                      Initiate Return Pickup
                    </Button>
                  )}

                  {request.status === "Completed" && (
                    <Button
                      variant="secondary"
                      className="text-xs py-2 px-5 rounded-full"
                      onClick={() => setReviewOrder(request)}
                    >
                      Write Review
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "sell-rent" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="panel p-6 bg-gradient-to-r from-accent/10 via-amber-500/5 to-purple-500/10 border border-accent/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="chip text-[10px] bg-accent text-white font-extrabold uppercase px-2.5 py-0.5 rounded-full">Campus Marketplace</span>
              <h2 className="text-xl sm:text-2xl font-black text-ink mt-2">Sell or Rent Out Your Items</h2>
              <p className="text-xs text-ink/65 mt-1 max-w-xl">
                Earn money by listing your extra textbooks, lab equipment, calculators, room listings, or hostel essentials.
              </p>
            </div>
            <Link
              to="/sell-rent"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-accent text-white font-extrabold text-xs shadow-md hover:scale-[1.02] transition-transform shrink-0"
            >
              <Plus className="h-4 w-4" /> Post New Listing
            </Link>
          </div>

          {/* Incoming Orders Section (if any) */}
          {incomingRequests.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-accent" />
                Incoming Buyer & Renter Orders ({incomingRequests.length})
              </h3>
              <div className="grid gap-4">
                {incomingRequests.map((request) => (
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
                          Buyer/Renter: <b>{request.renter?.name}</b> • Campus: {request.renter?.collegeName || request.item?.collegeName}
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

                      {request.status === "Payment Successful" && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleRejectOrder(request._id)}
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 py-1.5 px-3 rounded-full text-xs font-bold"
                          >
                            Reject
                          </Button>
                          <Button
                            onClick={() => handleAcceptOrder(request._id)}
                            variant="primary"
                            className="py-1.5 px-4 rounded-full text-xs font-bold"
                          >
                            Accept Order
                          </Button>
                        </div>
                      )}

                      {["Seller Accepted", "POC Assigned", "Pickup Scheduled"].includes(request.status) && (
                        <Button
                          onClick={() => handleHandoverSignal(request._id)}
                          variant="secondary"
                          className="flex items-center gap-1 py-1.5 px-4 rounded-full text-xs font-bold"
                        >
                          <QrCode className="h-4 w-4" />
                          Handover OTP
                        </Button>
                      )}
                    </div>

                    {showQrCodeForOrder === request._id && (
                      <div className="w-full border-t border-ink/5 pt-4 mt-2">
                        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div>
                            <p className="font-bold text-amber-900">Provide OTP to Campus Courier</p>
                            <p className="text-xs text-amber-800/80 mt-1">Show this OTP to the campus POC to verify item handover.</p>
                          </div>
                          <div className="bg-white border border-amber-200 py-2 px-6 rounded-2xl text-center">
                            <p className="text-[10px] uppercase tracking-wider text-ink/40">Handover OTP</p>
                            <p className="text-xl font-black text-amber-800 mt-0.5 tracking-widest">{request.pickupQrCode}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Listings Grid */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <Tag className="h-5 w-5 text-accent" />
                My Active Listings ({listedItems.length})
              </h3>
              <Link to="/sell-rent" className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
                <Plus className="h-4 w-4" /> Add Another Item
              </Link>
            </div>

            {listedItems.length === 0 ? (
              <div className="panel p-10 text-center text-ink/50 space-y-3">
                <PackagePlus className="h-12 w-12 mx-auto text-ink/20" />
                <p className="font-bold text-base text-ink">You haven't listed any items for sell or rent yet</p>
                <p className="text-xs text-ink/50 max-w-md mx-auto">
                  Have extra books, notes, hostel items, or gadgets? List them on RentEd and start earning from fellow students.
                </p>
                <Link
                  to="/sell-rent"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-accent text-white font-bold text-xs shadow-md mt-2"
                >
                  <Plus className="h-4 w-4" /> Post Your First Item
                </Link>
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
                        <p className="text-xs text-ink/50 truncate mt-0.5">Rent: Rs. {item.rentalPrice}/day | Sale: Rs. {item.salePrice}</p>
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
                        {item.availabilityStatus !== "available" && (
                          <button
                            onClick={() => handleRepostItem(item._id)}
                            className="px-2.5 py-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full hover:bg-indigo-100"
                          >
                            Repost
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteListing(item._id)}
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
        </div>
      )}

      {activeTab === "wishlist" && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {wishlistItems.length === 0 ? (
            <div className="panel col-span-full p-10 text-center text-ink/50">
              <Bookmark className="h-12 w-12 mx-auto text-ink/20 mb-3" />
              <p className="font-bold">Your Wishlist is empty</p>
              <p className="text-xs text-ink/40 mt-1">Bookmark listings during search to save them here.</p>
            </div>
          ) : (
            wishlistItems.map((item) => (
              <ItemCard key={item._id} item={item} />
            ))
          )}
        </div>
      )}

      {activeTab === "wallet" && (
        <div className="panel p-6 max-w-lg">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-accent" />
            Add Sandbox Escrow Funds
          </h2>
          <p className="text-xs text-ink/65 mt-2">
            RentED holds funds in escrow during transaction processing. You can load mock credits to test direct purchases:
          </p>

          <form onSubmit={handleAddFunds} className="mt-5 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink/50 uppercase">Amount (INR)</label>
              <input
                type="number"
                placeholder="Rs. 500, Rs. 1000..."
                className="input"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                min={1}
                required
              />
            </div>
            {walletFeedback && <p className="text-xs text-red-500">{walletFeedback}</p>}
            <Button type="submit" variant="secondary" className="w-full">
              Load Wallet Balance
            </Button>
          </form>
        </div>
      )}

      {activeTab === "settings" && (
        <UserSettingsView onRefresh={onRefresh} />
      )}

      {activeTab === "invoices" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              My Invoices
            </h2>
            <button onClick={fetchInvoices} className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          {invoicesLoading ? (
            <div className="panel p-10 text-center text-ink/50">
              <p className="font-bold">Loading invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="panel p-10 text-center text-ink/50">
              <FileText className="h-12 w-12 mx-auto text-ink/20 mb-3" />
              <p className="font-bold">No invoices found</p>
              <p className="text-xs text-ink/40 mt-1">Invoices are generated automatically after each successful order.</p>
            </div>
          ) : (
            <div className="panel overflow-x-auto">
              <table className="w-full text-sm min-w-[650px]">
                <thead>
                  <tr className="border-b border-ink/5">
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-wider text-ink/40">Invoice #</th>
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-wider text-ink/40">Item</th>
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-wider text-ink/40">Type</th>
                    <th className="text-right p-3 text-[10px] font-black uppercase tracking-wider text-ink/40">Amount</th>
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-wider text-ink/40">Date</th>
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-wider text-ink/40">Status</th>
                    <th className="text-right p-3 text-[10px] font-black uppercase tracking-wider text-ink/40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="border-b border-ink/5 hover:bg-canvas/50 transition-colors">
                      <td className="p-3 font-mono text-xs font-bold text-accent">{inv.invoiceNumber}</td>
                      <td className="p-3 font-semibold">{inv.item?.title || "—"}</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          inv.invoiceType === "rental" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {inv.invoiceType}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold">Rs. {inv.totalAmount}</td>
                      <td className="p-3 text-xs text-ink/60">{new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          inv.status === "emailed" ? "bg-green-50 text-green-700" : inv.status === "void" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => invoiceApi.downloadPdf(inv._id, inv.invoiceNumber)}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-full hover:bg-indigo-50 transition-colors"
                          >
                            📄 Download
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await invoiceApi.resend(inv._id);
                                alert("Invoice resent to your email!");
                                fetchInvoices();
                              } catch (err) {
                                alert(getErrorMessage(err));
                              }
                            }}
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full hover:bg-emerald-50 transition-colors"
                          >
                            📧 Resend
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Recommendation Priority Slider */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <School className="h-6 w-6 text-indigo-700" />
            Hyperlocal Proximity Recommendations
          </h2>
          <button onClick={onRefresh} className="text-xs font-bold text-accent flex items-center gap-1 hover:underline">
            <RefreshCw className="h-3 w-3" /> Sync Location
          </button>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {nearbyItems.slice(0, 4).map((item) => (
            <ItemCard key={item._id} item={item} />
          ))}
          {nearbyItems.length === 0 && (
            <p className="text-xs text-ink/40 col-span-full">No nearby products found for your college/city.</p>
          )}
        </div>
      </section>

      {/* Dynamic Category Browser Grid */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <List className="h-6 w-6 text-accent" />
          Browse Categories
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {categories.map((c) => (
            <Link
              key={c.name}
              to={c.path}
              className="panel p-4 text-center hover:border-accent hover:text-accent transition-all text-xs font-bold"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>

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
                  placeholder="Provide precise reason (e.g. Item was damaged, missing accessories, never received)..."
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

      {/* REVIEW TRANSACTION MODAL */}
      {reviewOrder && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5 animate-zoomIn">
            <button onClick={() => setReviewOrder(null)} className="absolute top-4 right-4 p-1 hover:bg-canvas rounded-full">
              <span className="text-xs font-bold text-ink/40 hover:text-ink">Close</span>
            </button>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-accent">Review and Ratings feedback</p>
              <h3 className="text-base font-black text-ink mt-1">Rate Transaction & Delivery</h3>
            </div>

            <form onSubmit={handleCreateReviewSubmit} className="space-y-4">
              {/* Item / Seller Review */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-ink/75 block">1. Product & Seller Rating (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setItemRating(val)}
                      className={`text-xl ${val <= itemRating ? "text-amber-500" : "text-ink/20"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  className="input text-xs min-h-16"
                  placeholder="Share feedback on product condition and seller response..."
                  value={itemComment}
                  onChange={(e) => setItemComment(e.target.value)}
                  required
                />
              </div>

              {/* POC Rating (if assigned) */}
              {reviewOrder.poc && (
                <div className="space-y-2 border-t border-ink/5 pt-4">
                  <label className="text-xs font-black uppercase text-ink/75 block">2. Delivery Courier Performance (1-5)</label>
                  <p className="text-[10px] text-ink/40">Rate POC dispatcher: <b>{reviewOrder.poc.name || "Campus Courier"}</b></p>
                  <div className="flex gap-2 mt-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setPocRatingInput(val)}
                        className={`text-xl ${val <= pocRatingInput ? "text-indigo-500" : "text-ink/20"}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="input text-xs min-h-16 mt-2"
                    placeholder="Rate the speed and helpfulness of the campus POC..."
                    value={pocCommentInput}
                    onChange={(e) => setPocCommentInput(e.target.value)}
                  />
                </div>
              )}

              <Button type="submit" variant="secondary" className="w-full text-xs font-bold py-2 uppercase" disabled={isSubmitting}>
                {isSubmitting ? "Submitting review..." : "Submit Ratings feedback"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboardView;
