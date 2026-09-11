import { useState, useEffect } from 'react';

export default function useGeolocation() {
  const [location, setLocation] = useState({ lat: null, lng: null, accuracy: null });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('เบราว์เซอร์ไม่รองรับ GPS');
      setLoading(false);
      return;
    }

    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  return { ...location, error, loading };
}
