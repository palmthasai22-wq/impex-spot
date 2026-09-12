import React, { useState, useRef, useEffect } from 'react';

const TYPE_ICONS = {
  incident_new: '🚨',
  incident_assigned: '👤',
  pin_verified: '✅',
  pin_flagged: '🚩',
  system: '⚙️'
};

export default function NotificationPanel({ notifications, unreadCount, markRead, markAllRead }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' ปีที่แล้ว';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' เดือนที่แล้ว';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' วันที่แล้ว';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' ชั่วโมงที่แล้ว';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' นาทีที่แล้ว';
    return 'เมื่อสักครู่';
  };

  return (
    <div className="relative" ref={panelRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
        aria-label="การแจ้งเตือน"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white/50">
            <h3 className="font-semibold text-gray-800">การแจ้งเตือน</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => { markAllRead(); setIsOpen(false); }}
                className="text-xs text-green-600 hover:text-green-800 font-medium"
              >
                อ่านทั้งหมด
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications && notifications.length > 0 ? (
              <ul className="divide-y divide-gray-50">
                {notifications.map((notif) => (
                  <li 
                    key={notif.id}
                    onClick={() => {
                      if (!notif.isRead) markRead(notif.id);
                    }}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3 ${notif.isRead ? 'opacity-70' : 'bg-green-50/30'}`}
                  >
                    <div className="text-2xl flex-shrink-0">
                      {TYPE_ICONS[notif.type] || '🔔'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium text-gray-900 truncate ${!notif.isRead ? 'font-bold' : ''}`}>
                        {notif.title}
                      </p>
                      <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">
                        {notif.body}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {timeAgo(notif.createdAt || notif.created_at)}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <div className="w-2 h-2 bg-green-500 rounded-full self-center flex-shrink-0"></div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">🔕</div>
                <p>ไม่มีการแจ้งเตือน</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
