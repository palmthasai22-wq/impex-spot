import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ConfidenceBadge from './ConfidenceBadge';
import ExpiryCountdown from './ExpiryCountdown';
import StarRating from './StarRating';
import { PIN_CATEGORIES } from '../utils/categories';
import { verifyPin } from '../utils/api';
import toast from 'react-hot-toast';

export default function PinInfoWindow({ pin, onClose }) {
  const category = PIN_CATEGORIES.find(c => c.id === (pin.type || pin.category)) || PIN_CATEGORIES[PIN_CATEGORIES.length - 1];
  const shareCategories = ['restaurant', 'market', 'shop', 'event', 'review'];
  const hasRating = shareCategories.includes(pin.type || pin.category);
  const averageRating = Number(pin.averageRating || pin.reviewRating || 0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);

  useEffect(() => {
    if (!expandedImage) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setExpandedImage(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [expandedImage]);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      await verifyPin(pin.id || pin._id);
      toast.success('✅ ยืนยันสำเร็จ! ขอบคุณที่ช่วยชุมชน 💙');
    } catch (err) {
      toast.error('ยืนยันไม่ได้ อาจยืนยันไปแล้ว 😅');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleNavigate = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`, '_blank');
  };

  const timeAgo = (date) => {
    if (!date) return '';
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'เมื่อสักครู่';
    if (mins < 60) return `${mins} นาทีที่แล้ว`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`;
    return `${Math.floor(hrs / 24)} วันที่แล้ว`;
  };

  return (
    <div className="w-[260px] p-1 font-sans max-h-[45vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
          style={{backgroundColor: category.color + '18', border: `2px solid ${category.color}40`}}>
          {category.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-gray-800 leading-tight mb-0.5">{pin.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
              style={{backgroundColor: category.color + '15', color: category.color}}>
              {category.emoji} {category.label}
            </span>
            {pin.createdAt && <span className="text-[10px] text-gray-400">{timeAgo(pin.createdAt)}</span>}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
        <ConfidenceBadge score={pin.confidence || 0} />
        <ExpiryCountdown expiresAt={pin.expiresAt} />
      </div>

      {/* Rating */}
      {hasRating && (
        <div className="mb-2 flex items-center gap-2">
          <StarRating value={averageRating} size="small" />
          <span className="text-[10px] font-semibold text-gray-500">
            {averageRating > 0 ? averageRating.toFixed(1) : 'ยังไม่มีคะแนน'}
          </span>
        </div>
      )}

      {/* Description */}
      {pin.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-3 leading-relaxed bg-gray-50 p-2.5 rounded-xl">{pin.description}</p>
      )}

      {/* Images */}
      {pin.images && pin.images.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto mb-3">
          {pin.images.map((img, i) => (
            <img key={i} src={typeof img === 'string' ? img : img?.url || img?.preview} alt={`รูปภาพ ${i + 1}`} onClick={() => setExpandedImage(typeof img === 'string' ? img : img?.url || img?.preview)} className="h-16 w-16 object-contain rounded-xl bg-gray-100 shadow-sm flex-shrink-0 hover:scale-105 transition-transform cursor-zoom-in" />
          ))}
        </div>
      )}

      {/* Verifications info */}
      {(pin.verifications?.length || 0) > 0 && (
        <p className="text-[10px] text-emerald-600 mb-2.5 font-medium">
          👥 ยืนยันแล้ว {pin.verifications.length} คน
        </p>
      )}

      {/* Responder / Admin Help info for emergency pins */}
      {(pin.type === 'emergency' || pin.category === 'emergency') && pin.dispatchStatus && pin.dispatchStatus !== 'pending' && (
        <div className="mb-2.5 rounded-xl border border-blue-100 bg-blue-50 p-2.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">🛡️</span>
            <span className="text-[11px] font-bold text-blue-800">ทีมช่วยเหลือ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              pin.dispatchStatus === 'on_scene' ? 'bg-green-500' :
              pin.dispatchStatus === 'dispatched' ? 'bg-blue-500' :
              'bg-yellow-500'
            }`}></span>
            <span className="text-[10px] font-semibold text-blue-700">
              {pin.dispatchStatus === 'on_scene' ? 'ถึงที่เกิดเหตุแล้ว' :
               pin.dispatchStatus === 'dispatched' ? 'กำลังเดินทาง' :
               pin.dispatchStatus === 'acknowledged' ? 'ทีมรับทราบแล้ว' :
               pin.dispatchStatus === 'coordinating' ? 'กำลังประสานงาน' :
               pin.dispatchStatus === 'resolved' ? 'จัดการเสร็จแล้ว' : pin.dispatchStatus}
            </span>
          </div>
          {pin.assignedResponderName && (
            <p className="text-[10px] text-blue-600 mt-1">👤 {pin.assignedResponderName}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-1.5 pt-2.5 border-t border-gray-100">
        <button onClick={handleVerify} disabled={isVerifying}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all border border-emerald-100">
          ✅ ยืนยัน
        </button>
        <button onClick={handleNavigate}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-95 transition-all border border-blue-100">
          🧭 นำทาง
        </button>
      </div>

      {/* Navigate hint */}
      <p className="text-[9px] text-gray-300 text-center mt-2">กดนำทางจะเปิด Google Maps ให้อัตโนมัติ</p>

      {expandedImage && createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 p-4 cursor-zoom-out" onClick={() => setExpandedImage(null)} role="dialog" aria-modal="true" aria-label="ดูภาพขนาดใหญ่">
          <button type="button" onClick={() => setExpandedImage(null)} aria-label="ปิดภาพขนาดใหญ่" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-2xl text-gray-700 shadow-lg">✕</button>
          <img src={expandedImage} alt="ภาพขนาดใหญ่" className="max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] rounded-xl object-contain shadow-2xl" onClick={(event) => event.stopPropagation()} />
        </div>,
        document.body,
      )}
    </div>
  );
}
