import React from 'react';
import { useAppContext } from '../context/AppContext';
import { PIN_CATEGORIES } from '../utils/categories';

export default function PinList({ onSelect }) {
  const { pins } = useAppContext();
  const activePins = pins.filter(p => p.status === 'active');

  // จัดกลุ่มตามประเภท
  const grouped = {};
  activePins.forEach(pin => {
    const type = pin.type || pin.category || 'other';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(pin);
  });

  const timeAgo = (date) => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'เมื่อสักครู่';
    if (mins < 60) return `${mins} นาทีที่แล้ว`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ชม. ที่แล้ว`;
    return `${Math.floor(hrs / 24)} วันที่แล้ว`;
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {Object.entries(grouped).map(([type, typePins]) => {
        const cat = PIN_CATEGORIES.find(c => c.id === type) || PIN_CATEGORIES[PIN_CATEGORIES.length - 1];
        return (
          <div key={type}>
            <div className="section-header">
              <span>{cat.emoji} {cat.label} ({typePins.length})</span>
            </div>
            <div className="space-y-2">
              {typePins.map(pin => (
                <button
                  key={pin.id}
                  onClick={() => onSelect && onSelect(pin)}
                  className="w-full text-left glass-card p-3 hover:-translate-y-0.5 hover:shadow-card transition-all flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: cat.color + '22' }}>
                    {cat.image ? <img src={cat.image} alt="" className="h-8 w-8 object-contain" /> : cat.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{pin.title}</p>
                    <p className="text-[10px] text-gray-400">{timeAgo(pin.createdAt)}</p>
                  </div>
                  {pin.confidence >= 60 && <span className="text-[10px]">✅</span>}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {activePins.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <span className="text-4xl block mb-2">📍</span>
          <p className="text-sm">ยังไม่มีหมุด</p>
        </div>
      )}
    </div>
  );
}
