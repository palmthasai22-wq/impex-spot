import { useState, useEffect, useCallback } from 'react';

export function useNotifications({ socket, token }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 60000);
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };
    socket.on('notification:new', handleNewNotification);
    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket]);

  const markRead = async (id) => {
    if (!token) return;
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const markAllRead = async () => {
    if (!token) return;
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  return { notifications, unreadCount, markRead, markAllRead, loading };
}
