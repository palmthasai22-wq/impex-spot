import React, { useState, useEffect } from 'react';

export default function ExpiryCountdown({ expiresAt }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!expiresAt) return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-brand-100 text-brand-700 border border-brand-200">
      ♾️ ถาวร
    </span>
  );

  const remaining = new Date(expiresAt).getTime() - now;
  if (remaining <= 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
      ⏰ หมดอายุแล้ว
    </span>
  );

  const minutes = Math.floor(remaining / 60000);
  const hours = Math.floor(minutes / 60);
  const label = hours > 0 ? `${hours} ชม. ${minutes % 60} น.` : `${minutes} นาที`;
  const color = minutes > 30 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : minutes > 10 ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-red-100 text-red-700 border-red-200';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${color}`}>
      ⏱ เหลือ {label}
    </span>
  );
}
