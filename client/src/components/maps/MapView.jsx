import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

function MapView({ lat, lng, zoom = 15, popupText = "Location", height = "300px" }) {
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
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center}>
          {popupText && <Popup>{popupText}</Popup>}
        </Marker>
      </MapContainer>
    </div>
  );
}

export default MapView;
