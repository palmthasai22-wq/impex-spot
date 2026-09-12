import React, { useEffect, useState } from 'react';
import { useOfflineSync } from '../hooks/useOfflineSync';

export default function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, lastSyncAt } = useOfflineSync();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOnline && lastSyncAt) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSyncAt, isOnline]);

  if (isOnline && pendingCount === 0 && !isSyncing && !showSuccess) {
    return null;
  }

  let bgColor = 'bg-red-600';
  let message = '📴 ไม่มีการเชื่อมต่ออินเทอร์เน็ต';

  if (!isOnline && pendingCount > 0) {
    message = `📴 ออฟไลน์ - รอการเชื่อมต่อเพื่อส่งข้อมูล (${pendingCount} รายการ)`;
  } else if (isSyncing) {
    bgColor = 'bg-amber-500';
    message = `🔄 กำลังส่งข้อมูลที่ค้างอยู่ (${pendingCount} รายการ)...`;
  } else if (showSuccess) {
    bgColor = 'bg-green-600';
    message = '✅ ส่งข้อมูลสำเร็จ';
  } else if (!isOnline) {
    bgColor = 'bg-red-600';
    message = '📴 ไม่มีการเชื่อมต่ออินเทอร์เน็ต';
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 transform translate-y-0`}>
      <div className={`${bgColor} text-white px-4 py-2 text-sm font-medium text-center shadow-md flex items-center justify-center space-x-2`}>
        <span>{message}</span>
      </div>
    </div>
  );
}
