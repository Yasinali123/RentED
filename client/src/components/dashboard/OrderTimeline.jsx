import { CheckCircle2, Clock, Truck, ShieldCheck, HelpCircle, XCircle } from "lucide-react";

function OrderTimeline({ request }) {
  const currentStatus = request?.status || "Pending Payment";

  // Timeline major stages mapping
  const stages = [
    { label: "Ordered", statuses: ["Pending Payment", "Payment Successful"] },
    { label: "Accepted", statuses: ["Seller Accepted"] },
    { label: "POC Assigned", statuses: ["POC Assigned", "Pickup Scheduled"] },
    { label: "Picked Up", statuses: ["Picked Up"] },
    { label: "Out For Delivery", statuses: ["Out For Delivery"] },
    { label: "Delivered", statuses: ["Delivered"] },
    { label: "Active Rental", statuses: ["Rental Active", "Return Requested", "Returned"], isRentalOnly: true },
    { label: "Completed", statuses: ["Completed"] },
  ];

  // Filter stage list if purchase vs rental
  const filteredStages = request?.requestType === "purchase" 
    ? stages.filter(s => !s.isRentalOnly) 
    : stages;

  // Determine the active index
  let activeIndex = -1;
  filteredStages.forEach((stage, idx) => {
    if (stage.statuses.includes(currentStatus)) {
      activeIndex = idx;
    }
  });

  // If status is Completed or Returned and activeIndex wasn't set, default to end
  if (currentStatus === "Completed") {
    activeIndex = filteredStages.length - 1;
  }

  // Handle cancelled or rejected states
  const isFailed = ["Seller Rejected", "Cancelled", "Refund Initiated", "Refund Completed"].includes(currentStatus);

  const getStageIcon = (index) => {
    if (isFailed && index >= 1) return <XCircle className="h-5 w-5 text-red-500" />;
    if (index < activeIndex) return <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-50" />;
    if (index === activeIndex) return <Clock className="h-5 w-5 text-accent animate-pulse" />;
    return <Clock className="h-5 w-5 text-ink/20" />;
  };

  return (
    <div className="mt-6 space-y-6 rounded-2xl border border-ink/5 bg-canvas/30 p-5">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">Tracking Code</p>
          <p className="text-sm font-bold font-display mt-0.5 text-accent">#{request._id.toString().slice(-8).toUpperCase()}</p>
        </div>
        <div className="text-right">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
            isFailed 
              ? "bg-red-50 text-red-600 border border-red-200" 
              : currentStatus === "Completed"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse"
          }`}>
            {currentStatus}
          </span>
        </div>
      </div>

      {/* Progress Timeline Nodes */}
      <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-2 pt-2">
        {/* Connector line for large screens */}
        <div className="absolute left-[9px] top-4 bottom-4 w-0.5 md:left-4 md:right-4 md:top-2.5 md:h-0.5 md:w-auto bg-ink/10 -z-10" />

        {filteredStages.map((stage, idx) => {
          const isPassed = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div key={stage.label} className="flex md:flex-col items-center gap-3 md:gap-2 flex-1 md:text-center">
              <div className="bg-canvas z-10 p-0.5">
                {getStageIcon(idx)}
              </div>
              <div>
                <p className={`text-xs font-bold leading-tight ${isCurrent ? "text-accent" : isPassed ? "text-emerald-700" : "text-ink/40"}`}>
                  {stage.label}
                </p>
                <p className="text-[10px] text-ink/40 mt-0.5 hidden md:block">
                  {isCurrent ? "Active Step" : isPassed ? "Done" : "Pending"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Codes for Pickups and Deliveries */}
      {request.status === "Seller Accepted" && (
        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/20 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm">
            <p className="font-bold text-amber-900">Pickup Code Available</p>
            <p className="text-xs text-amber-800/80 mt-1">Provide this code to the assigned POC when they collect the item.</p>
          </div>
          <div className="bg-white border border-amber-200 px-4 py-2 rounded-xl text-center">
            <p className="text-xs uppercase tracking-widest text-ink/40">Pickup OTP</p>
            <p className="text-lg font-black text-amber-700 font-display mt-0.5 tracking-wider">{request.pickupQrCode}</p>
          </div>
        </div>
      )}

      {request.status === "Out For Delivery" && (
        <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/20 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm">
            <p className="font-bold text-indigo-900">Delivery Code Available</p>
            <p className="text-xs text-indigo-800/80 mt-1">Share this OTP with the POC once they hand over the item to verify delivery.</p>
          </div>
          <div className="bg-white border border-indigo-200 px-4 py-2 rounded-xl text-center">
            <p className="text-xs uppercase tracking-widest text-ink/40">Delivery OTP</p>
            <p className="text-lg font-black text-indigo-700 font-display mt-0.5 tracking-wider">{request.deliveryQrCode}</p>
          </div>
        </div>
      )}

      {/* History Log */}
      <div className="border-t border-ink/5 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40 mb-3">Order History log</p>
        <div className="space-y-3 max-h-36 overflow-y-auto pr-1">
          {request.trackingHistory?.map((log, lIdx) => (
            <div key={lIdx} className="flex justify-between text-xs text-ink/60">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <span className="font-semibold text-ink/80">{log.status}</span>
                <span className="text-[10px] text-ink/40">({log.location || "System Log"})</span>
              </div>
              <span className="text-[10px] text-ink/40">
                {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OrderTimeline;
