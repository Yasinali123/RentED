import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

function MapView({ lat, lng, zoom = 15, popupText = "Location", height = "300px" }) {
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

  if (!lat || !lng) {
    return (
      <div 
        style={{ height }} 
        className="w-full flex items-center justify-center bg-mist text-ink/40 text-xs font-bold rounded-3xl border border-ink/5"
      >
        No coordinates selected.
      </div>
    );
  }

  const center = [Number(lat), Number(lng)];

  return (
    <div style={{ height, width: "100%", zIndex: 1 }} className="rounded-3xl overflow-hidden border border-ink/10 shadow-inner">
      {mapReady && (
        <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={center}>
            {popupText && <Popup>{popupText}</Popup>}
          </Marker>
        </MapContainer>
      )}
    </div>
  );
}

export default MapView;
