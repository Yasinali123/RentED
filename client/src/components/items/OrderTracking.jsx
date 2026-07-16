import { Check, Package, Truck, Home, XCircle } from "lucide-react";

const STAGES = [
  { id: "ordered", label: "Ordered", icon: Package },
  { id: "shipped", label: "Shipped", icon: Truck },
  { id: "out_for_delivery", label: "Out for delivery", icon: Truck },
  { id: "delivered", label: "Delivered", icon: Home },
];

function OrderTracking({ request }) {
  if (request.status === "cancelled") {
    return (
      <div className="flex items-center gap-2 text-red-500 mt-3 p-3 bg-red-50 rounded-xl">
        <XCircle className="w-5 h-5" />
        <span className="font-semibold text-sm">Order Cancelled</span>
      </div>
    );
  }

  if (request.status === "rejected") {
    return (
      <div className="flex items-center gap-2 text-red-500 mt-3 p-3 bg-red-50 rounded-xl">
        <XCircle className="w-5 h-5" />
        <span className="font-semibold text-sm">Order Rejected</span>
      </div>
    );
  }

  const currentStatusIndex = STAGES.findIndex((s) => s.id === request.trackingStatus);

  return (
    <div className="mt-4 border-t border-ink/10 pt-4">
      <p className="text-sm font-semibold mb-4 text-ink">Tracking Timeline</p>
      <div className="flex items-center justify-between relative px-2">
        <div className="absolute left-0 top-4 w-full h-1 bg-ink/10 z-0 rounded-full"></div>
        <div
          className="absolute left-0 top-4 h-1 bg-accent z-0 rounded-full transition-all duration-500"
          style={{ width: `${(Math.max(currentStatusIndex, 0) / (STAGES.length - 1)) * 100}%` }}
        ></div>

        {STAGES.map((stage, index) => {
          const isCompleted = index <= currentStatusIndex;
          const isCurrent = index === currentStatusIndex;
          const Icon = isCompleted ? Check : stage.icon;

          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center gap-2 w-16">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                  isCompleted
                    ? "bg-accent border-accent text-white"
                    : "bg-mist border-ink/20 text-ink/40"
                } ${isCurrent ? "ring-4 ring-accent/20" : ""}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={`text-xs font-medium text-center ${
                  isCompleted ? "text-ink" : "text-ink/50"
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
      
      {request.trackingHistory?.length > 0 && (
        <div className="mt-4 rounded-xl bg-mist p-3 text-xs text-ink/60">
          <p className="font-semibold text-ink">Latest Update:</p>
          <p className="mt-1">
            {request.trackingHistory[request.trackingHistory.length - 1].status.toUpperCase()}{" "}
            {request.trackingHistory[request.trackingHistory.length - 1].location ? `- ${request.trackingHistory[request.trackingHistory.length - 1].location}` : ""}
          </p>
          <p className="mt-1 opacity-70">
            {new Date(request.trackingHistory[request.trackingHistory.length - 1].date).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

export default OrderTracking;
