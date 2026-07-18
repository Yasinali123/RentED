import { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { Search, Navigation } from "lucide-react";
import { locationApi } from "../../api/client";

function MapEvents({ onChange }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function LocationPicker({ initialLat, initialLng, onChangeLocation }) {
  const [lat, setLat] = useState(initialLat || 23.0225); // Ahmedabad default
  const [lng, setLng] = useState(initialLng || 72.5714);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState("");
  const mapRef = useRef(null);

  const markerPosition = useMemo(() => [lat, lng], [lat, lng]);

  useEffect(() => {
    if (initialLat && initialLng) {
      const parsedLat = Number(initialLat);
      const parsedLng = Number(initialLng);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        setLat(parsedLat);
        setLng(parsedLng);
      }
    }
  }, [initialLat, initialLng]);

  const handleCoordsChange = async (newLat, newLng) => {
    setLat(newLat);
    setLng(newLng);
    setLoading(true);

    try {
      const data = await locationApi.reverseGeocode({ latitude: newLat, longitude: newLng });
      setResolvedAddress(data.address || `${newLat}, ${newLng}`);
      if (onChangeLocation) {
        onChangeLocation(data);
      }
      if (mapRef.current) {
        mapRef.current.setView([newLat, newLng]);
      }
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`, {
        headers: { "User-Agent": "RentED-App/1.0" }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const result = data[0];
        const newLat = Number(result.lat);
        const newLng = Number(result.lon);
        await handleCoordsChange(newLat, newLng);
      } else {
        alert("Location not found");
      }
    } catch (err) {
      alert("Error searching location");
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        await handleCoordsChange(newLat, newLng);
      },
      (err) => {
        alert("Failed to get browser location. Please type in search box.");
        setLoading(false);
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Current location buttons */}
      <div className="flex gap-2 flex-col sm:flex-row">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink/40" />
          <input
            type="text"
            placeholder="Search address or college..."
            className="input pl-9 text-xs w-full py-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={loading}
          />
        </form>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="btn btn-secondary text-xs flex items-center justify-center gap-1.5 py-2 px-4 whitespace-nowrap bg-indigo-50 border-indigo-200 text-indigo-700 font-bold uppercase rounded-xl border hover:bg-indigo-100/50 transition-colors"
          disabled={loading}
        >
          <Navigation className="h-4.5 w-4.5" />
          Use Location GPS
        </button>
      </div>

      {/* Map display */}
      <div style={{ height: "320px", width: "100%", zIndex: 1 }} className="rounded-3xl overflow-hidden border border-ink/10 shadow-inner relative bg-mist">
        <MapContainer
          center={markerPosition}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={markerPosition}
            draggable={true}
            eventHandlers={{
              dragend(e) {
                const marker = e.target;
                const position = marker.getLatLng();
                handleCoordsChange(position.lat, position.lng);
              },
            }}
          />
          <MapEvents onChange={handleCoordsChange} />
        </MapContainer>
      </div>

      {/* Resolved Address Label */}
      {resolvedAddress && (
        <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-[10px] md:text-xs text-indigo-900 font-medium">
          <p className="font-bold text-[9px] uppercase tracking-wider text-indigo-600 mb-0.5">Selected Hyperlocal Address</p>
          <p>{resolvedAddress}</p>
        </div>
      )}
    </div>
  );
}

export default LocationPicker;
