import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = io('/', { path: '/socket.io' });
    setSocket(s);

    s.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });
    s.on('disconnect', () => setConnected(false));
    
    return () => {
      s.disconnect();
    };
  }, []);

  return { socket, connected };
}
