import React from 'react';
import { useAppContext } from '../context/AppContext';
import { SITUATION_CATEGORIES, PLACE_CATEGORIES, SHARE_CATEGORIES } from '../utils/categories';

const TIME_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: '1h', label: '1 ชม.' },
  { value: '6h', label: '6 ชม.' },
  { value: '24h', label: '24 ชม.' },
];

export default function FilterPanel({ onClose }) {
  const { filters, setFilters } = useAppContext();

  const toggleType = (typeId) => {
    setFilters(prev => {
      const types = prev.types.includes(typeId)
        ? prev.types.filter(t => t !== typeId)
        : [...prev.types, typeId];
      return { ...prev, types };
    });
  };

  const renderChips = (cats) => cats.map(cat => {
    const active = filters.types.includes(cat.id);
    return (
      <button key={cat.id} onClick={() => toggleType(cat.id)}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer ${
          active
            ? 'text-white shadow-md scale-105'
            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
        }`}
        style={active ? { backgroundColor: cat.color, borderColor: cat.color } : {}}>
        <span>{cat.emoji}</span> {cat.label}
      </button>
    );
  });

  const activeCount = filters.types.length + (filters.verified ? 1 : 0) + (filters.timeRange !== 'all' ? 1 : 0);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute right-0 top-0 bottom-0 w-72 sm:w-80 bg-white/95 backdrop-blur-xl shadow-glass flex flex-col z-[1001]" style={{animation: 'slideRight 0.3s ease-out'}}>
        {/* Header */}
        <div className="bg-brand-gradient text-white p-5 flex justify-between items-center">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <span>🔍</span> ตัวกรอง
            {activeCount > 0 && (
              <span className="bg-accent-400 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full">{activeCount}</span>
            )}
          </h3>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Section: สถานการณ์ */}
          <div>
            <div className="section-header"><span>🚦 สถานการณ์ (รู้ทัน)</span></div>
            <div className="flex flex-wrap gap-2">{renderChips(SITUATION_CATEGORIES)}</div>
          </div>

          {/* Section: สถานที่ */}
          <div>
            <div className="section-header"><span>📍 สถานที่ (ปักหมุด)</span></div>
            <div className="flex flex-wrap gap-2">{renderChips(PLACE_CATEGORIES)}</div>
          </div>

          {/* Section: แบ่งปัน */}
          <div>
            <div className="section-header"><span>💬 แบ่งปัน / รีวิว</span></div>
            <div className="flex flex-wrap gap-2">{renderChips(SHARE_CATEGORIES)}</div>
          </div>

          {/* Section: ความน่าเชื่อถือ */}
          <div>
            <div className="section-header"><span>✅ ความน่าเชื่อถือ</span></div>
            <label className="flex items-center gap-3 cursor-pointer glass-card p-3 border border-brand-100">
              <input type="checkbox" className="w-5 h-5 rounded-lg accent-brand-600"
                checked={filters.verified} onChange={e => setFilters(f => ({...f, verified: e.target.checked}))} />
              <span className="text-sm font-medium text-brand-700">เฉพาะที่ยืนยันแล้ว ✅</span>
            </label>
          </div>

          {/* Section: ช่วงเวลา */}
          <div>
            <div className="section-header"><span>⏰ ช่วงเวลา</span></div>
            <div className="grid grid-cols-4 gap-2">
              {TIME_OPTIONS.map(opt => (
                <button key={opt.value}
                  onClick={() => setFilters(f => ({...f, timeRange: opt.value}))}
                  className={`py-2.5 px-1 rounded-xl text-xs font-semibold transition-all ${
                    filters.timeRange === opt.value
                      ? 'bg-brand-600 text-white shadow-float'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100">
          <button onClick={() => setFilters({ types: [], verified: false, timeRange: 'all' })}
            className="btn-outline w-full py-3 rounded-2xl text-sm">
            🗑️ ล้างตัวกรองทั้งหมด
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}
