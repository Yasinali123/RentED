import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";

function NearbyMap({ lat, lng, items = [], height = "450px" }) {
  const center = [Number(lat) || 23.0225, Number(lng) || 72.5714];

  // Delay MapContainer mount until after React 18 StrictMode's
  // mount → unmount → remount cycle completes.
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMapReady(true));
    return () => {
      cancelAnimationFrame(id);
      setMapReady(false);
    };
  }, []);

  return (
    <div style={{ height, width: "100%", zIndex: 1 }} className="rounded-3xl overflow-hidden border border-ink/10 shadow-lg">
      {mapReady && (
        <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* User location marker */}
          {lat && lng && (
            <Marker position={center}>
              <Popup>
                <div className="text-center font-bold text-xs text-indigo-700">Your Location</div>
              </Popup>
            </Marker>
          )}

          {/* Nearby items markers */}
          {items.map((item) => {
            const coords = item.geometry?.coordinates || [];
            if (coords.length < 2) return null;
            // GeoJSON coordinates are [lng, lat]
            const itemPos = [coords[1], coords[0]];

            return (
              <Marker key={item._id} position={itemPos}>
                <Popup>
                  <div className="space-y-1.5 p-1 w-44">
                    <div className="h-20 w-full overflow-hidden rounded-xl bg-mist border border-ink/5">
                      <img 
                        src={item.images?.[0]?.url || "https://placehold.co/240x160?text=Listing"} 
                        alt={item.title} 
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-ink truncate" title={item.title}>{item.title}</p>
                      <p className="text-[10px] text-ink/55 truncate">{item.collegeName || "Campuses"}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-black text-xs text-indigo-600">
                          {item.rentalPrice ? `₹${item.rentalPrice}/day` : `₹${item.salePrice}`}
                        </span>
                        <Link 
                          to={`/items/${item._id}`}
                          className="text-[9px] font-black uppercase text-white bg-accent px-2 py-1 rounded"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      )}
    </div>
  );
}

export default NearbyMap;
