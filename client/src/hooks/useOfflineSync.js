import { useState, useEffect, useCallback } from 'react';
import { offlineQueue } from '../utils/offlineQueue';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  const updateCount = useCallback(async () => {
    const count = await offlineQueue.getCount();
    setPendingCount(count);
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine || pendingCount === 0) return;
    
    setIsSyncing(true);
    try {
      await offlineQueue.syncAll();
      setLastSyncAt(new Date());
    } finally {
      setIsSyncing(false);
      updateCount();
    }
  }, [pendingCount, updateCount]);

  useEffect(() => {
    // Initial count
    updateCount();

    const handleOnline = () => {
      setIsOnline(true);
      syncNow();
      
      // Register background sync if available
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
          registration.sync.register('offline-queue-sync').catch(() => {
             // fallback to our syncNow
          });
        });
      }
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleStatusChange = () => updateCount();
    offlineQueue.on('status-change', handleStatusChange);
    
    const handleSyncStart = () => setIsSyncing(true);
    const handleSyncComplete = () => {
      setIsSyncing(false);
      setLastSyncAt(new Date());
    };
    const handleSyncError = () => setIsSyncing(false);

    offlineQueue.on('sync-start', handleSyncStart);
    offlineQueue.on('sync-complete', handleSyncComplete);
    offlineQueue.on('sync-error', handleSyncError);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      offlineQueue.off('status-change', handleStatusChange);
      offlineQueue.off('sync-start', handleSyncStart);
      offlineQueue.off('sync-complete', handleSyncComplete);
      offlineQueue.off('sync-error', handleSyncError);
    };
  }, [syncNow, updateCount]);

  return { isOnline, pendingCount, isSyncing, lastSyncAt, syncNow };
}
