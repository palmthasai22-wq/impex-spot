import React from 'react';

const CALLS = [
  { label: 'ตำรวจ', number: '191', emoji: '🚔', bg: 'bg-blue-600 hover:bg-blue-700', shadow: 'shadow-blue-200' },
  { label: 'กู้ชีพ', number: '1669', emoji: '🚑', bg: 'bg-red-600 hover:bg-red-700', shadow: 'shadow-red-200' },
  { label: 'ดับเพลิง', number: '199', emoji: '🚒', bg: 'bg-orange-500 hover:bg-orange-600', shadow: 'shadow-orange-200' },
];

export default function EmergencyCallBar() {
  return (
    <div className="glass-card m-4 p-4 border border-accent-200 bg-accent-50/50">
      <p className="text-xs font-bold text-center text-amber-700 mb-3">📞 โทรแจ้งเหตุโดยตรง</p>
      <div className="grid grid-cols-3 gap-2">
        {CALLS.map(c => (
          <a
            key={c.number}
            href={`tel:${c.number}`}
            className={`${c.bg} text-white rounded-2xl py-3 px-2 flex flex-col items-center gap-1 shadow-lg ${c.shadow} transition-all hover:-translate-y-0.5 active:translate-y-0`}
          >
            <span className="text-xl">{c.emoji}</span>
            <span className="text-lg font-black">{c.number}</span>
            <span className="text-[10px] font-medium opacity-90">{c.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
