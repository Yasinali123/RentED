import { useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, Heart, ShoppingBag, MapPin, School, Plus, Bookmark, List, RefreshCw } from "lucide-react";

import OrderTimeline from "./OrderTimeline";
import ItemCard from "../items/ItemCard";
import Button from "../ui/Button";
import { rentalApi, authApi, disputeApi, reviewApi, paymentApi, getErrorMessage } from "../../api/client";
import UserSettingsView from "./UserSettingsView";

function StudentDashboardView({ dashboard, onRefresh }) {
  const { stats, rentedItems, wishlistItems, nearbyItems } = dashboard;
  const [activeTab, setActiveTab] = useState("orders"); // "orders", "wishlist", "wallet"
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

  const handleDownloadInvoice = (order) => {
    const invoiceNumber = `INV-${order._id.substring(order._id.length - 8).toUpperCase()}`;
    const gstNumber = "27AAACR1234A1Z5";
    const buyerName = order.renter?.name || "Student Buyer";
    const buyerCollege = order.renter?.collegeName || order.item?.collegeName || "Campus Member";
    const sellerName = order.owner?.name || "Student Seller";
    const amount = order.totalPrice;
    const commission = order.commissionAmount || Math.round(amount * 0.1);
    
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>RentED Invoice - ${invoiceNumber}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 40px; margin: 0; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 800; color: #4f46e5; }
            .title { font-size: 20px; font-weight: 700; text-align: right; text-transform: uppercase; color: #64748b; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
            .section-title { font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; tracking-wider: 1px; margin-bottom: 5px; }
            .info-block p { margin: 4px 0; font-size: 13px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .table th { background: #f8fafc; border-bottom: 1px solid #cbd5e1; padding: 12px; font-size: 11px; text-transform: uppercase; font-weight: 800; text-align: left; }
            .table td { border-bottom: 1px solid #f1f5f9; padding: 12px; font-size: 13px; }
            .summary-block { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; margin-top: 20px; }
            .summary-row { display: flex; justify-content: space-between; width: 260px; font-size: 13px; }
            .summary-row.total { font-size: 16px; font-weight: 800; border-top: 1px solid #cbd5e1; padding-top: 8px; color: #4f46e5; }
            .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">RentED</div>
              <p style="font-size:12px;color:#64748b;margin:4px 0;">Hyperlocal Student Sharing Escrow Platform</p>
            </div>
            <div class="title">
              Invoice
              <p style="font-size:11px;color:#94a3b8;font-weight:normal;margin:4px 0 0 0;">No: ${invoiceNumber}</p>
              <p style="font-size:11px;color:#94a3b8;font-weight:normal;margin:2px 0 0 0;">Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div class="details">
            <div class="info-block">
              <p class="section-title">Billed To (Buyer)</p>
              <p><strong>${buyerName}</strong></p>
              <p>${buyerCollege}</p>
              <p>Institution Member</p>
            </div>
            <div class="info-block" style="text-align: right;">
              <p class="section-title">Sold By (Seller)</p>
              <p><strong>${sellerName}</strong></p>
              <p>RentED Partner Network</p>
              <p>Platform GST Reg: ${gstNumber}</p>
            </div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Pricing Mode</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${order.item?.title || "Product Listing"}</strong>
                  <div style="font-size:10px;color:#64748b;margin-top:2px;">Order ID: ${order._id}</div>
                </td>
                <td>${order.item?.category || "General"}</td>
                <td>${order.requestType === "rental" ? "Rental duration" : "Direct Purchase"}</td>
                <td style="text-align: right;">Rs. ${order.totalPrice}</td>
              </tr>
            </tbody>
          </table>
          <div class="summary-block">
            <div class="summary-row">
              <span style="color:#64748b;">Subtotal</span>
              <span>Rs. ${amount}</span>
            </div>
            <div class="summary-row">
              <span style="color:#64748b;">GST (18% inclusive)</span>
              <span>Rs. ${Math.round(amount * 0.18 * 100) / 100}</span>
            </div>
            <div class="summary-row">
              <span style="color:#64748b;">Platform Service Fee</span>
              <span>Rs. ${commission}</span>
            </div>
            <div class="summary-row total">
              <span>Total Paid</span>
              <span>Rs. ${amount}</span>
            </div>
          </div>
          <div class="footer">
            <p>This invoice is electronically generated. No physical signature is required.</p>
            <p>RentED © 2026. For support, reach out to support@rented.com</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-6 bg-gradient-to-br from-indigo-50 to-white border-indigo-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">Escrow Wallet</p>
            <p className="text-3xl font-black text-indigo-700 mt-2">Rs. {stats.balance}</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700">
            <Wallet className="h-6 w-6" />
          </div>
        </div>

        <div className="panel p-6 bg-gradient-to-br from-emerald-50 to-white border-emerald-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">Active Rentals</p>
            <p className="text-3xl font-black text-emerald-700 mt-2">{stats.activeRentals}</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <ShoppingBag className="h-6 w-6" />
          </div>
        </div>

        <div className="panel p-6 bg-gradient-to-br from-orange-50 to-white border-orange-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">Total Escrow Spent</p>
            <p className="text-3xl font-black text-orange-700 mt-2">Rs. {stats.totalSpent}</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-700">
            <Heart className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-ink/5 gap-6">
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "orders" ? "border-accent text-accent" : "border-transparent text-ink/50 hover:text-ink"
          }`}
        >
          Your Orders & Bookings ({rentedItems.length})
        </button>
        <button
          onClick={() => setActiveTab("wishlist")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "wishlist" ? "border-accent text-accent" : "border-transparent text-ink/50 hover:text-ink"
          }`}
        >
          Wishlist ({wishlistItems.length})
        </button>
        <button
          onClick={() => setActiveTab("wallet")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "wallet" ? "border-accent text-accent" : "border-transparent text-ink/50 hover:text-ink"
          }`}
        >
          Wallet Deposit
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "settings" ? "border-accent text-accent" : "border-transparent text-ink/50 hover:text-ink"
          }`}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          {rentedItems.length === 0 ? (
            <div className="panel p-10 text-center text-ink/50">
              <ShoppingBag className="h-12 w-12 mx-auto text-ink/20 mb-3" />
              <p className="font-bold">No active orders or rentals</p>
              <p className="text-xs text-ink/40 mt-1">Browse the student marketplace to rent books, calculators, and PG listings!</p>
              <Link to="/marketplace" className="inline-flex mt-4 text-xs font-bold text-accent hover:underline">
                Go to Marketplace →
              </Link>
            </div>
          ) : (
            rentedItems.map((request) => (
              <div key={request._id} className="panel p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={request.item?.image || "https://placehold.co/150x150?text=Item"}
                      alt={request.item?.title}
                      className="h-16 w-16 rounded-xl object-cover border border-ink/5 shrink-0 bg-mist"
                    />
                    <div>
                      <h3 className="font-bold text-lg">{request.item?.title}</h3>
                      <p className="text-xs text-ink/50 mt-0.5">
                        Seller: <b>{request.owner?.name}</b> • Campus: {request.item?.collegeName}
                      </p>
                      <p className="text-xs text-ink/50 mt-1">
                        Type: <span className="capitalize font-semibold text-accent">{request.requestType}</span> • Delivery: <span className="font-semibold">{request.paymentMethod === "cod" ? "COD" : "Online"}</span>
                      </p>
                      {request.paymentMethod !== "cod" && request.dummyPaymentReference && (
                        <p className="text-[10px] text-ink/40 mt-1 font-mono">
                          TxID: {request.dummyPaymentReference}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right sm:self-center">
                    <p className="text-sm font-semibold text-ink/40">Amount Paid</p>
                    <p className="text-xl font-black text-ink">Rs. {request.totalPrice}</p>
                  </div>
                </div>

                {/* Tracking Progress */}
                <OrderTimeline request={request} />

                {/* Operations */}
                <div className="flex flex-wrap gap-2 pt-2 justify-end items-center">
                  {request.disputed && (
                    <span className="text-[10px] font-black tracking-wider uppercase text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full animate-pulse mr-auto">
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
