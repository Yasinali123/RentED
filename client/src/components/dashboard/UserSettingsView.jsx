import { useState, useEffect } from "react";
import {
  User,
  Lock,
  Bell,
  MapPin,
  CreditCard,
  GraduationCap,
  Palette,
  Bookmark,
  Truck,
  Calendar,
  Star,
  ShieldCheck,
  Globe,
  HelpCircle,
  FileText,
  LogOut,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Smartphone
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { authApi, paymentApi, settingsApi, getErrorMessage } from "../../api/client";
import Button from "../ui/Button";

function UserSettingsView({ onRefresh }) {
  const { user, setUser, logout } = useAuth();
  const [activeSection, setActiveSection] = useState("account");
  const [commissionRate, setCommissionRate] = useState(10);

  useEffect(() => {
    const fetchCommission = async () => {
      try {
        const settings = await settingsApi.get();
        if (settings && typeof settings.commission_rate === "number") {
          setCommissionRate(settings.commission_rate);
        }
      } catch (error) {
        console.error("Failed to load platform commission rate:", error);
      }
    };
    fetchCommission();
  }, []);

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    username: user?.username || "",
    bio: user?.bio || "",
    email: user?.email || "",
    phone: user?.phone || "9876543210",
    collegeName: user?.collegeName || "",
    course: user?.course || "",
    studentId: user?.studentId || user?.collegeId || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [notifications, setNotifications] = useState({
    orderUpdates: user?.notifications?.orderUpdates ?? true,
    deliveryUpdates: user?.notifications?.deliveryUpdates ?? true,
    rentalDue: user?.notifications?.rentalDue ?? true,
    returnReminder: user?.notifications?.returnReminder ?? true,
    messages: user?.notifications?.messages ?? true,
    promotions: user?.notifications?.promotions ?? false,
    pgUpdates: user?.notifications?.pgUpdates ?? true,
    priceDrops: user?.notifications?.priceDrops ?? true,
    newListingsNearMe: user?.notifications?.newListingsNearMe ?? true,
    emailNotifications: user?.notifications?.emailNotifications ?? true,
    pushNotifications: user?.notifications?.pushNotifications ?? true,
    smsNotifications: user?.notifications?.smsNotifications ?? false,
  });

  const [locationForm, setLocationForm] = useState({
    country: user?.country || "India",
    state: user?.state || "",
    city: user?.city || "",
    college: user?.collegeName || "",
    preferredDistance: user?.preferredDistance || "Same City",
  });

  const [academicForm, setAcademicForm] = useState({
    institutionType: user?.institutionType || "Engineering",
    course: user?.academicProfile?.course || user?.course || "",
    department: user?.academicProfile?.department || "",
    semester: user?.academicProfile?.semester || "1",
  });

  const [deliveryPreferences, setDeliveryPreferences] = useState({
    defaultPickupLocation: user?.deliveryPreferences?.defaultPickupLocation || "",
    hostelAddress: user?.deliveryPreferences?.hostelAddress || "",
    homeAddress: user?.deliveryPreferences?.homeAddress || "",
    preferredDeliveryTime: user?.deliveryPreferences?.preferredDeliveryTime || "Anytime",
  });

  const [rentalPreferences, setRentalPreferences] = useState({
    preferredDuration: user?.rentalPreferences?.preferredDuration || "1 Month",
    autoReturnReminder: user?.rentalPreferences?.autoReturnReminder ?? true,
    autoRenew: user?.rentalPreferences?.autoRenew ?? false,
  });

  const [marketplacePreferences, setMarketplacePreferences] = useState({
    showSameCollegeFirst: user?.marketplacePreferences?.showSameCollegeFirst ?? true,
    showSameCity: user?.marketplacePreferences?.showSameCity ?? true,
    showNearbyColleges: user?.marketplacePreferences?.showNearbyColleges ?? true,
    showAllIndia: user?.marketplacePreferences?.showAllIndia ?? false,
  });

  // Security Toggles
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);

  // Payments additions
  const [walletAmount, setWalletAmount] = useState("");
  const [withdrawAmount, setWalletWithdraw] = useState("");
  const [savedUpi, setSavedUpi] = useState("rohan@upi");
  const [savedCard, setSavedCard] = useState("**** **** **** 4562");

  // Appearance
  const [appearance, setAppearance] = useState({
    theme: user?.appearance?.theme || "system",
    language: user?.appearance?.language || "en",
    fontSize: user?.appearance?.fontSize || "medium",
  });

  // Support state
  const [supportMessage, setSupportMessage] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setFeedbackMsg("");
    setErrorMsg("");
    try {
      const res = await authApi.updateProfile(profileForm);
      setUser(res.user);
      setFeedbackMsg("Account settings saved successfully!");
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setFeedbackMsg("");
    setErrorMsg("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMsg("New passwords do not match");
      return;
    }
    try {
      await authApi.updateProfile({ password: passwordForm.newPassword });
      setFeedbackMsg("Password updated successfully!");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    }
  };

  const handlePreferencesSave = async (payload) => {
    setFeedbackMsg("");
    setErrorMsg("");
    try {
      const res = await authApi.updateProfile(payload);
      setUser(res.user);
      setFeedbackMsg("Preferences updated successfully!");
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    }
  };

  const handleAddFunds = async (e) => {
    e.preventDefault();
    setFeedbackMsg("");
    setErrorMsg("");
    const amount = Number(walletAmount);
    if (!amount || amount <= 0) {
      setErrorMsg("Please enter a valid deposit amount");
      return;
    }
    try {
      setFeedbackMsg("Initiating deposit transaction...");
      // 1. Create order intent on backend
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

        setUser({ ...user, balance: verification.balance });
        setWalletAmount("");
        setFeedbackMsg(`Successfully loaded Rs. ${amount} into your wallet (Sandbox)!`);
        if (onRefresh) onRefresh();
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
              setFeedbackMsg("Verifying deposit transaction...");
              const verification = await paymentApi.verify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount,
                type: "wallet",
              });

              setUser({ ...user, balance: verification.balance });
              setWalletAmount("");
              setFeedbackMsg(`Successfully loaded Rs. ${amount} into your wallet!`);
              if (onRefresh) onRefresh();
            } catch (err) {
              setErrorMsg(getErrorMessage(err));
              setFeedbackMsg("");
            }
          },
          prefill: {
            name: user?.name || "",
            email: user?.email || "",
          },
          theme: {
            color: "#4f46e5",
          },
          modal: {
            ondismiss: function () {
              setFeedbackMsg("");
              setErrorMsg("Deposit cancelled.");
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
      setFeedbackMsg("");
    }
  };

  const handleWithdrawFunds = (e) => {
    e.preventDefault();
    setFeedbackMsg("");
    setErrorMsg("");
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0 || amount > user.balance) {
      setErrorMsg("Invalid withdrawal amount or insufficient balance");
      return;
    }
    setUser({ ...user, balance: user.balance - amount });
    setWalletWithdraw("");
    setFeedbackMsg(`Withdrawal request of Rs. ${amount} initiated! Funds will settle to your saved UPI in 2 hours.`);
  };

  const handleSupportSubmit = (e) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    alert(`Support request submitted: "${supportMessage}"`);
    setSupportMessage("");
  };

  const handleToggle2FA = async () => {
    const nextVal = !twoFactorEnabled;
    setTwoFactorEnabled(nextVal);
    await handlePreferencesSave({ twoFactorEnabled: nextVal });
  };

  // Sidebar config
  const sidebarItems = [
    { id: "account", label: "Account Settings", icon: User },
    { id: "privacy", label: "Privacy & Security", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "location", label: "Location Preferences", icon: MapPin },
    { id: "payments", label: "Payments & Wallet", icon: CreditCard },
    { id: "academic", label: "Academic Profile", icon: GraduationCap },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "wishlist", label: "Wishlist & Saved", icon: Bookmark },
    { id: "delivery", label: "Delivery Preferences", icon: Truck },
    { id: "rental", label: "Rental Preferences", icon: Calendar },
    { id: "reviews", label: "Reviews & Ratings", icon: Star },
    { id: "verification", label: "Verification Status", icon: ShieldCheck },
    { id: "marketplace", label: "Marketplace Preferences", icon: Globe },
    { id: "support", label: "Help & Support", icon: HelpCircle },
    { id: "legal", label: "Legal", icon: FileText },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start min-h-[550px]">
      {/* Left Sidebar Navigation */}
      <aside className="w-full lg:w-64 shrink-0 bg-white border border-ink/5 rounded-3xl p-4 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible shadow-sm">
        <div className="hidden lg:block px-3 py-2 text-xs font-black uppercase text-accent tracking-widest border-b border-ink/5 mb-2">
          ⚙️ User Settings
        </div>
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                setFeedbackMsg("");
                setErrorMsg("");
              }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-black tracking-wider uppercase transition-all whitespace-nowrap lg:whitespace-normal w-full justify-start ${
                activeSection === item.id
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

      {/* Right Workstation Panel */}
      <div className="flex-1 w-full min-w-0 panel p-6 bg-white border border-ink/5 rounded-3xl min-h-[450px]">
        {/* Dynamic Alerts */}
        {feedbackMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {feedbackMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {errorMsg}
          </div>
        )}

        {/* 1. Account Settings */}
        {activeSection === "account" && (
          <form onSubmit={handleProfileSave} className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink uppercase tracking-wide">👤 Account Settings</h2>
              <p className="text-xs text-ink/40">Edit public info, institutional associations, and manage profile credentials.</p>
            </div>

            {/* Profile Avatar Control */}
            <div className="flex items-center gap-4 border-b border-ink/5 pb-5">
              <img
                src={profileForm.avatarUrl || user?.avatarUrl || "https://placehold.co/100x100?text=Avatar"}
                alt="Avatar"
                className="h-16 w-16 object-cover rounded-2xl border border-ink/10"
              />
              <div>
                <label className="text-xs font-black uppercase text-ink/65 block">Profile Picture URL</label>
                <input
                  className="input mt-1.5 py-1 px-3 text-xs w-72"
                  value={profileForm.avatarUrl}
                  placeholder="https://example.com/avatar.jpg"
                  onChange={(e) => setProfileForm({ ...profileForm, avatarUrl: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50 block">Full Name</label>
                <input
                  className="input"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50 block">Username</label>
                <input
                  className="input"
                  value={profileForm.username}
                  placeholder="@username"
                  onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-black uppercase text-ink/50 block">Bio</label>
                <textarea
                  className="input min-h-16 text-xs"
                  value={profileForm.bio}
                  placeholder="Tell students about yourself, what you rent/sell, or department highlights..."
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50 block">Email Address</label>
                <input
                  type="email"
                  className="input bg-canvas/30 text-ink/50 border-ink/5 cursor-not-allowed"
                  value={profileForm.email}
                  disabled
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50 block">Phone Number</label>
                <input
                  className="input"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50 block">College Name</label>
                <input
                  className="input"
                  value={profileForm.collegeName}
                  onChange={(e) => setProfileForm({ ...profileForm, collegeName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50 block">Course / Degree</label>
                <input
                  className="input"
                  value={profileForm.course}
                  placeholder="e.g. B.Tech Computer Science"
                  onChange={(e) => setProfileForm({ ...profileForm, course: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50 block">Student College ID</label>
                <input
                  className="input bg-canvas/30 text-ink/50 border-ink/5 cursor-not-allowed"
                  value={profileForm.studentId}
                  disabled
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50 block">College Verification Status</label>
                <div className="py-2.5 px-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 mt-1">
                  ✅ Verified Institutional Profile
                </div>
              </div>
            </div>

            <Button type="submit" variant="secondary" className="text-xs py-2 px-6 rounded-full font-bold">
              Save Account Profile
            </Button>
          </form>
        )}

        {/* 2. Privacy & Security */}
        {activeSection === "privacy" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink uppercase tracking-wide">🔐 Privacy & Security</h2>
              <p className="text-xs text-ink/40">Manage account passwords, sessions, login activity, and multi-factor verification.</p>
            </div>

            {/* Change Password Block */}
            <form onSubmit={handlePasswordChange} className="p-4 border border-ink/5 bg-canvas/20 rounded-2xl space-y-4">
              <h3 className="text-xs font-black text-ink uppercase tracking-wider">Change Password</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-ink/50 uppercase">Current Password</label>
                  <input
                    type="password"
                    className="input py-2 text-xs"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-ink/50 uppercase">New Password</label>
                  <input
                    type="password"
                    className="input py-2 text-xs"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-ink/50 uppercase">Confirm New Password</label>
                  <input
                    type="password"
                    className="input py-2 text-xs"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" variant="ghost" className="text-xs py-1.5 px-4 font-bold border border-ink/10 rounded-full">
                Apply New Password
              </Button>
            </form>

            {/* 2FA Option */}
            <div className="p-4 border border-ink/5 bg-canvas/20 rounded-2xl flex items-center justify-between">
              <div className="space-y-1 max-w-[70%]">
                <h3 className="text-xs font-black text-ink uppercase tracking-wider">Two-Factor Authentication (2FA)</h3>
                <p className="text-[10px] text-ink/50 leading-relaxed">Secure your student account with an email validation pin prompt upon login from unverified devices.</p>
              </div>
              <button
                onClick={handleToggle2FA}
                className={`px-4 py-1.5 rounded-full text-xs font-black border uppercase tracking-wider ${
                  twoFactorEnabled
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-ink/5 text-ink/50 border-ink/10"
                }`}
              >
                {twoFactorEnabled ? "2FA Enabled" : "2FA Disabled"}
              </button>
            </div>

            {/* Mobile Biometrics mock */}
            <div className="p-4 border border-ink/5 bg-canvas/20 rounded-2xl flex items-center justify-between">
              <div className="space-y-1 max-w-[70%]">
                <h3 className="text-xs font-black text-ink uppercase tracking-wider flex items-center gap-1"><Smartphone className="h-4 w-4" /> Face ID / Fingerprint (Mobile)</h3>
                <p className="text-[10px] text-ink/50 leading-relaxed">Enable biometric authentication bypass on RentED mobile packages.</p>
              </div>
              <span className="text-[9px] uppercase tracking-wider font-black px-2 py-0.5 bg-ink/5 text-ink/40 rounded">Supported on Mobile</span>
            </div>

            {/* Active Sessions Audit list */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-ink uppercase tracking-wider">Active Login Sessions</h3>
              <div className="divide-y divide-ink/5 border border-ink/5 rounded-2xl p-4 bg-white space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-ink">Windows PC • Chrome Web Browser</p>
                    <p className="text-[9px] text-ink/40">Ahmedabad, Gujarat (Current Session)</p>
                  </div>
                  <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Active</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-3">
                  <div>
                    <p className="font-bold text-ink">Android Phone • RentED Mobile Native</p>
                    <p className="text-[9px] text-ink/40">Last activity: 2 hours ago</p>
                  </div>
                  <button
                    onClick={() => alert("Logged out session successfully")}
                    className="text-[9px] font-black uppercase text-red-600 hover:bg-red-50 border border-red-100 px-2 py-0.5 rounded"
                  >
                    Revoke
                  </button>
                </div>
              </div>
              <button
                onClick={() => alert("Logged out from all other devices")}
                className="text-xs text-red-600 font-bold hover:underline"
              >
                Logout from All Devices
              </button>
            </div>
          </div>
        )}

        {/* 3. Notification Settings */}
        {activeSection === "notifications" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink uppercase tracking-wide">🔔 Notification Settings</h2>
              <p className="text-xs text-ink/40">Toggle what email, push, and SMS notifications you receive.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 border border-ink/5 bg-canvas/10 rounded-2xl space-y-4">
                <h3 className="text-xs font-black text-accent uppercase tracking-wider">Rental & Logistics Alerts</h3>
                <div className="space-y-3 text-xs text-ink/75 font-semibold">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-accent h-4 w-4"
                      checked={notifications.orderUpdates}
                      onChange={(e) => {
                        const updated = { ...notifications, orderUpdates: e.target.checked };
                        setNotifications(updated);
                        handlePreferencesSave({ notifications: updated });
                      }}
                    />
                    <span>New Order Updates</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-accent h-4 w-4"
                      checked={notifications.deliveryUpdates}
                      onChange={(e) => {
                        const updated = { ...notifications, deliveryUpdates: e.target.checked };
                        setNotifications(updated);
                        handlePreferencesSave({ notifications: updated });
                      }}
                    />
                    <span>Delivery Updates</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-accent h-4 w-4"
                      checked={notifications.rentalDue}
                      onChange={(e) => {
                        const updated = { ...notifications, rentalDue: e.target.checked };
                        setNotifications(updated);
                        handlePreferencesSave({ notifications: updated });
                      }}
                    />
                    <span>Rental Due Reminders</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-accent h-4 w-4"
                      checked={notifications.returnReminder}
                      onChange={(e) => {
                        const updated = { ...notifications, returnReminder: e.target.checked };
                        setNotifications(updated);
                        handlePreferencesSave({ notifications: updated });
                      }}
                    />
                    <span>Return Reminders</span>
                  </label>
                </div>
              </div>

              <div className="p-4 border border-ink/5 bg-canvas/10 rounded-2xl space-y-4">
                <h3 className="text-xs font-black text-accent uppercase tracking-wider">Social & Discovery Alerts</h3>
                <div className="space-y-3 text-xs text-ink/75 font-semibold">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-accent h-4 w-4"
                      checked={notifications.messages}
                      onChange={(e) => {
                        const updated = { ...notifications, messages: e.target.checked };
                        setNotifications(updated);
                        handlePreferencesSave({ notifications: updated });
                      }}
                    />
                    <span>Direct Messages & Chats</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-accent h-4 w-4"
                      checked={notifications.promotions}
                      onChange={(e) => {
                        const updated = { ...notifications, promotions: e.target.checked };
                        setNotifications(updated);
                        handlePreferencesSave({ notifications: updated });
                      }}
                    />
                    <span>Promotional Deals</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-accent h-4 w-4"
                      checked={notifications.priceDrops}
                      onChange={(e) => {
                        const updated = { ...notifications, priceDrops: e.target.checked };
                        setNotifications(updated);
                        handlePreferencesSave({ notifications: updated });
                      }}
                    />
                    <span>Price Drop Alerts</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-accent h-4 w-4"
                      checked={notifications.newListingsNearMe}
                      onChange={(e) => {
                        const updated = { ...notifications, newListingsNearMe: e.target.checked };
                        setNotifications(updated);
                        handlePreferencesSave({ notifications: updated });
                      }}
                    />
                    <span>New Listings Near Me</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-accent h-4 w-4"
                      checked={notifications.pgUpdates}
                      onChange={(e) => {
                        const updated = { ...notifications, pgUpdates: e.target.checked };
                        setNotifications(updated);
                        handlePreferencesSave({ notifications: updated });
                      }}
                    />
                    <span>PG Listings Updates</span>
                  </label>
                </div>
              </div>

              <div className="p-4 border border-ink/5 bg-canvas/10 rounded-2xl space-y-4 sm:col-span-2">
                <h3 className="text-xs font-black text-accent uppercase tracking-wider">Notification Channels</h3>
                <div className="grid gap-3 sm:grid-cols-3 text-xs text-ink/75 font-semibold">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-accent h-4 w-4"
                      checked={notifications.emailNotifications}
                      onChange={(e) => {
                        const updated = { ...notifications, emailNotifications: e.target.checked };
                        setNotifications(updated);
                        handlePreferencesSave({ notifications: updated });
                      }}
                    />
                    <span>Email Delivery</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-accent h-4 w-4"
                      checked={notifications.pushNotifications}
                      onChange={(e) => {
                        const updated = { ...notifications, pushNotifications: e.target.checked };
                        setNotifications(updated);
                        handlePreferencesSave({ notifications: updated });
                      }}
                    />
                    <span>Push Notifications</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-ink/40">
                    <input
                      type="checkbox"
                      className="accent-accent h-4 w-4"
                      checked={notifications.smsNotifications}
                      onChange={(e) => {
                        const updated = { ...notifications, smsNotifications: e.target.checked };
                        setNotifications(updated);
                        handlePreferencesSave({ notifications: updated });
                      }}
                    />
                    <span>SMS Alerts (Future release)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Location Preferences */}
        {activeSection === "location" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink uppercase tracking-wide">📍 Location Preferences</h2>
              <p className="text-xs text-ink/40">Customize your search radius, campus location, and hometown details.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50">Country</label>
                <input
                  className="input"
                  value={locationForm.country}
                  onChange={(e) => setLocationForm({ ...locationForm, country: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50">State</label>
                <input
                  className="input"
                  value={locationForm.state}
                  placeholder="e.g. Gujarat"
                  onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50">City</label>
                <input
                  className="input"
                  value={locationForm.city}
                  placeholder="e.g. Ahmedabad"
                  onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50">Preferred College Hub</label>
                <input
                  className="input bg-canvas/30 text-ink/50 border-ink/5 cursor-not-allowed"
                  value={locationForm.college}
                  disabled
                />
              </div>

              {/* Preferred Distance Radios */}
              <div className="p-4 border border-ink/5 bg-canvas/10 rounded-2xl sm:col-span-2 space-y-3">
                <h3 className="text-xs font-black text-accent uppercase tracking-wider">Search Proximity Radius</h3>
                <p className="text-[10px] text-ink/50 leading-relaxed mb-2">Filter rental listings by your preferred travel distance range:</p>
                <div className="grid gap-3 sm:grid-cols-5 text-xs text-ink/75 font-semibold">
                  {["My College Only", "Same City", "Within 20 km", "Within 50 km", "Anywhere"].map((dist) => (
                    <label key={dist} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="preferredDistance"
                        className="accent-accent h-4 w-4"
                        checked={locationForm.preferredDistance === dist}
                        onChange={() => {
                          setLocationForm({ ...locationForm, preferredDistance: dist });
                          handlePreferencesSave({ preferredDistance: dist });
                        }}
                      />
                      <span>{dist}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Payment Settings */}
        {activeSection === "payments" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink uppercase tracking-wide">💳 Payments & Wallet</h2>
              <p className="text-xs text-ink/40">Check your sandbox wallet, load mock credits, add payment details, and view transaction history.</p>
            </div>

            {/* Wallet Info row */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="panel p-5 bg-gradient-to-br from-accent to-accent/90 border-none text-white shadow-lg shadow-accent/15">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-85">Available Escrow Balance</p>
                <p className="text-3xl font-black mt-2">Rs. {user?.balance || 0}</p>
                <p className="text-[9px] font-bold opacity-75 mt-2">RentED Sandbox wallet credits</p>
              </div>

              {/* UPI Form */}
              <div className="p-4 border border-ink/5 bg-canvas/10 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-[10px] font-black text-ink/50 uppercase tracking-wider">Saved UPI ID</h3>
                  <input
                    className="input mt-1.5 py-1 px-3 text-xs w-full font-mono font-bold"
                    value={savedUpi}
                    onChange={(e) => setSavedUpi(e.target.value)}
                  />
                </div>
                <span className="text-[9px] text-ink/40 block mt-2">Used for escrow seller payouts</span>
              </div>

              {/* Saved Card */}
              <div className="p-4 border border-ink/5 bg-canvas/10 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-[10px] font-black text-ink/50 uppercase tracking-wider">Default Debit Card</h3>
                  <input
                    className="input mt-1.5 py-1 px-3 text-xs w-full font-mono font-bold"
                    value={savedCard}
                    onChange={(e) => setSavedCard(e.target.value)}
                  />
                </div>
                <span className="text-[9px] text-ink/40 block mt-2">Mock card for instant testing</span>
              </div>
            </div>

            {/* Wallet deposit and withdraw forms */}
            <div className="grid gap-4 sm:grid-cols-2">
              <form onSubmit={handleAddFunds} className="p-4 border border-ink/5 rounded-2xl bg-canvas/10 space-y-3">
                <h3 className="text-xs font-black text-accent uppercase tracking-wider">Load Sandbox Wallet</h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="input text-xs py-1.5 px-3 flex-1"
                    placeholder="Rs. 500, Rs. 1000..."
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                  />
                  <Button type="submit" variant="secondary" className="text-xs py-1.5 px-4 rounded-full font-bold">
                    Add Money
                  </Button>
                </div>
                <p className="text-[10px] text-ink/40">Increments your account credits instantly to test purchases.</p>
              </form>

              {user?.role === "seller" ? (
                <form onSubmit={handleWithdrawFunds} className="p-4 border border-ink/5 rounded-2xl bg-canvas/10 space-y-3">
                  <h3 className="text-xs font-black text-accent uppercase tracking-wider">Withdraw Seller Payout</h3>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="input text-xs py-1.5 px-3 flex-1"
                      placeholder="Rs. 200, Rs. 500..."
                      value={withdrawAmount}
                      onChange={(e) => setWalletWithdraw(e.target.value)}
                    />
                    <Button type="submit" variant="primary" className="text-xs py-1.5 px-4 rounded-full font-bold">
                      Withdraw
                    </Button>
                  </div>
                  <p className="text-[10px] text-ink/40">Settles escrow seller commissions into your saved UPI account.</p>
                </form>
              ) : (
                <div className="p-4 border border-ink/5 rounded-2xl bg-canvas/10 flex items-center justify-center text-center">
                  <p className="text-[11px] text-ink/40 italic">Withdrawal option is only active for Merchant/Seller accounts.</p>
                </div>
              )}
            </div>

            {/* Dummy Transaction/Refund list */}
            <div className="space-y-3 pt-3">
              <h3 className="text-xs font-black text-ink uppercase tracking-wider">Recent Transactions</h3>
              <div className="divide-y divide-ink/5 border border-ink/5 rounded-2xl p-4 bg-white space-y-3 text-xs">
                <div className="flex justify-between items-center py-1">
                  <div>
                    <p className="font-bold text-ink">Load Wallet Balance</p>
                    <p className="text-[9px] text-ink/45">July 07, 2026 • Sandbox Deposit</p>
                  </div>
                  <span className="font-black text-green-700">+ Rs. 1000</span>
                </div>
                <div className="flex justify-between items-center py-2 pt-3">
                  <div>
                    <p className="font-bold text-ink">Order Payout - Calculators Rental</p>
                    <p className="text-[9px] text-ink/45">July 04, 2026 • Released Escrow</p>
                  </div>
                  <span className="font-black text-ink">- Rs. 150</span>
                </div>
                <div className="flex justify-between items-center py-2 pt-3">
                  <div>
                    <p className="font-bold text-ink">Dispute Escrow Refund</p>
                    <p className="text-[9px] text-ink/45">June 29, 2026 • Dispute Resolved Refund</p>
                  </div>
                  <span className="font-black text-green-700">+ Rs. 350</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. Academic Preferences */}
        {activeSection === "academic" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePreferencesSave({ academicProfile: academicForm, course: academicForm.course });
            }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg font-black text-ink uppercase tracking-wide">🎓 Academic Preferences</h2>
              <p className="text-xs text-ink/40">Configure your department, semester, and course to receive tailored local product suggestions.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50">Institution Stream Type</label>
                <select
                  className="bg-canvas border border-ink/10 rounded-xl px-3 py-2 text-xs text-ink/75 outline-none font-bold w-full"
                  value={academicForm.institutionType}
                  onChange={(e) => setAcademicForm({ ...academicForm, institutionType: e.target.value })}
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Medical">Medical</option>
                  <option value="Law">Law</option>
                  <option value="Commerce">Commerce</option>
                  <option value="School">School</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50">Course / Degree</label>
                <input
                  className="input"
                  value={academicForm.course}
                  placeholder="e.g. B.Tech Computer Science"
                  onChange={(e) => setAcademicForm({ ...academicForm, course: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50">Department Name</label>
                <input
                  className="input"
                  value={academicForm.department}
                  placeholder="e.g. IT, Mechanical, Civil"
                  onChange={(e) => setAcademicForm({ ...academicForm, department: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50">Semester / Year</label>
                <select
                  className="bg-canvas border border-ink/10 rounded-xl px-3 py-2 text-xs text-ink/75 outline-none font-bold w-full"
                  value={academicForm.semester}
                  onChange={(e) => setAcademicForm({ ...academicForm, semester: e.target.value })}
                >
                  {["1", "2", "3", "4", "5", "6", "7", "8"].map((sem) => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button type="submit" variant="secondary" className="text-xs py-2 px-6 rounded-full font-bold">
              Save Academic Profile
            </Button>
          </form>
        )}

        {/* 7. Appearance */}
        {activeSection === "appearance" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink uppercase tracking-wide">🎨 Appearance</h2>
              <p className="text-xs text-ink/40">Adjust the visual parameters, interface layout, theme options, and localization language.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 border border-ink/5 bg-canvas/10 rounded-2xl space-y-3">
                <h3 className="text-xs font-black text-accent uppercase tracking-wider">Interface Theme</h3>
                <div className="space-y-2 text-xs font-bold text-ink/70">
                  {["light", "dark", "system"].map((thm) => (
                    <label key={thm} className="flex items-center gap-2 cursor-pointer capitalize">
                      <input
                        type="radio"
                        name="theme"
                        className="accent-accent h-4 w-4"
                        checked={appearance.theme === thm}
                        onChange={() => {
                          const updated = { ...appearance, theme: thm };
                          setAppearance(updated);
                          handlePreferencesSave({ appearance: updated });
                        }}
                      />
                      <span>{thm} Mode</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-4 border border-ink/5 bg-canvas/10 rounded-2xl space-y-3">
                <h3 className="text-xs font-black text-accent uppercase tracking-wider">Localization Language</h3>
                <div className="space-y-2 text-xs font-bold text-ink/70">
                  {[
                    { val: "en", label: "English" },
                    { val: "hi", label: "Hindi (हिन्दी)" },
                    { val: "gu", label: "Gujarati (ગુજરાતી)" }
                  ].map((lang) => (
                    <label key={lang.val} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="language"
                        className="accent-accent h-4 w-4"
                        checked={appearance.language === lang.val}
                        onChange={() => {
                          const updated = { ...appearance, language: lang.val };
                          setAppearance(updated);
                          handlePreferencesSave({ appearance: updated });
                        }}
                      />
                      <span>{lang.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-4 border border-ink/5 bg-canvas/10 rounded-2xl space-y-3">
                <h3 className="text-xs font-black text-accent uppercase tracking-wider">Font Scaling Size</h3>
                <div className="space-y-2 text-xs font-bold text-ink/70">
                  {["small", "medium", "large"].map((sz) => (
                    <label key={sz} className="flex items-center gap-2 cursor-pointer capitalize">
                      <input
                        type="radio"
                        name="fontSize"
                        className="accent-accent h-4 w-4"
                        checked={appearance.fontSize === sz}
                        onChange={() => {
                          const updated = { ...appearance, fontSize: sz };
                          setAppearance(updated);
                          handlePreferencesSave({ appearance: updated });
                        }}
                      />
                      <span>{sz} Size</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 8. Wishlist & Saved Items */}
        {activeSection === "wishlist" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink uppercase tracking-wide">❤️ Wishlist & Saved Items</h2>
              <p className="text-xs text-ink/40">Browse the list of listings, rooms, notes, and searches you bookmarked.</p>
            </div>

            <div className="divide-y divide-ink/5 border border-ink/5 rounded-2xl p-4 bg-white space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <div>
                  <p className="font-bold text-ink">Mechanical Engineering Tools Kit</p>
                  <p className="text-[9px] text-ink/45">Saved Bookmarks • Laboratory Gear</p>
                </div>
                <button
                  onClick={() => alert("Bookmark removed successfully")}
                  className="text-red-500 font-bold hover:underline"
                >
                  Remove
                </button>
              </div>
              <div className="flex justify-between items-center py-2 pt-3">
                <div>
                  <p className="font-bold text-ink">Chemistry Lab Coats and Protective Goggles</p>
                  <p className="text-[9px] text-ink/45">Saved Bookmarks • Lab Essentials</p>
                </div>
                <button
                  onClick={() => alert("Bookmark removed successfully")}
                  className="text-red-500 font-bold hover:underline"
                >
                  Remove
                </button>
              </div>
              <div className="flex justify-between items-center py-2 pt-3">
                <div>
                  <p className="font-bold text-ink">Hostel Room Double Sharing - ADC Campus East</p>
                  <p className="text-[9px] text-ink/45">Saved PG Listings • Accommodation</p>
                </div>
                <button
                  onClick={() => alert("Bookmark removed successfully")}
                  className="text-red-500 font-bold hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 9. Delivery Preferences */}
        {activeSection === "delivery" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePreferencesSave({ deliveryPreferences: deliveryPreferences });
            }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg font-black text-ink uppercase tracking-wide">🚚 Delivery Preferences</h2>
              <p className="text-xs text-ink/40">Configure default dropoff/pickup addresses and preferred delivery schedules.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50">Default Campus Pickup Spot</label>
                <input
                  className="input"
                  placeholder="e.g. Science block main reception lobby"
                  value={deliveryPreferences.defaultPickupLocation}
                  onChange={(e) => setDeliveryPreferences({ ...deliveryPreferences, defaultPickupLocation: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50">Preferred Delivery Window</label>
                <select
                  className="bg-canvas border border-ink/10 rounded-xl px-3 py-2 text-xs text-ink/75 outline-none font-bold w-full"
                  value={deliveryPreferences.preferredDeliveryTime}
                  onChange={(e) => setDeliveryPreferences({ ...deliveryPreferences, preferredDeliveryTime: e.target.value })}
                >
                  <option value="Anytime">Anytime (9:00 AM - 9:00 PM)</option>
                  <option value="Morning">Morning (9:00 AM - 1:00 PM)</option>
                  <option value="Afternoon">Afternoon (1:00 PM - 5:00 PM)</option>
                  <option value="Evening">Evening (5:00 PM - 9:00 PM)</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-black uppercase text-ink/50">Hostel Address / Room Details</label>
                <input
                  className="input"
                  placeholder="e.g. Block C, Girls Hostel Room 204"
                  value={deliveryPreferences.hostelAddress}
                  onChange={(e) => setDeliveryPreferences({ ...deliveryPreferences, hostelAddress: e.target.value })}
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-black uppercase text-ink/50">Permanent Home Address</label>
                <textarea
                  className="input min-h-16 text-xs"
                  placeholder="Street address details for deliveries outside college campuses..."
                  value={deliveryPreferences.homeAddress}
                  onChange={(e) => setDeliveryPreferences({ ...deliveryPreferences, homeAddress: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" variant="secondary" className="text-xs py-2 px-6 rounded-full font-bold">
              Save Delivery Preferences
            </Button>
          </form>
        )}

        {/* 10. Rental Preferences */}
        {activeSection === "rental" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePreferencesSave({ rentalPreferences: rentalPreferences });
            }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg font-black text-ink uppercase tracking-wide">📦 Rental Preferences</h2>
              <p className="text-xs text-ink/40">Adjust defaults for rental renewals, return dispatch warnings, and timelines.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/50">Default Rental Duration</label>
                <select
                  className="bg-canvas border border-ink/10 rounded-xl px-3 py-2 text-xs text-ink/75 outline-none font-bold w-full"
                  value={rentalPreferences.preferredDuration}
                  onChange={(e) => setRentalPreferences({ ...rentalPreferences, preferredDuration: e.target.value })}
                >
                  <option value="1 Week">1 Week</option>
                  <option value="2 Weeks">2 Weeks</option>
                  <option value="1 Month">1 Month</option>
                  <option value="3 Months">3 Months</option>
                  <option value="1 Semester">1 Semester (6 Months)</option>
                </select>
              </div>

              <div className="p-4 border border-ink/5 bg-canvas/10 rounded-2xl sm:col-span-2 space-y-3">
                <h3 className="text-xs font-black text-accent uppercase tracking-wider">Automations & Reminders</h3>
                <div className="space-y-3 text-xs text-ink/75 font-semibold">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-accent h-4 w-4"
                      checked={rentalPreferences.autoReturnReminder}
                      onChange={(e) => setRentalPreferences({ ...rentalPreferences, autoReturnReminder: e.target.checked })}
                    />
                    <span>Auto Return Reminder (24 hours before expiration)</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-accent h-4 w-4"
                      checked={rentalPreferences.autoRenew}
                      onChange={(e) => setRentalPreferences({ ...rentalPreferences, autoRenew: e.target.checked })}
                    />
                    <span>Auto Renew Rentals (If seller extends authorization)</span>
                  </label>
                </div>
              </div>
            </div>

            <Button type="submit" variant="secondary" className="text-xs py-2 px-6 rounded-full font-bold">
              Save Rental Preferences
            </Button>
          </form>
        )}

        {/* 11. Reviews & Ratings */}
        {activeSection === "reviews" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink uppercase tracking-wide">⭐ Reviews & Ratings</h2>
              <p className="text-xs text-ink/40">Browse dispatcher reviews, merchant ratings, and student feedback log histories.</p>
            </div>

            {/* Ratings Overview banner */}
            <div className="p-5 bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-3xl flex items-center justify-between max-w-sm">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-ink/45">Average User Rating</p>
                <p className="text-3xl font-black mt-1">⭐ {user?.ratingsAverage || "4.9"}</p>
                <p className="text-[9px] text-ink/40 mt-1">Based on {user?.ratingsCount || 8} verified ratings</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-700">
                <Star className="h-6 w-6" />
              </div>
            </div>

            {/* Mock lists of reviews */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-ink uppercase tracking-wider">Recent Reviews Received</h3>
              <div className="divide-y divide-ink/5 border border-ink/5 rounded-2xl p-4 bg-white space-y-3 text-xs">
                <div className="py-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold">Aiden Mitchell (Seller)</span>
                    <span className="text-[9px] font-mono text-ink/40">July 02, 2026</span>
                  </div>
                  <p className="text-orange-500 font-bold mt-0.5">⭐⭐⭐⭐⭐ 5/5</p>
                  <p className="text-ink/65 mt-1">Returned the laboratory equipment clean and on schedule. Great buyer!</p>
                </div>
                <div className="py-2 pt-3">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold">Mira Sengupta (Renter)</span>
                    <span className="text-[9px] font-mono text-ink/40">June 26, 2026</span>
                  </div>
                  <p className="text-orange-500 font-bold mt-0.5">⭐⭐⭐⭐⭐ 5/5</p>
                  <p className="text-ink/65 mt-1">Super responsive. Renting calculators was fast and hassle-free.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 12. Verification Status */}
        {activeSection === "verification" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink uppercase tracking-wide">🛡️ Institutional Verification</h2>
              <p className="text-xs text-ink/40">Check your verified status badges and upload updated college proof documents.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-4 border border-ink/5 bg-canvas/10 rounded-2xl space-y-4">
                <h3 className="text-xs font-black text-accent uppercase tracking-wider">Verification badges</h3>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 border border-green-200 py-1.5 px-3 rounded-xl">
                    <span>✅ College Network Verified</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 border border-green-200 py-1.5 px-3 rounded-xl">
                    <span>✅ Email Verified ({user?.email})</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 border border-green-200 py-1.5 px-3 rounded-xl">
                    <span>✅ Phone Verified</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 py-1.5 px-3 rounded-xl">
                    <span>🟡 Student ID Card Verification: Pending Review</span>
                  </div>
                </div>
              </div>

              {/* Upload ID form */}
              <div className="p-4 border border-ink/5 bg-canvas/10 rounded-2xl space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-accent uppercase tracking-wider">Re-upload Student ID Card</h3>
                  <p className="text-[10px] text-ink/50 mt-1">Provide clear photo scans of college network tags or physical smartcards to verify listings availability.</p>
                </div>
                <div className="pt-2">
                  <input type="file" className="text-xs" onChange={() => alert("Student ID scanned and queued for review successfully!")} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 13. Marketplace Preferences */}
        {activeSection === "marketplace" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePreferencesSave({ marketplacePreferences: marketplacePreferences });
            }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg font-black text-ink uppercase tracking-wide">🌐 Marketplace Preferences</h2>
              <p className="text-xs text-ink/40">Adjust RentED's hyperlocal filters to personalize listing rankings.</p>
            </div>

            <div className="p-5 border border-ink/5 bg-canvas/10 rounded-3xl space-y-4">
              <h3 className="text-xs font-black text-accent uppercase tracking-wider">Hyperlocal visibility filters</h3>
              <div className="flex flex-col gap-3 text-xs text-ink/75 font-bold">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-accent h-4 w-4"
                    checked={marketplacePreferences.showSameCollegeFirst}
                    onChange={(e) => setMarketplacePreferences({ ...marketplacePreferences, showSameCollegeFirst: e.target.checked })}
                  />
                  <span>Show Same College Listings First</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-accent h-4 w-4"
                    checked={marketplacePreferences.showSameCity}
                    onChange={(e) => setMarketplacePreferences({ ...marketplacePreferences, showSameCity: e.target.checked })}
                  />
                  <span>Show Same City Listings First</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-accent h-4 w-4"
                    checked={marketplacePreferences.showNearbyColleges}
                    onChange={(e) => setMarketplacePreferences({ ...marketplacePreferences, showNearbyColleges: e.target.checked })}
                  />
                  <span>Show Nearby Campus Network Listings</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-accent h-4 w-4"
                    checked={marketplacePreferences.showAllIndia}
                    onChange={(e) => setMarketplacePreferences({ ...marketplacePreferences, showAllIndia: e.target.checked })}
                  />
                  <span>Show All India Listings (National shipping courier delivery)</span>
                </label>
              </div>
            </div>

            <Button type="submit" variant="secondary" className="text-xs py-2 px-6 rounded-full font-bold">
              Save Marketplace Preferences
            </Button>
          </form>
        )}

        {/* 14. Support */}
        {activeSection === "support" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink uppercase tracking-wide">🆘 Help & Support</h2>
              <p className="text-xs text-ink/40">File problems, review FAQs, raise transaction disputes, and contact administrator support channels.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <form onSubmit={handleSupportSubmit} className="p-4 border border-ink/5 bg-canvas/10 rounded-2xl space-y-3">
                <h3 className="text-xs font-black text-accent uppercase tracking-wider">Report an Issue</h3>
                <textarea
                  className="input min-h-24 text-xs"
                  placeholder="Detail your problem (e.g. Wallet failed deposit transactions, seller returns refused)..."
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  required
                />
                <Button type="submit" variant="secondary" className="text-[10px] py-1.5 px-4 rounded-full font-bold">
                  Send Issue Report
                </Button>
              </form>

              <div className="p-4 border border-ink/5 bg-canvas/10 rounded-2xl space-y-3">
                <h3 className="text-xs font-black text-accent uppercase tracking-wider">Frequently Asked Questions (FAQs)</h3>
                <div className="space-y-2 text-xs">
                  <details className="cursor-pointer group">
                    <summary className="font-bold text-ink hover:text-accent">How does RentED Escrow work?</summary>
                    <p className="text-[10px] text-ink/50 mt-1 pl-2">RentED holds credits securely in platform escrow and only releases payouts to sellers upon renter confirmations.</p>
                  </details>
                  <details className="cursor-pointer group">
                    <summary className="font-bold text-ink hover:text-accent">What happens if products are damaged?</summary>
                    <p className="text-[10px] text-ink/50 mt-1 pl-2">You can click "Raise Dispute" within your dashboard view to freeze escrow payments while our admin mediates conflicts.</p>
                  </details>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 15. Legal */}
        {activeSection === "legal" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink uppercase tracking-wide">📜 Legal & Policy Statements</h2>
              <p className="text-xs text-ink/40">Read RentED platform rules, escrow terms, and community guidelines.</p>
            </div>

            <div className="divide-y divide-ink/5 border border-ink/5 rounded-2xl p-4 bg-white space-y-4">
              <div>
                <h3 className="text-xs font-bold text-ink uppercase">1. Platform Rental Terms</h3>
                <p className="text-[10px] text-ink/50 mt-1 leading-relaxed">By listing textbooks, smart devices, and hostel spaces, you consent to dispatcher POC routing protocols, OTP completion verifications, and platform commission fee deductions of {commissionRate}%.</p>
              </div>
              <div className="pt-3">
                <h3 className="text-xs font-bold text-ink uppercase">2. Dispute Refund Policy</h3>
                <p className="text-[10px] text-ink/50 mt-1 leading-relaxed">Renter escrow disputes must be filed within 24 hours of delivery receipt. Disputes frozen in escrow will undergo administrator logs evaluation before refunds release.</p>
              </div>
              <div className="pt-3">
                <h3 className="text-xs font-bold text-ink uppercase">3. Community Safety Guidelines</h3>
                <p className="text-[10px] text-ink/50 mt-1 leading-relaxed">RentED enforces local, verified campus communities. Account sharing, fraudulent listings, or refusal of smart verifications will prompt immediate profile suspension.</p>
              </div>
            </div>
          </div>
        )}

        {/* Footing Account Actions (Logout, Delete, etc.) */}
        <div className="border-t border-ink/5 pt-6 mt-6 flex flex-wrap gap-3 items-center justify-between">
          <div className="text-[11px] text-ink/40">
            Account created: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Just Now"}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (window.confirm("Are you sure you want to log out?")) {
                  logout();
                }
              }}
              variant="ghost"
              className="text-xs font-bold text-ink/65 hover:bg-canvas hover:text-ink px-4 py-1.5 border border-ink/10 rounded-full flex items-center gap-1.5"
            >
              <LogOut className="h-4 w-4" /> Logout
            </Button>
            <Button
              onClick={() => {
                if (window.confirm("Deactivate your profile? You will not be able to list items or complete rentals until you reactivate.")) {
                  alert("Profile deactivated. Logging out.");
                  logout();
                }
              }}
              variant="ghost"
              className="text-xs font-bold text-amber-700 hover:bg-amber-50 px-4 py-1.5 border border-amber-200 rounded-full"
            >
              Deactivate Account
            </Button>
            <Button
              onClick={() => {
                if (window.confirm("WARNING: Permanent account deletion is irreversible. Your active listings and escrow transactions history will be lost. Proceed?")) {
                  alert("Account deletion request submitted. Logging out.");
                  logout();
                }
              }}
              variant="ghost"
              className="text-xs font-bold text-red-600 hover:bg-red-50 px-4 py-1.5 border border-red-200 rounded-full flex items-center gap-1.5"
            >
              <Trash2 className="h-4 w-4" /> Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserSettingsView;
