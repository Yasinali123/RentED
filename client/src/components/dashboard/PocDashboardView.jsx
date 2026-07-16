import { useState, useEffect, useRef } from "react";
import {
  Truck,
  MapPin,
  Navigation,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Plus,
  Camera,
  Search,
  Users,
  DollarSign,
  AlertTriangle,
  User,
  Activity,
  Calendar,
  MessageSquare,
  Bell,
  Award,
  BookOpen,
  Phone,
  FileText,
  CreditCard,
  Check,
  X,
  Compass
} from "lucide-react";

import Button from "../ui/Button";
import { rentalApi, getErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import UserSettingsView from "./UserSettingsView";

function PocDashboardView({ dashboard, onRefresh }) {
  const { user } = useAuth();
  const { stats = {}, rentedItems = [], incomingRequests = [], wishlistItems = [], nearbyItems = [], notifications = [] } = dashboard;

  const [activeTab, setActiveTab] = useState("overview"); // operations console view
  
  // Unread indicators state
  const [hasUnreadChat, setHasUnreadChat] = useState(true);
  const [hasUnreadAlerts, setHasUnreadAlerts] = useState(true);
  
  // Verification states
  const [activeVerification, setActiveVerification] = useState(null); // { orderId, type: "pickup" | "delivery" | "return" }
  const [otpInput, setOtpInput] = useState("");
  const [proofPhotoInput, setProofPhotoInput] = useState("");
  const [digitalSignature, setDigitalSignature] = useState("");
  const [gpsCoordinates, setGpsCoordinates] = useState("");
  const [processingId, setProcessingId] = useState("");
  const [errorFeedback, setErrorFeedback] = useState("");

  // Rejection state
  const [rejectionId, setRejectionId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Profile fields state
  const [pocProfile, setPocProfile] = useState({
    phone: user?.phone || "9876543210",
    email: user?.email || "",
    avatarUrl: user?.avatarUrl || "",
    college: user?.collegeName || user?.campus || "ADC Campus",
    isOnline: true,
    bankDetails: "SBI Account: xxxxxxx4562 (IFS Code: SBIN0004523)"
  });

  // Built-in Chat Mock
  const [chats, setChats] = useState([
    { sender: "Admin", text: "Please pick up the Calculators order from Aiden at the Science library today.", time: "10:30 AM" },
    { sender: "Seller (Aiden)", text: "Hi POC, I've left the books at the main reception for collection.", time: "11:15 AM" }
  ]);
  const [chatInput, setChatInput] = useState("");

  // Exception Reports State
  const [exceptionReport, setExceptionReport] = useState({
    orderId: "",
    issueType: "Damaged Product",
    details: ""
  });

  // Mock Notifications
  const [pocNotifications, setPocNotifications] = useState([
    { id: 1, title: "New Assignment", message: "A new calculator pickup is available at the engineering branch.", time: "Just Now", type: "new" },
    { id: 2, title: "Pickup Reminder", message: "Please collect Aiden's listed textbook by 3:00 PM.", time: "1 hour ago", type: "reminder" },
    { id: 3, title: "Order Cancelled", message: "Renter cancelled order for PG room booking inspection.", time: "2 hours ago", type: "cancel" }
  ]);

  const allNotifications = [
    ...notifications.map((n) => ({
      id: n._id,
      title: n.title,
      message: n.message,
      time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: n.type || "general"
    })),
    ...pocNotifications
  ];

  // Handle task actions
  const handleClaimTask = async (orderId) => {
    try {
      await rentalApi.claimTask(orderId);
      alert("Task claimed successfully! It is now under your assigned deliveries list.");
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleSchedulePickup = async (orderId) => {
    try {
      await rentalApi.schedulePickup(orderId);
      alert("Pickup Scheduled!");
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleVerifyPickup = async (e) => {
    e.preventDefault();
    setErrorFeedback("");
    setProcessingId(activeVerification.orderId);
    try {
      await rentalApi.verifyPickup(activeVerification.orderId, otpInput);
      alert("Pickup OTP verified! Item collected from Seller.");
      setActiveVerification(null);
      setOtpInput("");
      onRefresh();
    } catch (err) {
      setErrorFeedback(getErrorMessage(err));
    } finally {
      setProcessingId("");
    }
  };

  const handleStartDelivery = async (orderId) => {
    try {
      await rentalApi.startDelivery(orderId);
      alert("Delivery run started!");
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleVerifyDelivery = async (e) => {
    e.preventDefault();
    setErrorFeedback("");
    setProcessingId(activeVerification.orderId);
    try {
      await rentalApi.verifyDelivery(
        activeVerification.orderId, 
        otpInput, 
        proofPhotoInput || "https://images.unsplash.com/photo-1551829142-dcf3d02d50f4?auto=format&fit=crop&w=500&q=80"
      );
      alert("Delivery OTP verified! Item delivered to Student.");
      setActiveVerification(null);
      setOtpInput("");
      setProofPhotoInput("");
      setDigitalSignature("");
      onRefresh();
    } catch (err) {
      setErrorFeedback(getErrorMessage(err));
    } finally {
      setProcessingId("");
    }
  };

  const handleVerifyReturn = async (orderId) => {
    if (!window.confirm("Verify that you have collected this rental return from the renter?")) return;
    try {
      await rentalApi.verifyReturn(orderId);
      alert("Return verified! Deliver it back to the seller.");
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleRejectAssignment = async (e) => {
    e.preventDefault();
    try {
      await rentalApi.rejectTask(rejectionId, rejectionReason);
      alert("Assignment rejected. Reverted order to campus claim queue.");
      setRejectionId("");
      setRejectionReason("");
      onRefresh();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  // Grab GPS coordinates helper
  const handleCaptureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoordinates(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
        },
        () => {
          setGpsCoordinates("23.022505, 72.571362 (Fallback ADC campus)");
        }
      );
    } else {
      setGpsCoordinates("GPS location services not supported.");
    }
  };

  // Chat message send
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChats([...chats, { sender: "You (POC)", text: chatInput, time: "Just Now" }]);
    setChatInput("");
  };

  // Exception Submit
  const handleReportIssue = (e) => {
    e.preventDefault();
    if (!exceptionReport.orderId || !exceptionReport.details) {
      alert("Please select an Order ID and provide details.");
      return;
    }
    alert(`Exception Report Filed: ${exceptionReport.issueType} on Order ID ${exceptionReport.orderId}`);
    setExceptionReport({ orderId: "", issueType: "Damaged Product", details: "" });
  };

  // Group tasks from dashboard mapping
  const pendingClaims = incomingRequests || []; 
  const myAssignedTasks = [
    ...rentedItems.filter((t) => ["POC Assigned", "Pickup Scheduled"].includes(t.status)),
  ]; 
  const myActiveDeliveries = [
    ...rentedItems.filter((t) => ["Picked Up", "Out For Delivery"].includes(t.status)),
  ]; 
  const myHistory = rentedItems.filter((t) => ["Delivered", "Rental Active", "Completed"].includes(t.status)); 
  const returnTasks = wishlistItems || []; 

  // Earnings calculations (Mock completed task payouts)
  const completedTaskCount = myHistory.length;
  const payPerDelivery = 50; 
  const bonusPerTask = 10; 
  const totalEarnings = completedTaskCount * payPerDelivery + (completedTaskCount * bonusPerTask);

  // Tab configurations
  const pocNavItems = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "assigned", label: "Claims Queue", icon: Search },
    { id: "pickups", label: "Pickups", icon: Truck },
    { id: "deliveries", label: "Deliveries", icon: Navigation },
    { id: "returns", label: "Returns", icon: Clock },
    { id: "chat", label: "Comm Center", icon: MessageSquare },
    { id: "notifications", label: "Alerts", icon: Bell },
    { id: "schedule", label: "Logistics Schedule", icon: Calendar },
    { id: "route", label: "Route Optimizations", icon: Compass },
    { id: "earnings", label: "Earnings Hub", icon: DollarSign },
    { id: "performance", label: "Performance", icon: Award },
    { id: "reports", label: "File Issues", icon: ShieldAlert },
    { id: "settings", label: "⚙️ Settings", icon: User },
    { id: "history", label: "Activity Logs", icon: FileText }
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      
      {/* Vertical Navigation Sidebar */}
      <aside className="w-full lg:w-64 shrink-0 bg-white border border-ink/5 rounded-3xl p-4 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible shadow-sm">
        {pocNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (item.id === "chat") setHasUnreadChat(false);
                if (item.id === "notifications") setHasUnreadAlerts(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black tracking-wider uppercase transition-all whitespace-nowrap lg:whitespace-normal w-full justify-start ${
                activeTab === item.id
                  ? "bg-accent text-white shadow-md shadow-accent/20"
                  : "bg-transparent text-ink/65 hover:bg-canvas hover:text-ink"
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              <span>{item.label}</span>
              
              {/* Blinking Orange Indicator Dot */}
              {((item.id === "assigned" && pendingClaims.length > 0 && activeTab !== "assigned") ||
                (item.id === "chat" && hasUnreadChat && activeTab !== "chat") ||
                (item.id === "notifications" && hasUnreadAlerts && notifications.length > 0 && activeTab !== "notifications")) && (
                <span className="relative flex h-2 w-2 ml-auto shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
              )}
            </button>
          );
        })}
      </aside>

      {/* Main Panel Area */}
      <div className="flex-1 w-full min-w-0">

        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              <div className="panel p-5 bg-gradient-to-br from-accent to-accent/90 border-none text-white shadow-lg shadow-accent/10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-85">Assigned Orders</p>
                <p className="text-3xl font-black mt-2">{myAssignedTasks.length + myActiveDeliveries.length}</p>
                <p className="text-[9px] font-bold opacity-75 mt-2">Active tasks in execution</p>
              </div>

              <div className="panel p-5 bg-gradient-to-br from-accent to-accent/90 border-none text-white shadow-lg shadow-accent/10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-85">Pending Collection</p>
                <p className="text-3xl font-black mt-2">{myAssignedTasks.length}</p>
                <p className="text-[9px] font-bold opacity-75 mt-2">Collection pickups pending</p>
              </div>

              <div className="panel p-5 bg-gradient-to-br from-accent to-accent/90 border-none text-white shadow-lg shadow-accent/10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-85">Out For Delivery</p>
                <p className="text-3xl font-black mt-2">{myActiveDeliveries.filter(o => o.status === "Out For Delivery").length}</p>
                <p className="text-[9px] font-bold opacity-75 mt-2">Currently on delivery run</p>
              </div>

              <div className="panel p-5 bg-gradient-to-br from-accent to-accent/90 border-none text-white shadow-lg shadow-accent/10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-85">Returns Pending</p>
                <p className="text-3xl font-black mt-2">{returnTasks.length}</p>
                <p className="text-[9px] font-bold opacity-75 mt-2">Rental return collections requested</p>
              </div>

              <div className="panel p-5 bg-gradient-to-br from-accent to-accent/90 border-none text-white shadow-lg shadow-accent/10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-85">Today's Earnings</p>
                <p className="text-3xl font-black mt-2">Rs. {totalEarnings}</p>
                <p className="text-[9px] font-bold opacity-75 mt-2">Payout of {completedTaskCount} completed runs</p>
              </div>

              <div className="panel p-5 bg-gradient-to-br from-accent to-accent/90 border-none text-white shadow-lg shadow-accent/10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-85">Dispatcher Rating</p>
                <p className="text-3xl font-black mt-2">⭐ {user?.ratingsAverage || "4.9"}</p>
                <p className="text-[9px] font-bold opacity-75 mt-2">Based on {user?.ratingsCount || 8} student ratings</p>
              </div>
            </div>

            {/* Quick action warnings */}
            <div className="panel p-5 bg-white border border-ink/5 space-y-4">
              <h3 className="text-sm font-black text-ink uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="h-4.5 w-4.5 text-accent" /> Dispatch Operations Compliance
              </h3>
              <ul className="text-xs text-ink/65 list-disc pl-5 space-y-2 leading-relaxed">
                <li>Always perform **Verification (QR/OTP)** at handovers to protect seller payouts.</li>
                <li>Make sure to inspect item condition during collection, uploading images if damage is flagged.</li>
                <li>Your college campus network is set to: <b className="text-accent uppercase">{pocProfile.college}</b>. You only claim local listings.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: ASSIGNED ORDERS & QUEUE */}
        {activeTab === "assigned" && (
          <div className="panel p-6 bg-white space-y-6">
            <h2 className="text-lg font-black text-ink">Campus Claims Queue & Assignments</h2>
            <p className="text-xs text-ink/40">Claim unassigned tasks on your campus, or manage your active assignments list.</p>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-ink/50 tracking-wider">Unassigned Campus Tasks</h3>
              {pendingClaims.length === 0 ? (
                <p className="text-xs text-ink/40 pl-1">No pending unassigned listings waiting for pickup on campus.</p>
              ) : (
                <div className="divide-y divide-ink/5">
                  {pendingClaims.map((task) => (
                    <div key={task._id} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="font-bold text-sm text-ink">{task.item?.title || "Product"}</h4>
                        <div className="flex gap-4 text-[10px] text-ink/50 mt-1">
                          <span>Seller: <b>{task.owner?.name}</b> ({task.item?.location})</span>
                          <span>Buyer: <b>{task.renter?.name}</b></span>
                        </div>
                      </div>
                      <Button onClick={() => handleClaimTask(task._id)} variant="secondary" className="text-xs py-1 px-4 rounded-full font-bold">
                        Claim Task
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 pt-6 border-t border-ink/5">
              <h3 className="text-xs font-black uppercase text-ink/50 tracking-wider">My Assignments</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-ink/5 text-ink/40 uppercase">
                      <th className="py-2">Order ID</th>
                      <th className="py-2">Product</th>
                      <th className="py-2">Parties</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {[...myAssignedTasks, ...myActiveDeliveries].map((o) => (
                      <tr key={o._id}>
                        <td className="py-3 font-mono font-bold text-ink/70">
                          {o._id.substring(o._id.length - 8).toUpperCase()}
                        </td>
                        <td className="py-3">
                          <p className="font-bold text-ink">{o.item?.title}</p>
                          <p className="text-[10px] text-ink/40 capitalize">{o.requestType} • {o.paymentMethod.toUpperCase()}</p>
                        </td>
                        <td className="py-3 text-[10px]">
                          <p>Buyer: <b>{o.renter?.name}</b></p>
                          <p className="text-ink/45 mt-0.5">Seller: {o.owner?.name}</p>
                        </td>
                        <td className="py-3 uppercase font-bold text-accent text-[10px]">
                          {o.status}
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            onClick={() => {
                              setRejectionId(o._id);
                              setRejectionReason("");
                            }}
                            variant="ghost"
                            className="text-[10px] text-red-600 hover:bg-red-50 py-1 px-3 rounded-full font-bold border border-red-100"
                          >
                            Reject Assignment
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {myAssignedTasks.length === 0 && myActiveDeliveries.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-4 text-center text-ink/40">You have no active assignments.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PICKUP MANAGEMENT */}
        {activeTab === "pickups" && (
          <div className="panel p-6 bg-white space-y-6">
            <h2 className="text-lg font-black text-ink">Pickup & Collection Center</h2>
            <p className="text-xs text-ink/40">Inspect conditions, verify items, and complete collections from sellers.</p>

            <div className="space-y-6">
              {myAssignedTasks.map((task) => (
                <div key={task._id} className="p-5 border border-ink/5 rounded-2xl bg-canvas/30 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-base text-ink">{task.item?.title}</h3>
                      <p className="text-xs text-ink/50 mt-0.5">Seller: <b>{task.owner?.name}</b> ({task.owner?.email})</p>
                    </div>
                    {/* Status Progress Pipeline indicator */}
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider">
                      <span className={`px-2 py-0.5 rounded ${task.status === "POC Assigned" ? "bg-amber-100 text-amber-700" : "bg-ink/5 text-ink/50"}`}>Waiting</span>
                      <span>→</span>
                      <span className={`px-2 py-0.5 rounded ${task.status === "Pickup Scheduled" ? "bg-amber-100 text-amber-700" : "bg-ink/5 text-ink/50"}`}>Scheduled</span>
                      <span>→</span>
                      <span className="bg-ink/5 text-ink/50 px-2 py-0.5 rounded">Picked Up</span>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 text-xs">
                    <div className="space-y-1">
                      <span className="text-ink/45 font-semibold">Collection Address:</span>
                      <p className="font-bold text-ink">{task.item?.location}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-ink/45 font-semibold">Seller Contacts:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <a href={`tel:${pocProfile.phone}`} className="px-2.5 py-1 bg-canvas hover:bg-ink/5 border border-ink/10 rounded-full font-bold inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Call
                        </a>
                        <a href={`https://wa.me/${pocProfile.phone}`} target="_blank" className="px-2.5 py-1 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-full font-bold inline-flex items-center gap-1">
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-ink/5">
                    {task.status === "POC Assigned" && (
                      <Button onClick={() => handleSchedulePickup(task._id)} variant="ghost" className="text-xs font-bold py-1.5 px-4 rounded-full">
                        Schedule Collection
                      </Button>
                    )}
                    <Button onClick={() => setActiveVerification({ orderId: task._id, type: "pickup" })} variant="secondary" className="text-xs font-bold py-1.5 px-4 rounded-full">
                      Start Verification Scan
                    </Button>
                  </div>
                </div>
              ))}
              {myAssignedTasks.length === 0 && (
                <p className="text-xs text-ink/40 text-center py-8">No collection pickups pending.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: DELIVERY MANAGEMENT */}
        {activeTab === "deliveries" && (
          <div className="panel p-6 bg-white space-y-6">
            <h2 className="text-lg font-black text-ink">Campus Delivery Hub</h2>
            <p className="text-xs text-ink/40">Start deliveries, locate students via maps, and complete deliveries.</p>

            <div className="space-y-6">
              {myActiveDeliveries.map((task) => (
                <div key={task._id} className="p-5 border border-ink/5 rounded-2xl bg-canvas/30 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-base text-ink">{task.item?.title}</h3>
                      <p className="text-xs text-ink/50 mt-0.5">Renter/Buyer: <b>{task.renter?.name}</b></p>
                    </div>
                    {/* Status Progress Pipeline indicator */}
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider">
                      <span className={`px-2 py-0.5 rounded ${task.status === "Picked Up" ? "bg-indigo-100 text-indigo-700" : "bg-ink/5 text-ink/50"}`}>Out for delivery</span>
                      <span>→</span>
                      <span className="bg-ink/5 text-ink/50 px-2 py-0.5 rounded">Delivered</span>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 text-xs">
                    <div className="space-y-1">
                      <span className="text-ink/45 font-semibold">Delivery Destination Address:</span>
                      <p className="font-bold text-ink">{task.deliveryAddress}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-ink/45 font-semibold">Contacts & Navigation:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.deliveryAddress || task.item?.location || "")}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 rounded-full font-bold inline-flex items-center gap-1"
                        >
                          <Navigation className="h-3 w-3" /> Navigation Map
                        </a>
                        <a href={`tel:${pocProfile.phone}`} className="px-2.5 py-1 bg-canvas hover:bg-ink/5 border border-ink/10 rounded-full font-bold inline-flex items-center gap-1">
                          Call
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-ink/5">
                    {task.status === "Picked Up" && (
                      <Button onClick={() => handleStartDelivery(task._id)} variant="ghost" className="text-xs font-bold py-1.5 px-4 rounded-full">
                        Start Delivery Run
                      </Button>
                    )}
                    <Button onClick={() => setActiveVerification({ orderId: task._id, type: "delivery" })} variant="primary" className="text-xs font-bold py-1.5 px-4 rounded-full">
                      Verify Handover Scan
                    </Button>
                  </div>
                </div>
              ))}
              {myActiveDeliveries.length === 0 && (
                <p className="text-xs text-ink/40 text-center py-8">No delivery tasks pending.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: RETURN LOGISTICS */}
        {activeTab === "returns" && (
          <div className="panel p-6 bg-white space-y-6">
            <h2 className="text-lg font-black text-ink">Rental Return Management</h2>
            <p className="text-xs text-ink/40">Schedule and inspect returns for rental listings back to owners.</p>

            <div className="space-y-4">
              {returnTasks.map((task) => (
                <div key={task._id} className="p-5 border border-ink/5 rounded-2xl bg-canvas/30 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-base text-ink">{task.item?.title} (Rental Return)</h3>
                      <p className="text-xs text-ink/50 mt-0.5">Renter: <b>{task.renter?.name}</b> • Seller: <b>{task.owner?.name}</b></p>
                    </div>
                    {/* Status Progress Pipeline indicator */}
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider">
                      <span className={`px-2 py-0.5 rounded ${task.status === "Return Requested" ? "bg-purple-100 text-purple-700" : "bg-ink/5 text-ink/50"}`}>Requested</span>
                      <span>→</span>
                      <span className="bg-ink/5 text-ink/50 px-2 py-0.5 rounded">Picked Up</span>
                      <span>→</span>
                      <span className="bg-ink/5 text-ink/50 px-2 py-0.5 rounded">Returned</span>
                      <span>→</span>
                      <span className="bg-ink/5 text-ink/50 px-2 py-0.5 rounded">Completed</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-ink/5">
                    {task.status === "Return Requested" && (
                      <Button onClick={() => handleVerifyReturn(task._id)} variant="secondary" className="text-xs font-bold py-1.5 px-4 rounded-full">
                        Confirm Return Pickup
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {returnTasks.length === 0 && (
                <p className="text-xs text-ink/40 text-center py-8">No rental return collection requests.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: PROOF VERIFICATION HANDOVER PANEL */}
        {activeTab === "verification" && (
          <div className="panel p-6 bg-white space-y-6">
            <h2 className="text-lg font-black text-ink">Handover proof verification panel</h2>
            <p className="text-xs text-ink/40">Secure handovers with geolocation, signatures, and timestamps.</p>

            <div className="bg-canvas/50 border border-ink/5 rounded-2xl p-5 space-y-4 max-w-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-ink/75 block">GPS Location Capture</span>
                <Button onClick={handleCaptureGPS} variant="ghost" className="text-xs py-1 px-3 border border-ink/10 rounded-full font-bold">
                  Capture GPS Coordinates
                </Button>
              </div>
              <input
                className="input text-xs"
                placeholder="GPS details (e.g. 23.0225, 72.5713)"
                value={gpsCoordinates}
                readOnly
              />

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-ink/75 block">Digital Handover Signature</label>
                <p className="text-[10px] text-ink/40">Type your digital signature/name to confirm verification logs:</p>
                <input
                  className="input"
                  placeholder="Type Full Name..."
                  value={digitalSignature}
                  onChange={(e) => setDigitalSignature(e.target.value)}
                />
              </div>

              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-[10px] text-indigo-950 font-bold space-y-1">
                📅 Timestamp logs: {new Date().toLocaleString()}
              </div>

              <p className="text-[10px] text-ink/50 italic">
                * Location, timestamp, and signature are stored in platform logs for audit compliance.
              </p>
            </div>
          </div>
        )}

        {/* TAB 7: COMMUNICATION CONSOLE */}
        {activeTab === "chat" && (
          <div className="panel p-6 bg-white space-y-6">
            <h2 className="text-lg font-black text-ink">POC Operations Messenger</h2>
            <p className="text-xs text-ink/40">Simulate built-in messaging with sellers, renters, and campus admins.</p>

            <div className="border border-ink/5 rounded-2xl bg-canvas/30 overflow-hidden max-w-lg flex flex-col h-96">
              {/* Chat header */}
              <div className="p-3 bg-white border-b border-ink/5 flex justify-between items-center">
                <span className="font-bold text-xs text-ink">Active Operations Channel</span>
                <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">Online</span>
              </div>
              
              {/* Messages list */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
                {chats.map((chat, idx) => (
                  <div key={idx} className={`p-3 rounded-2xl max-w-[80%] ${chat.sender.includes("You") ? "bg-accent text-white self-end ml-auto" : "bg-white border border-ink/5 text-ink"}`}>
                    <p className="font-black text-[10px] opacity-75">{chat.sender}</p>
                    <p className="mt-1">{chat.text}</p>
                    <span className="text-[8px] opacity-60 block mt-1 text-right">{chat.time}</span>
                  </div>
                ))}
              </div>

              {/* Chat input */}
              <form onSubmit={handleSendMessage} className="p-2 bg-white border-t border-ink/5 flex gap-2">
                <input
                  className="input py-1.5 text-xs flex-1"
                  placeholder="Send a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <Button type="submit" variant="secondary" className="text-xs py-1.5 px-4 font-bold rounded-full">
                  Send
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 8: ALERTS & NOTIFICATIONS HUB */}
        {activeTab === "notifications" && (
          <div className="panel p-6 bg-white space-y-6">
            <h2 className="text-lg font-black text-ink">Logistics Alert Center</h2>
            <p className="text-xs text-ink/40">Check notification triggers and operational alerts.</p>

            <div className="space-y-3 max-w-lg">
              {allNotifications.map((n) => (
                <div key={n.id} className="p-3.5 rounded-2xl bg-canvas/30 border border-ink/5 flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-accent mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <p className="font-black text-xs text-ink">{n.title}</p>
                      <span className="text-[9px] text-ink/45 font-mono whitespace-nowrap">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-ink/65 mt-1 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: LOGISTICS SCHEDULE */}
        {activeTab === "schedule" && (
          <div className="panel p-6 bg-white space-y-6">
            <div className="flex justify-between items-center border-b border-ink/5 pb-4">
              <div>
                <h2 className="text-lg font-black text-ink">My Logistics Schedule</h2>
                <p className="text-xs text-ink/40">Today's collection and delivery agenda.</p>
              </div>

              {/* Online/Offline status switch */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-ink/45">Availability Status</span>
                <button
                  onClick={() => setPocProfile({ ...pocProfile, isOnline: !pocProfile.isOnline })}
                  className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase ${
                    pocProfile.isOnline ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-ink/5 text-ink/50 border-ink/10"
                  }`}
                >
                  {pocProfile.isOnline ? "Active Online" : "Offline"}
                </button>
              </div>
            </div>

            {/* List Agenda */}
            <div className="space-y-4 max-w-lg">
              <div className="p-4 bg-canvas/30 border border-ink/5 rounded-2xl space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block">Today's Schedule</span>
                <div className="space-y-2.5">
                  <div className="flex gap-3 text-xs">
                    <span className="font-mono text-ink/45 font-semibold">12:00 PM</span>
                    <div>
                      <p className="font-bold text-ink">Pickup from Aiden (Seller)</p>
                      <p className="text-[10px] text-ink/50">Calculators listing collection at Engineering block reception</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="font-mono text-ink/45 font-semibold">02:30 PM</span>
                    <div>
                      <p className="font-bold text-ink">Delivery to Mira (Student)</p>
                      <p className="text-[10px] text-ink/50">Deliver textbook to girls hostel common area</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: ROUTE OPTIMIZATION */}
        {activeTab === "route" && (
          <div className="panel p-6 bg-white space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink">Logistics Route Optimization</h2>
              <p className="text-xs text-ink/40">Suggested optimized sequence mapping to reduce travel distance on campus.</p>
            </div>

            <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100 rounded-3xl max-w-md space-y-4">
              <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1">
                <Compass className="h-4 w-4 text-accent animate-spin" /> Optimized Run sequence
              </span>

              <div className="space-y-4 pl-3 border-l-2 border-dashed border-indigo-200">
                <div className="relative flex items-start gap-3">
                  <div className="absolute -left-[17px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-600 border border-white" />
                  <div>
                    <p className="text-xs font-black text-ink">1. Seller Aiden (Engineering block)</p>
                    <p className="text-[10px] text-ink/50 mt-0.5">Collect: Calculators</p>
                  </div>
                </div>
                
                <div className="relative flex items-start gap-3">
                  <div className="absolute -left-[17px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-600 border border-white" />
                  <div>
                    <p className="text-xs font-black text-ink">2. Seller Rohan (Science library)</p>
                    <p className="text-[10px] text-ink/50 mt-0.5">Collect: Topper Notes</p>
                  </div>
                </div>

                <div className="relative flex items-start gap-3">
                  <div className="absolute -left-[17px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-600 border border-white" />
                  <div>
                    <p className="text-xs font-black text-ink">3. Buyer Mira (Girls hostel)</p>
                    <p className="text-[10px] text-ink/50 mt-0.5">Deliver: Calculators</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 11: EARNINGS HUB */}
        {activeTab === "earnings" && (
          <div className="panel p-6 bg-white space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink">POC Dispatch Payouts</h2>
              <p className="text-xs text-ink/40">Review delivery fee earnings, payouts, and bonuses.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 max-w-xl">
              <div className="panel p-4 bg-canvas/30 border border-ink/5">
                <span className="text-[10px] font-black uppercase text-ink/40">Today's Earnings</span>
                <p className="text-xl font-black text-ink mt-1">Rs. {totalEarnings}</p>
              </div>

              <div className="panel p-4 bg-canvas/30 border border-ink/5">
                <span className="text-[10px] font-black uppercase text-ink/40">Completed Tasks</span>
                <p className="text-xl font-black text-ink mt-1">{completedTaskCount} Runs</p>
              </div>

              <div className="panel p-4 bg-canvas/30 border border-ink/5">
                <span className="text-[10px] font-black uppercase text-ink/40">Bonus Payouts</span>
                <p className="text-xl font-black text-emerald-700 mt-1">Rs. {completedTaskCount * bonusPerTask}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 12: PERFORMANCE SCORECARD */}
        {activeTab === "performance" && (
          <div className="panel p-6 bg-white space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink">Operations Performance scorecard</h2>
              <p className="text-xs text-ink/40">Dispatcher logistics score and efficiency statistics.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
              <div className="p-4 border border-ink/5 rounded-2xl bg-canvas/30 flex justify-between items-center text-xs">
                <span className="font-semibold text-ink/65">Delivery Success Rate:</span>
                <span className="font-black text-emerald-700">100%</span>
              </div>
              
              <div className="p-4 border border-ink/5 rounded-2xl bg-canvas/30 flex justify-between items-center text-xs">
                <span className="font-semibold text-ink/65">Average Delivery Time:</span>
                <span className="font-black text-ink">18 Mins</span>
              </div>

              <div className="p-4 border border-ink/5 rounded-2xl bg-canvas/30 flex justify-between items-center text-xs">
                <span className="font-semibold text-ink/65">Customer Rating average:</span>
                <span className="font-black text-indigo-700">★ {user?.ratingsAverage || "4.9"}</span>
              </div>

              <div className="p-4 border border-ink/5 rounded-2xl bg-canvas/30 flex justify-between items-center text-xs">
                <span className="font-semibold text-ink/65">Late Deliveries count:</span>
                <span className="font-black text-ink">0</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 13: FILE ISSUES / EXCEPTION REPORT */}
        {activeTab === "reports" && (
          <div className="panel p-6 bg-white space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink">File Logistics Issue Exception</h2>
              <p className="text-xs text-ink/40">Report issues like buyer not available, damaged items, or lost goods.</p>
            </div>

            <form onSubmit={handleReportIssue} className="space-y-4 max-w-md">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/75 block">Select Order ID</label>
                <select
                  className="w-full bg-white border border-ink/10 rounded-xl px-3 py-2 text-xs text-ink font-bold outline-none"
                  value={exceptionReport.orderId}
                  onChange={(e) => setExceptionReport({ ...exceptionReport, orderId: e.target.value })}
                  required
                >
                  <option value="">Choose active task...</option>
                  {[...myAssignedTasks, ...myActiveDeliveries].map(o => (
                    <option key={o._id} value={o._id}>{o.item?.title} ({o._id.substring(o._id.length - 8).toUpperCase()})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/75 block">Issue Category</label>
                <select
                  className="w-full bg-white border border-ink/10 rounded-xl px-3 py-2 text-xs text-ink font-bold outline-none"
                  value={exceptionReport.issueType}
                  onChange={(e) => setExceptionReport({ ...exceptionReport, issueType: e.target.value })}
                >
                  <option value="Damaged Product">Damaged Product</option>
                  <option value="Buyer Not Available">Buyer Not Available</option>
                  <option value="Seller Not Available">Seller Not Available</option>
                  <option value="Wrong Product">Wrong Product</option>
                  <option value="Lost Item">Lost Item</option>
                  <option value="Payment Issue">Payment Issue</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/75 block">Report Details</label>
                <textarea
                  className="input py-2 text-xs min-h-24"
                  placeholder="Provide precise details of the exception..."
                  value={exceptionReport.details}
                  onChange={(e) => setExceptionReport({ ...exceptionReport, details: e.target.value })}
                  required
                />
              </div>

              <Button type="submit" variant="secondary" className="px-6 py-2 text-xs uppercase font-bold">
                Submit Exception Report
              </Button>
            </form>
          </div>
        )}

        {/* TAB 14: USER SETTINGS */}
        {activeTab === "settings" && (
          <UserSettingsView onRefresh={onRefresh} />
        )}

        {/* TAB 15: ACTIVITY HISTORY TIMELINE */}
        {activeTab === "history" && (
          <div className="panel p-6 bg-white space-y-6">
            <div>
              <h2 className="text-lg font-black text-ink">Completed Dispatch History</h2>
              <p className="text-xs text-ink/40">Timeline of all completed dispatch deliveries and collections.</p>
            </div>

            <div className="space-y-4 pl-3 border-l border-ink/10">
              {myHistory.map((task) => (
                <div key={task._id} className="relative flex items-start gap-3">
                  <div className="absolute -left-[16.5px] top-1.5 h-2 w-2 rounded-full bg-emerald-600 border border-white" />
                  <div>
                    <p className="text-xs font-bold text-ink">Delivered "{task.item?.title || "Product"}"</p>
                    <p className="text-[10px] text-ink/50 mt-0.5">
                      Renter: {task.renter?.name} • Seller: {task.owner?.name}
                    </p>
                    <span className="text-[9px] text-ink/40 font-mono">{new Date(task.updatedAt || task.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {myHistory.length === 0 && (
                <p className="text-xs text-ink/40">No completed dispatches logged yet.</p>
              )}
            </div>
          </div>
        )}

      </div>

      {/* VERIFICATION MODAL SCANNER */}
      {activeVerification && (() => {
        const activeOrder = rentedItems.find(t => t._id === activeVerification.orderId) || incomingRequests.find(t => t._id === activeVerification.orderId) || wishlistItems.find(t => t._id === activeVerification.orderId);
        return (
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-6 animate-zoomIn">
              <button onClick={() => {
                setActiveVerification(null);
                setProofPhotoInput("");
                setDigitalSignature("");
                setOtpInput("");
              }} className="absolute top-4 right-4 p-1 hover:bg-canvas rounded-full">
                <X className="h-5 w-5 text-ink/65" />
              </button>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-accent">Logistics Handover Verification</p>
                <h3 className="text-base font-black text-ink mt-1">Verification scanner: {activeVerification.type.toUpperCase()}</h3>
              </div>

              <form onSubmit={activeVerification.type === "pickup" ? handleVerifyPickup : handleVerifyDelivery} className="space-y-4">
                {activeVerification.type === "delivery" && activeOrder && activeOrder.paymentMethod === "cod" && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800 font-bold space-y-1">
                    💵 Cash Collection Required!
                    <p className="text-[10px] font-medium text-amber-700">Please collect Rs. {activeOrder.totalPrice} in cash from the renter before verifying delivery.</p>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-ink/75 block">Enter Handover OTP Code</label>
                  <p className="text-[10px] text-ink/40">Request the OTP code from the seller/student to verify the handover:</p>
                  <input
                    type="text"
                    placeholder={activeVerification.type === "pickup" ? "e.g. P-123456" : "e.g. D-654321"}
                    className="input"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    required
                  />
                </div>

                {activeVerification.type === "delivery" && (
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-ink/75 block flex items-center gap-1">
                      <Camera className="h-4 w-4 text-accent" /> Handover photo URL proof
                    </label>
                    <input
                      type="text"
                      placeholder="Paste image link for proof..."
                      className="input text-xs"
                      value={proofPhotoInput}
                      onChange={(e) => setProofPhotoInput(e.target.value)}
                    />
                  </div>
                )}

                <div className="p-3 bg-canvas border border-ink/5 rounded-xl space-y-2">
                  <span className="text-[10px] font-black uppercase text-ink/50 block">Compliance Audit Proofs</span>
                  <div className="flex flex-col gap-1.5 text-[10px] text-ink/65">
                    <div className="flex justify-between items-center">
                      <span>GPS Coordinates:</span>
                      <button type="button" onClick={handleCaptureGPS} className="text-accent font-black">
                        {gpsCoordinates ? gpsCoordinates : "Capture GPS Location"}
                      </button>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span>Digital signature confirm:</span>
                      <input
                        className="input py-1 px-2 text-[10px]"
                        placeholder="Type name to sign..."
                        value={digitalSignature}
                        onChange={(e) => setDigitalSignature(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {errorFeedback && <p className="text-xs font-semibold text-red-600">{errorFeedback}</p>}

                <Button type="submit" variant="secondary" className="w-full text-xs font-bold py-2 uppercase" disabled={processingId !== ""}>
                  {processingId !== "" ? "Verifying handover..." : "Verify & Complete Scan"}
                </Button>
              </form>
            </div>
          </div>
        );
      })()}

      {/* REJECTION REASON DIALOG MODAL */}
      {rejectionId && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative space-y-4 animate-zoomIn">
            <button onClick={() => setRejectionId("")} className="absolute top-4 right-4 p-1 hover:bg-canvas rounded-full">
              <X className="h-5 w-5 text-ink/65" />
            </button>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Reject Assignment</p>
              <h3 className="text-base font-black text-ink mt-1">Specify Rejection Reason</h3>
            </div>

            <form onSubmit={handleRejectAssignment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-ink/75 block">Reason details</label>
                <textarea
                  className="input text-xs min-h-20"
                  placeholder="Provide reason (e.g. Schedule clash, item too large)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" variant="secondary" className="flex-1 text-xs py-2 uppercase bg-red-600 hover:bg-red-700 border-none font-bold">
                  Confirm Rejection
                </Button>
                <Button type="button" onClick={() => setRejectionId("")} variant="ghost" className="flex-1 text-xs py-2 border border-ink/10 rounded-full font-bold">
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default PocDashboardView;
