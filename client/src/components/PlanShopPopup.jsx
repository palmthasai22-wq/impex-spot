import React from 'react';

export default function PlanShopPopup({ shop, onClose, isAdmin, onDelete }) {
  return (
    <div className="absolute z-[60] bg-white rounded-2xl shadow-2xl border border-gray-100 w-64 animate-fade-in overflow-hidden"
      style={{ transform: 'translate(-50%, -110%)' }}>
      {/* Header */}
      <div className="p-3 flex items-start gap-3">
        {shop.imageUrl ? (
          <img src={shop.imageUrl} alt={shop.name} className="w-14 h-14 rounded-xl object-cover bg-gray-100 flex-shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl flex-shrink-0">🏪</div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-gray-800 leading-tight">{shop.name}</h4>
          {shop.description && (
            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{shop.description}</p>
          )}
          <p className="text-[9px] text-gray-300 mt-1">
            {shop.createdAt ? new Date(shop.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : ''}
          </p>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 text-xs flex-shrink-0 transition-all">
          ✕
        </button>
      </div>

      {/* Admin delete */}
      {isAdmin && onDelete && (
        <div className="px-3 pb-3">
          <button onClick={() => onDelete(shop.id)}
            className="w-full h-8 rounded-lg border border-red-200 text-[10px] font-semibold text-red-500 hover:bg-red-50 transition-all">
            🗑️ ลบหมุดนี้ (Admin)
          </button>
        </div>
      )}
    </div>
  );
}
