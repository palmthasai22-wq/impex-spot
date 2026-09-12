import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

/**
 * Hook for responder functionality
 * @param {object} socket - Socket.IO client instance
 * @param {string} token - JWT auth token
 */
export default function useResponder(socket, token) {
  const [incidents, setIncidents] = useState([]);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [locationWatcher, setLocationWatcher] = useState(null);

  // Fetch assigned incidents
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await api.get('/responder/incidents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIncidents(res.data);
    } catch (err) {
      // silent fail
    }
  }, [token]);

  // Accept an incident assignment
  const acceptIncident = useCallback(async (incidentId) => {
    try {
      await api.put(`/responder/incidents/${incidentId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('รับงานแล้ว');
      await fetchIncidents();
    } catch (err) {
      toast.error('ไม่สามารถรับงานได้');
    }
  }, [token, fetchIncidents]);

  // Update incident status
  const updateIncidentStatus = useCallback(async (incidentId, status) => {
    try {
      await api.put(`/responder/incidents/${incidentId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('อัปเดตสถานะแล้ว');
      await fetchIncidents();
    } catch (err) {
      toast.error('ไม่สามารถอัปเดตสถานะได้');
    }
  }, [token, fetchIncidents]);

  // Toggle location sharing
  const toggleLocationSharing = useCallback(() => {
    if (sharingLocation && locationWatcher !== null) {
      navigator.geolocation.clearWatch(locationWatcher);
      setLocationWatcher(null);
      setSharingLocation(false);
      toast.success('หยุดแชร์ตำแหน่งแล้ว');
      return;
    }

    if (!navigator.geolocation) {
      toast.error('เบราว์เซอร์ไม่รองรับ GPS');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Send via socket for real-time
        if (socket) {
          socket.emit('responder:update_location', { lat: latitude, lng: longitude });
        }
        // Also persist via API
        api.post('/responder/location', { lat: latitude, lng: longitude }, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {}); // silent
      },
      (error) => {
        toast.error('ไม่สามารถเข้าถึง GPS ได้');
        setSharingLocation(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    setLocationWatcher(watchId);
    setSharingLocation(true);
    toast.success('เริ่มแชร์ตำแหน่งแล้ว');
  }, [sharingLocation, locationWatcher, socket, token]);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('incident:assigned', fetchIncidents);
    socket.on('incident:dispatch_update', fetchIncidents);

    return () => {
      socket.off('incident:assigned', fetchIncidents);
      socket.off('incident:dispatch_update', fetchIncidents);
    };
  }, [socket, fetchIncidents]);

  // Cleanup location watcher on unmount
  useEffect(() => {
    return () => {
      if (locationWatcher !== null) {
        navigator.geolocation.clearWatch(locationWatcher);
      }
    };
  }, [locationWatcher]);

  return {
    incidents,
    fetchIncidents,
    acceptIncident,
    updateIncidentStatus,
    sharingLocation,
    toggleLocationSharing,
  };
}
