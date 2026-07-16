function DashboardStats({ stats }) {
  const cards = [
    { label: "Listings", value: stats.listedItems },
    { label: "Active orders", value: stats.activeRentals },
    { label: "Incoming orders", value: stats.incomingRequests },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="panel p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-ink/40">{card.label}</p>
          <p className="mt-3 text-4xl font-bold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

export default DashboardStats;
