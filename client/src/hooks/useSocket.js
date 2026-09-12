import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || '';

/**
 * Enhanced Socket.IO hook with connection state management
 * @param {string} token - Optional JWT token for authenticated connections
 * @returns {{ socket, connected, connecting, connectionState, reconnectAttempts, lastConnectedAt }}
 */
export default function useSocket(token = null) {
  // Connection states: 'connecting', 'connected', 'disconnected', 'reconnecting', 'error'
  const [connectionState, setConnectionState] = useState('disconnected');
  const [connected, setConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastConnectedAt, setLastConnectedAt] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setConnected(true);
      setConnectionState('connected');
      setReconnectAttempts(0);
      setLastConnectedAt(new Date());
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      setConnectionState(reason === 'io server disconnect' ? 'error' : 'disconnected');
    });

    socket.on('reconnect_attempt', (attempt) => {
      setConnectionState('reconnecting');
      setReconnectAttempts(attempt);
    });

    socket.on('reconnect', () => {
      setConnectionState('connected');
      setConnected(true);
      setReconnectAttempts(0);
      setLastConnectedAt(new Date());
    });

    socket.on('reconnect_error', () => {
      setConnectionState('reconnecting');
    });

    socket.on('connect_error', () => {
      setConnectionState('error');
    });

    socketRef.current = socket;
    setConnectionState('connecting');

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return {
    socket: socketRef.current,
    connected,
    connecting: connectionState === 'connecting' || connectionState === 'reconnecting',
    connectionState,
    reconnectAttempts,
    lastConnectedAt,
  };
}
