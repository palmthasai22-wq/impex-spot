import React, { useState } from 'react';
import { EMERGENCY_TYPES } from '../utils/categories';
import EmergencyCallBar from './EmergencyCallBar';
import ImageUpload from './ImageUpload';
import useGeolocation from '../hooks/useGeolocation';
import { createEmergency, uploadImages } from '../utils/api';
import toast from 'react-hot-toast';

export default function EmergencyForm({ onClose, initialPosition = null }) {
  const [type, setType] = useState('');
  const [injured, setInjured] = useState(0);
  const [conscious, setConscious] = useState('unknown');
  const [symptoms, setSymptoms] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { lat, lng } = useGeolocation();
  const selectedLat = initialPosition?.[0] ?? lat;
  const selectedLng = initialPosition?.[1] ?? lng;

  const handleSubmit = async () => {
    if (!type) return toast.error('กรุณาเลือกประเภทเหตุก่อนนะ');
    if (selectedLat === null || selectedLat === undefined || selectedLng === null || selectedLng === undefined) return toast.error('กรุณาเลือกพื้นที่เกิดเหตุบนแผนที่');
    const emergencyType = EMERGENCY_TYPES.find(item => item.id === type);
    setIsSubmitting(true);
    try {
      const imagesToUpload = images.map(image => image.file).filter(Boolean);
      const imageUrls = imagesToUpload.length > 0
        ? await uploadImages(imagesToUpload)
        : [];

      await createEmergency({
        title: emergencyType?.label || 'เหตุฉุกเฉิน',
        emergencyType: type,
        injuryCount: injured,
        injuryDetails: injured > 0 ? { conscious, symptoms } : undefined,
        description,
        images: imageUrls,
        lat: selectedLat,
        lng: selectedLng
      });
      toast.success('🚨 แจ้งเหตุสำเร็จ! ขอบคุณที่ช่วยเหลือ');
      onClose();
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet border-2 border-red-400/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl animate-pulse">🚨</span>
            <div>
              <h2 className="text-lg font-bold">แจ้งเหตุฉุกเฉิน</h2>
              <p className="text-[10px] text-red-200">ข้อมูลจะช่วยให้คนใกล้เคียงรับรู้ได้เร็วขึ้น</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Reassurance */}
          <div className="bg-amber-50 px-5 py-3 border-b border-amber-100 flex items-start gap-2">
            <span className="text-lg">💡</span>
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>ถ้าต้องการความช่วยเหลือเร่งด่วน</strong> กรุณาโทรหาหน่วยงานด้านล่างก่อน แล้วค่อยแจ้งผ่านระบบเพื่อกระจายข่าว
            </p>
          </div>

          {/* Call Bar */}
          <EmergencyCallBar />

          <div className="p-5 space-y-5">
            <div className="section-header text-red-600"><span>📋 แจ้งเหตุผ่านระบบ</span></div>

            <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
              📍 พื้นที่เกิดเหตุ: {selectedLat !== null && selectedLat !== undefined && selectedLng !== null && selectedLng !== undefined
                ? `${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`
                : 'ยังไม่ได้เลือกพื้นที่'}
            </div>

            {/* Type Grid */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">เกิดอะไรขึ้น? *</label>
              <div className="grid grid-cols-4 gap-2">
                {EMERGENCY_TYPES.map(et => (
                  <button key={et.id} onClick={() => setType(et.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all active:scale-95 ${
                      type === et.id ? 'border-red-500 bg-red-50 shadow-md' : 'border-gray-100 bg-white hover:border-red-200'
                    }`}>
                    <span className="text-2xl">{et.emoji}</span>
                    <span className="text-[9px] font-semibold text-center leading-tight">{et.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Injury */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">มีผู้บาดเจ็บไหม?</label>
              <div className="flex items-center gap-3">
                <input type="number" min="0" className="input-modern w-24 text-center" value={injured}
                  onChange={e => setInjured(parseInt(e.target.value) || 0)} />
                <span className="text-xs text-gray-400">คน (ประมาณ)</span>
              </div>
            </div>

            {/* Consciousness */}
            {injured > 0 && (
              <div className="animate-fade-in">
                <label className="block text-sm font-bold text-gray-700 mb-2">ผู้บาดเจ็บรู้สึกตัวไหม?</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: 'yes', label: 'รู้สึกตัว', emoji: '😊', bg: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                    { v: 'no', label: 'หมดสติ', emoji: '😵', bg: 'bg-red-50 border-red-200 text-red-700' },
                    { v: 'unknown', label: 'ไม่ทราบ', emoji: '🤷', bg: 'bg-gray-50 border-gray-200 text-gray-600' },
                  ].map(opt => (
                    <button key={opt.v} onClick={() => setConscious(opt.v)}
                      className={`py-3 rounded-xl text-xs font-semibold border-2 flex flex-col items-center gap-1 transition-all active:scale-95 ${
                        conscious === opt.v ? opt.bg + ' shadow-md' : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'
                      }`}>
                      <span className="text-lg">{opt.emoji}</span> {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Symptoms */}
            {injured > 0 && (
              <div className="animate-fade-in">
                <label className="block text-sm font-bold text-gray-700 mb-1.5">อาการเบื้องต้น</label>
                <textarea className="textarea-modern" rows="2" placeholder="เช่น มีแผลที่แขน, หายใจลำบาก, มีเลือดออก 🩺"
                  value={symptoms} onChange={e => setSymptoms(e.target.value)} />
                <p className="text-[10px] text-gray-400 mt-1 ml-1">💡 ข้อมูลนี้จะช่วยให้ผู้ช่วยเตรียมตัวได้ดีขึ้น</p>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">รายละเอียดเพิ่มเติม</label>
              <textarea className="textarea-modern" rows="3" placeholder="อธิบายสถานการณ์เพิ่มเติม เช่น เกิดตรงไหน มีรถกี่คัน..."
                value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">📷 รูปภาพ (ถ้ามี)</label>
              <ImageUpload images={images} onChange={setImages} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-red-100 bg-red-50/30">
          <button onClick={handleSubmit} disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-4 rounded-2xl shadow-lg hover:from-red-700 hover:to-red-800 active:scale-[0.98] transition-all text-base disabled:opacity-50">
            {isSubmitting ? '⏳ กำลังส่งข้อมูล...' : '🚨 ยืนยันการแจ้งเหตุ'}
          </button>
          <p className="text-[9px] text-gray-400 text-center mt-2">
            ⚠️ ระบบนี้ช่วยกระจายข้อมูล ไม่ใช่หน่วยกู้ภัย กรุณาโทรแจ้งเจ้าหน้าที่ด้วย
          </p>
        </div>
      </div>
    </div>
  );
}
