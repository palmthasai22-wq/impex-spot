import { useState, useEffect, useCallback } from 'react';
import { getPins } from '../utils/api';
import { useAppContext } from '../context/AppContext';
import useSocket from './useSocket';

export default function usePins() {
  const { pins, setPins, filters } = useAppContext();
  const { socket, connected } = useSocket();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRealtimeAt, setLastRealtimeAt] = useState(null);

  const fetchPins = useCallback(async (bounds = null) => {
    try {
      setLoading(true);
      const data = await getPins(bounds, filters);
      setPins(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, setPins]);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  useEffect(() => {
    if (connected) fetchPins();
  }, [connected, fetchPins]);

  useEffect(() => {
    if (!socket) return undefined;

    const upsertPin = (pin) => {
      if (!pin || pin.status !== 'active') return;
      setLastRealtimeAt(new Date());
      setPins(currentPins => {
        const existingIndex = currentPins.findIndex(item => item.id === pin.id);
        if (existingIndex === -1) return [...currentPins, pin];
        return currentPins.map(item => item.id === pin.id ? pin : item);
      });
    };

    const removePin = ({ id }) => {
      if (!id) return;
      setLastRealtimeAt(new Date());
      setPins(currentPins => currentPins.filter(pin => pin.id !== id));
    };

    const replacePins = (nextPins) => {
      if (!Array.isArray(nextPins)) return;
      setPins(nextPins.filter(pin => pin.status === 'active'));
    };

    const handlePinUpdate = (pin) => {
      if (pin?.status === 'active') upsertPin(pin);
      else if (pin?.id) removePin(pin);
    };

    socket.on('pins:initial', replacePins);
    socket.on('pin:new', upsertPin);
    socket.on('pin:update', handlePinUpdate);
    socket.on('pin:expired', removePin);
    socket.on('pin:deleted', removePin);

    return () => {
      socket.off('pins:initial', replacePins);
      socket.off('pin:new', upsertPin);
      socket.off('pin:update', handlePinUpdate);
      socket.off('pin:expired', removePin);
      socket.off('pin:deleted', removePin);
    };
  }, [socket, setPins]);

  return { pins, loading, error, refetch: fetchPins, connected, lastRealtimeAt };
}
