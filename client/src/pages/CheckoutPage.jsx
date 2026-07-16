import { CreditCard, MapPin, Package, ShieldCheck, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { getErrorMessage, itemApi, paymentApi, rentalApi, authApi, couponApi } from "../api/client";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import {
  getPurchaseTotalLabel,
  getRentalPrice,
  getSalePrice,
  isRoomListing,
} from "../utils/itemPresentation";

function CheckoutPage() {
  const { itemId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [upiStatus, setUpiStatus] = useState("idle"); // "idle", "pending", "success"
  const [userBalance, setUserBalance] = useState(user?.balance || 0);
  const [isOnlinePaid, setIsOnlinePaid] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [onlinePayRef, setOnlinePayRef] = useState("");

  // Extract intent from location state
  const requestType = location.state?.requestType || "rental";
  const startDate = location.state?.startDate || "";
  const endDate = location.state?.endDate || "";
  const message = location.state?.message || "";

  const [form, setForm] = useState({
    deliveryAddress: user?.location || "",
    paymentMethod: "online", // "online" (Razorpay), "wallet", or "cod"
  });

  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCodeInput.trim()) {
      setCouponError("Please enter a coupon code.");
      return;
    }
    setCouponLoading(true);
    setCouponError("");
    try {
      const response = await couponApi.validate({
        code: couponCodeInput.trim().toUpperCase(),
        amount: estimatedAmount,
      });
      if (response.success) {
        setAppliedCoupon(response);
        setCouponError("");
      } else {
        setCouponError(response.message || "Invalid coupon code.");
      }
    } catch (err) {
      setCouponError(getErrorMessage(err));
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput("");
    setCouponError("");
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    itemApi
      .getById(itemId)
      .then(setItem)
      .catch((error) => setFeedback(getErrorMessage(error)));

    authApi
      .me()
      .then((response) => {
        if (response?.user) {
          setUserBalance(response.user.balance || 0);
        }
      })
      .catch((error) => {
        console.error("Error loading user wallet balance:", error);
      });
  }, [itemId, user, navigate]);

  if (!item) {
    return (
      <div className="panel p-8 text-center text-ink/55">
        {feedback || "Loading checkout details..."}
      </div>
    );
  }

  const rentalPrice = getRentalPrice(item);
  const salePrice = getSalePrice(item);
  const isRoom = isRoomListing(item);

  const getDays = () => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    return Math.max(diff, 1);
  };

  const estimatedAmount =
    requestType === "purchase" ? salePrice : (rentalPrice ?? 0) * getDays();

  const finalPayableAmount = appliedCoupon ? appliedCoupon.finalAmount : estimatedAmount;

  const completeOrderPlacement = async (paymentReference) => {
    try {
      const orderPayload = {
        itemId: item._id,
        message,
        paymentMethod: form.paymentMethod === "cod" ? "cod" : "online",
        paymentReference,
        deliveryAddress: form.deliveryAddress,
        couponCode: appliedCoupon ? appliedCoupon.code : "",
      };

      if (requestType === "purchase") {
        await rentalApi.createPurchase(orderPayload);
      } else {
        await rentalApi.create({
          ...orderPayload,
          startDate,
          endDate,
        });
      }

      setFeedback("Order placed successfully! Redirecting...");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (error) {
      setFeedback(getErrorMessage(error));
      setIsProcessing(false);
    }
  };

  const handlePlaceOrder = async (event) => {
    event.preventDefault();
    setFeedback("");

    // If Razorpay Online Payment is selected but not paid yet, show QR code modal first
    if (form.paymentMethod === "online" && !isOnlinePaid) {
      setShowQrModal(true);
      return;
    }

    // Once payment is settled (or for COD/Wallet), validate and request location details
    if (!form.deliveryAddress.trim() && !isRoom) {
      setFeedback("Please enter a delivery address.");
      return;
    }

    if (form.paymentMethod === "wallet" && userBalance < finalPayableAmount) {
      setFeedback(`Insufficient wallet balance. You need Rs. ${finalPayableAmount} (Your Balance: Rs. ${userBalance}). Please select Cash on Delivery or deposit funds first.`);
      return;
    }

    setIsProcessing(true);

    try {
      if (form.paymentMethod === "online") {
        await completeOrderPlacement(onlinePayRef);
      } else {
        // Wallet or COD path
        await completeOrderPlacement("");
      }
    } catch (error) {
      setFeedback(getErrorMessage(error));
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Secure Checkout</h1>
        <p className="mt-2 text-sm text-ink/60">Complete your {requestType === "purchase" ? "purchase" : "rental"} securely.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {form.paymentMethod === "online" ? (
            <>
              {/* Payment Method Section (Shown first for Online Payment) */}
              <div className="panel p-6 border-accent/20 bg-accent/[0.01]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="flex items-center gap-2 text-xl font-semibold">
                    <CreditCard className="h-5 w-5 text-accent" />
                    1. Payment Method
                  </h2>
                  {isOnlinePaid ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="h-3.5 w-3.5" /> Paid Successfully
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200 animate-pulse">
                      Payment Required
                    </span>
                  )}
                </div>
                
                <div className="space-y-4">
                  <label className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${form.paymentMethod === "online" ? "border-accent bg-accent/5" : "border-ink/10"}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="online"
                      checked={form.paymentMethod === "online"}
                      onChange={() => {
                        setForm({ ...form, paymentMethod: "online" });
                      }}
                      className="h-4 w-4 accent-accent"
                    />
                    <div>
                      <p className="font-semibold">Razorpay Secure Payment</p>
                      <p className="text-xs text-ink/55">Pay directly via Credit/Debit Cards, UPI, Netbanking, or Wallets</p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-ink/10 p-4 transition opacity-50 hover:opacity-100" onClick={() => setForm({ ...form, paymentMethod: "wallet" })}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="wallet"
                      checked={false}
                      readOnly
                      className="h-4 w-4 accent-accent"
                    />
                    <div>
                      <p className="font-semibold">Pay from Escrow Wallet Balance</p>
                      <p className="text-xs text-ink/55">Switch to wallet pay (Current Balance: Rs. {userBalance})</p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-ink/10 p-4 transition opacity-50 hover:opacity-100" onClick={() => setForm({ ...form, paymentMethod: "cod" })}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={false}
                      readOnly
                      className="h-4 w-4 accent-accent"
                    />
                    <div>
                      <p className="font-semibold">Cash on Delivery (COD)</p>
                      <p className="text-xs text-ink/55">Switch to COD and pay locally on pickup</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Delivery Address Section (Locked until Online Payment completed) */}
              <div className={`panel p-6 transition-all duration-300 ${!isOnlinePaid ? "opacity-55 pointer-events-none bg-black/[0.02]" : "border-emerald-100 bg-emerald-[0.01]"}`}>
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <MapPin className="h-5 w-5 text-accent" />
                  2. Delivery Address {!isOnlinePaid && " (Locked)"}
                </h2>
                <div className="mt-4">
                  {!isOnlinePaid ? (
                    <div className="rounded-xl border border-dashed border-ink/15 p-4 text-center text-sm text-ink/50 bg-white/40">
                      🔒 Complete the Razorpay Secure Payment to unlock this address form.
                    </div>
                  ) : (
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">{isRoom ? "Your current location / preferences" : "Full Address"}</span>
                      <textarea
                        className="textarea"
                        placeholder="Enter your complete address..."
                        value={form.deliveryAddress}
                        onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                        rows={3}
                        required
                      />
                    </label>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Delivery Address Section (Shown first for COD/Wallet) */}
              <div className="panel p-6 border-accent/20 bg-accent/[0.01]">
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <MapPin className="h-5 w-5 text-accent" />
                  1. Delivery Address
                </h2>
                <div className="mt-4">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">{isRoom ? "Your current location / preferences" : "Full Address"}</span>
                    <textarea
                      className="textarea"
                      placeholder="Enter your complete address..."
                      value={form.deliveryAddress}
                      onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                      rows={3}
                      required
                    />
                  </label>
                </div>
              </div>

              {/* Payment Method Section (Shown second for COD/Wallet) */}
              <div className="panel p-6">
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <CreditCard className="h-5 w-5 text-accent" />
                  2. Payment Method
                </h2>
                <div className="mt-6 space-y-4">
                  <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-ink/10 p-4 transition opacity-50 hover:opacity-100" onClick={() => setForm({ ...form, paymentMethod: "online" })}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="online"
                      checked={false}
                      readOnly
                      className="h-4 w-4 accent-accent"
                    />
                    <div>
                      <p className="font-semibold">Razorpay Secure Payment</p>
                      <p className="text-xs text-ink/55">Switch to online payment via Cards, UPI, or Wallets</p>
                    </div>
                  </label>

                  <label className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${form.paymentMethod === "wallet" ? "border-accent bg-accent/5" : "border-ink/10"}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="wallet"
                      checked={form.paymentMethod === "wallet"}
                      onChange={() => setForm({ ...form, paymentMethod: "wallet" })}
                      className="h-4 w-4 accent-accent"
                    />
                    <div>
                      <p className="font-semibold">Pay from Escrow Wallet Balance</p>
                      <p className="text-xs text-ink/55">Use your RentED wallet credit (Current Balance: Rs. {userBalance})</p>
                    </div>
                  </label>

                  <label className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${form.paymentMethod === "cod" ? "border-accent bg-accent/5" : "border-ink/10"}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={form.paymentMethod === "cod"}
                      onChange={() => setForm({ ...form, paymentMethod: "cod" })}
                      className="h-4 w-4 accent-accent"
                    />
                    <div>
                      <p className="font-semibold">Cash on Delivery (COD)</p>
                      <p className="text-xs text-ink/55">Pay locally in cash when you receive the item</p>
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <div className="panel sticky top-6 space-y-6 p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Package className="h-5 w-5 text-accent" />
              Order Summary
            </h2>

            <div className="flex gap-4">
              <img
                src={item.image || "https://placehold.co/150x150?text=Item"}
                alt={item.title}
                className="h-16 w-16 rounded-xl object-cover"
              />
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-ink/55">{item.category}</p>
              </div>
            </div>

            <div className="space-y-3 divide-y divide-ink/10 border-t border-ink/10 pt-4 text-sm">
              {requestType === "rental" ? (
                <>
                  <div className="flex justify-between py-2">
                    <span className="text-ink/60">Duration</span>
                    <span className="font-medium">{getDays()} days</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-ink/60">Rate</span>
                    <span className="font-medium">Rs. {rentalPrice} / day</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between py-2">
                  <span className="text-ink/60">{isRoom ? "Partner Amount" : "Price"}</span>
                  <span className="font-medium">Rs. {salePrice}</span>
                </div>
              )}

              {/* Coupon Form Area */}
              <div className="py-3">
                <span className="text-xs font-black uppercase text-ink/50 block mb-2">Apply Coupon / Promo Code</span>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold animate-fadeIn">
                    <div className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{appliedCoupon.code} Applied</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-emerald-700 hover:text-emerald-950 font-black underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. SAVE20"
                        className="input py-1.5 px-3 text-xs uppercase"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                        disabled={couponLoading}
                      />
                      <Button
                        type="submit"
                        variant="secondary"
                        className="text-xs py-1.5 px-4 font-bold uppercase shrink-0"
                        disabled={couponLoading}
                      >
                        {couponLoading ? "..." : "Apply"}
                      </Button>
                    </form>
                    {couponError && <p className="text-xs text-red-500 font-semibold mt-1">{couponError}</p>}
                  </div>
                )}
              </div>

              {appliedCoupon && (
                <div className="flex justify-between py-2 text-emerald-700 font-bold">
                  <span>Coupon Discount ({appliedCoupon.code})</span>
                  <span>- Rs. {appliedCoupon.discountAmount}</span>
                </div>
              )}

              <div className="flex justify-between pt-4 text-lg font-bold">
                <span>Total Payable</span>
                <span className="text-accent">Rs. {finalPayableAmount}</span>
              </div>

              <div className="pt-4 border-t border-ink/10 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink/60">RentEd Wallet Balance</span>
                  <span className={`font-bold ${userBalance >= finalPayableAmount ? "text-indigo-700" : "text-red-500"}`}>
                    Rs. {userBalance}
                  </span>
                </div>
                {form.paymentMethod === "wallet" && userBalance < finalPayableAmount && (
                  <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-600 font-medium leading-relaxed">
                    ⚠️ Insufficient wallet balance for checkout. Please select Razorpay Secure Payment or Cash on Delivery (COD).
                  </div>
                )}
              </div>
            </div>

            {feedback && <p className="text-center text-sm font-medium text-red-500">{feedback}</p>}

            <Button
              type="button"
              variant="primary"
              className="w-full py-3 text-lg"
              onClick={handlePlaceOrder}
              disabled={
                isProcessing ||
                (form.paymentMethod === "wallet" && userBalance < finalPayableAmount)
              }
            >
              {isProcessing
                ? "Processing..."
                : form.paymentMethod === "online" && !isOnlinePaid
                ? `Pay via Razorpay Secure Payment • Rs. ${finalPayableAmount}`
                : form.paymentMethod === "wallet" && userBalance < finalPayableAmount
                ? "Insufficient Wallet Balance"
                : `Place Order • Rs. ${finalPayableAmount}`}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Razorpay Mock QR Payment Modal ── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-gradient-to-b from-[#0c1f2b] to-[#07151e] p-6 text-white shadow-2xl text-center">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
                <span className="text-sm font-bold uppercase tracking-wider text-accent">Razorpay Secure Payment</span>
              </div>
              <button 
                type="button"
                onClick={() => setShowQrModal(false)}
                className="text-white/40 hover:text-white transition text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* QR Content */}
            <div className="space-y-4">
              <p className="text-sm text-white/70">
                Scan the QR code below using any UPI App (GPay, PhonePe, Paytm, BHIM) to make a secure payment of
              </p>
              <p className="text-3xl font-black text-accent">Rs. {finalPayableAmount}</p>

              {/* QR frame */}
              <div className="relative mx-auto flex h-52 w-52 items-center justify-center rounded-2xl border border-white/10 bg-white p-3 shadow-lg">
                {/* Scanner guides */}
                <div className="absolute top-2 left-2 h-4 w-4 border-t-2 border-l-2 border-accent" />
                <div className="absolute top-2 right-2 h-4 w-4 border-t-2 border-r-2 border-accent" />
                <div className="absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-accent" />
                <div className="absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-accent" />
                
                {/* Auto-generated QR server link containing UPI details */}
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=rented@rzp%26pn=RentEd%26am=${finalPayableAmount}%26cu=INR`}
                  alt="Payment QR Code"
                  className="h-full w-full"
                />
              </div>

              {/* Supported apps */}
              <div className="flex items-center justify-center gap-4 py-2.5 border-y border-white/5 my-4">
                <span className="text-[10px] font-bold tracking-wider text-white/40 uppercase">UPI Apps:</span>
                <div className="flex items-center gap-3 opacity-70">
                  <span className="text-xs font-black text-blue-400">GPay</span>
                  <span className="text-xs font-black text-violet-400">PhonePe</span>
                  <span className="text-xs font-black text-cyan-400">Paytm</span>
                  <span className="text-xs font-black text-white/80">BHIM</span>
                </div>
              </div>

              {/* Action Simulation */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const mockTx = "pay_rzp_mock_" + Math.random().toString(36).substring(7);
                    setOnlinePayRef(mockTx);
                    setIsOnlinePaid(true);
                    setShowQrModal(false);
                    setFeedback("");
                  }}
                  className="w-full rounded-2xl bg-accent py-3.5 text-sm font-bold text-white hover:bg-orange-500 hover:scale-[1.02] active:scale-[0.98] transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-accent/25"
                >
                  <ShieldCheck className="h-5 w-5" />
                  Simulate Payment Successful
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="block w-full text-center text-xs text-white/40 hover:text-white underline transition pt-1"
                >
                  Cancel & Return
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default CheckoutPage;
