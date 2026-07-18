import { useState, useEffect } from "react";

export function useCurrentLocation() {
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({
        latitude: null,
        longitude: null,
        loading: false,
        error: "Geolocation is not supported by your browser",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (error) => {
        let errorMsg = "Location services unavailable";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location permission denied";
        }
        setLocation({
          latitude: null,
          longitude: null,
          loading: false,
          error: errorMsg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  return location;
}

export default useCurrentLocation;
