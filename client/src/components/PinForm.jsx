import React, { useState } from 'react';
import { SITUATION_CATEGORIES, PLACE_CATEGORIES, SHARE_CATEGORIES } from '../utils/categories';
import ImageUpload from './ImageUpload';
import StarRating from './StarRating';
import { createPin, uploadImages } from '../utils/api';
import useGeolocation from '../hooks/useGeolocation';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

export default function PinForm({ onClose, initialPosition, initialCategory = '', onEmergency }) {
  const [step, setStep] = useState(1); // 1=category, 2=details
  const [formData, setFormData] = useState({
    title: '', category: initialCategory, customType: '', description: '', images: [], trafficLevel: 'medium', reviewRating: 3, reviewNote: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setPins } = useAppContext();
  const { lat: gpsLat, lng: gpsLng, accuracy, error, loading } = useGeolocation();
  const [pinPosition, setPinPosition] = useState(initialPosition || null);
  const selectedLat = pinPosition?.[0] ?? gpsLat;
  const selectedLng = pinPosition?.[1] ?? gpsLng;

  const handleSubmit = async () => {
    if (!formData.title) return toast.error('กรุณาระบุชื่อสถานที่นะคะ 😊');
    if (!formData.category) return toast.error('กรุณาเลือกประเภทด้วยนะ');
    if (!selectedLat || !selectedLng) return toast.error('ไม่สามารถดึงตำแหน่งได้ กรุณาอนุญาต GPS หรือคลิกเลือกบนแผนที่ 😅');
    const isShareCategory = ['restaurant', 'market', 'shop', 'event', 'review'].includes(formData.category);
    if (isShareCategory && (formData.reviewRating < 2 || formData.reviewRating > 5)) {
      return toast.error('ให้คะแนนรีวิวได้ตั้งแต่ 2 ถึง 5 ดาวเท่านั้น');
    }

    setIsSubmitting(true);
    try {
      // Upload images if any
      let imageUrls = [];
      if (formData.images && formData.images.length > 0) {
        const imagesToUpload = formData.images.map(img => img.file).filter(Boolean);
        if (imagesToUpload.length > 0) {
          imageUrls = await uploadImages(imagesToUpload);
        }
      }

      const createdPin = await createPin({ 
        ...formData,
        lat: selectedLat,
        lng: selectedLng,
        gpsAccuracy: accuracy,
        images: imageUrls,
        type: formData.category,
        reviewRating: isShareCategory ? Number(formData.reviewRating) : undefined,
        reviewNote: isShareCategory ? formData.reviewNote : undefined,
      });
      setPins(currentPins => [...currentPins, createdPin]);
      toast.success('🎉 ปักหมุดสำเร็จ! ขอบคุณที่ช่วยชุมชน');
      onClose();
    } catch (err) {
      const message = err.response?.data?.error || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้งนะ';
      toast.error(`${message}${err.response?.status ? ` (${err.response.status})` : ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const expiry = { label: '30 วัน' };
  const selectedCatLabel = [...SITUATION_CATEGORIES,...PLACE_CATEGORIES,...SHARE_CATEGORIES,{id:'other',label:'อื่นๆ',emoji:'📌'}].find(c=>c.id===formData.category);

  const renderCategorySection = (title, emoji, desc, cats) => (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-lg">{emoji}</span>
        <div>
          <p className="text-sm font-bold text-gray-700">{title}</p>
          <p className="text-[10px] text-gray-400">{desc}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {cats.map(cat => (
          <button key={cat.id} type="button"
            onClick={() => { setFormData({...formData, category: cat.id}); }}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all duration-200 active:scale-95 ${
              formData.category === cat.id
                ? 'border-brand-500 bg-brand-50 shadow-md scale-[1.02]'
                : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}>
            <span className="text-2xl">{cat.emoji}</span>
            <span className="text-[10px] font-semibold leading-tight text-center text-gray-700">{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        {/* Header */}
        <div className="bg-brand-gradient text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">📍</span>
            <div>
              <h2 className="text-lg font-bold">{step === 1 ? 'เลือกประเภท' : 'กรอกรายละเอียด'}</h2>
              <p className="text-[10px] text-blue-200">ขั้นตอนที่ {step} จาก 2</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">✕</button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-accent-400 transition-all duration-500 rounded-full" style={{width: step === 1 ? '50%' : '100%'}} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 ? (
            /* Step 1: Choose Category */
            <div className="animate-fade-in">
              <div className="text-center mb-6">
                <span className="text-4xl block mb-2">🤔</span>
                <p className="text-sm text-gray-500">คุณอยากแบ่งปันอะไรให้ชุมชน?</p>
              </div>
              {onEmergency && (
                <button type="button" onClick={onEmergency}
                  className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-left transition-all hover:border-red-200 hover:bg-red-100 active:scale-[0.99]">
                  <img src="/images/mascot_alert.png" alt="" className="h-12 w-12 object-contain" />
                  <span className="flex-1">
                    <span className="block text-sm font-black text-red-700">แจ้งสถานการณ์ทันที</span>
                    <span className="mt-0.5 block text-[10px] text-red-500">เหตุฉุกเฉิน รถชน คนเจ็บ ไฟไหม้ หรือน้ำท่วม</span>
                  </span>
                  <span className="text-lg font-black text-red-500">→</span>
                </button>
              )}
              {renderCategorySection('สถานการณ์', '🚦', 'รถติด อุบัติเหตุ ปัญหาต่างๆ', SITUATION_CATEGORIES)}
              {renderCategorySection('สถานที่', '📍', 'ห้องน้ำ จุดชาร์จ ร้านสะดวกซื้อ', PLACE_CATEGORIES)}
              {renderCategorySection('แบ่งปัน & รีวิว', '💬', 'ร้านอาหาร ตลาดนัด รีวิว', SHARE_CATEGORIES)}

              <button type="button" onClick={() => setFormData({...formData, category: 'other'})}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                  formData.category === 'other' ? 'border-brand-500 bg-brand-50' : 'border-gray-100 bg-white hover:border-gray-300'
                }`}>
                <span className="text-xl">📌</span>
                <span className="text-xs font-semibold text-gray-700">อื่นๆ (ระบุเอง)</span>
              </button>

              {expiry && (
                <div className="mt-3 flex items-center gap-2 text-xs text-brand-600 bg-brand-50 px-4 py-2 rounded-xl">
                  <span>⏱</span> อายุข้อมูล: {expiry.label}
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Fill Details */
            <div className="space-y-5 animate-fade-in">
              {/* Selected category */}
              {selectedCatLabel && (
                <div className="flex items-center gap-3 glass-card p-3 border border-brand-100">
                  <span className="text-2xl">{selectedCatLabel.emoji}</span>
                  <div>
                    <p className="text-xs text-gray-400">ประเภทที่เลือก</p>
                    <p className="font-bold text-sm text-brand-700">{selectedCatLabel.label}</p>
                  </div>
                  <button onClick={() => setStep(1)} className="ml-auto text-xs text-brand-500 hover:text-brand-700 font-semibold">เปลี่ยน</button>
                </div>
              )}

              {/* GPS Info */}
              <div className="glass-card p-3 border border-green-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">📡</span>
                  <span className="text-xs font-bold text-green-700">ตำแหน่งที่จะปักหมุด</span>
                </div>
                {pinPosition ? (
                  <>
                    <p className="text-xs text-green-700">✅ จุดที่เลือกบนแผนที่ ({selectedLat.toFixed(4)}, {selectedLng.toFixed(4)})</p>
                    {gpsLat !== null && gpsLng !== null && (
                      <button type="button" onClick={() => setPinPosition(null)} className="mt-2 text-[10px] font-bold text-blue-600 hover:text-blue-800">
                        📍 ใช้ตำแหน่ง GPS ปัจจุบันแทน
                      </button>
                    )}
                  </>
                ) : loading ? (
                  <p className="text-xs text-gray-400 flex items-center gap-1">⏳ กำลังหาตำแหน่ง กรุณารอสักครู่...</p>
                ) : error ? (
                  <p className="text-xs text-red-500">😅 {error} หรือกลับไปคลิกเลือกจุดบนแผนที่</p>
                ) : (
                  <>
                    <p className="text-xs text-gray-500">✅ GPS พร้อมแล้ว ({selectedLat?.toFixed(6)}, {selectedLng?.toFixed(6)})</p>
                    {accuracy && <p className="mt-1 text-[10px] text-gray-400">ความแม่นยำประมาณ {Math.round(accuracy)} เมตร</p>}
                  </>
                )}
              </div>

              {formData.category === 'traffic' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ระดับรถติด</label>
                  <select className="input-modern" value={formData.trafficLevel}
                    onChange={e => setFormData({...formData, trafficLevel: e.target.value})}>
                    <option value="high">แดง: รถติดมาก</option>
                    <option value="medium">เหลือง: รถติดปานกลาง</option>
                    <option value="low">เขียว: รถไม่ติด</option>
                  </select>
                </div>
              )}

              {/* Custom type */}
              {formData.category === 'other' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ระบุประเภท</label>
                  <input type="text" className="input-modern" placeholder="เช่น จุดจอดรถ, ป้ายรถเมล์ 🚌"
                    value={formData.customType} onChange={e => setFormData({...formData, customType: e.target.value})} />
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">ชื่อสถานที่/เหตุการณ์ *</label>
                <input type="text" className="input-modern" placeholder="เช่น ห้องน้ำชั้น 2 อาคาร A, รถชนแยกหลัก"
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                <p className="text-[10px] text-gray-400 mt-1 ml-1">💡 ตั้งชื่อให้คนอื่นเข้าใจง่ายนะ</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">หมายเหตุ / คำอธิบาย</label>
                <textarea className="textarea-modern" rows="3" placeholder="รายละเอียดเพิ่มเติม เช่น อยู่ตรงไหน สภาพเป็นอย่างไร..."
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              {['restaurant', 'market', 'shop', 'event', 'review'].includes(formData.category) && (
                <div className="space-y-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">⭐ ให้คะแนนรีวิว (2-5 ดาว)</label>
                    <StarRating value={formData.reviewRating} onChange={value => setFormData({ ...formData, reviewRating: Math.min(5, Math.max(2, value)) })} size="large" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">ข้อมูลรีวิวเพิ่มเติม</label>
                    <textarea className="textarea-modern" rows="2" placeholder="อธิบายความประทับใจ / สรุปมุมมองของคุณ"
                      value={formData.reviewNote} onChange={e => setFormData({ ...formData, reviewNote: e.target.value })} />
                  </div>
                </div>
              )}

              {/* Images */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">📷 แนบรูปภาพ</label>
                <p className="text-[10px] text-gray-400 mb-2">ภาพช่วยเพิ่มความน่าเชื่อถือให้ข้อมูลของคุณ ✨</p>
                <ImageUpload images={formData.images} onChange={imgs => setFormData({...formData, images: imgs})} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50/50">
          {step === 1 ? (
            <button onClick={() => formData.category ? setStep(2) : toast.error('เลือกประเภทก่อนนะ 😊')}
              className="btn-primary w-full py-4 rounded-2xl text-base">
              ถัดไป → กรอกรายละเอียด
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="btn-outline py-3.5 px-5 rounded-2xl text-sm">← ย้อนกลับ</button>
              <button onClick={handleSubmit} disabled={isSubmitting || (loading && !pinPosition)}
                className="btn-primary flex-1 py-3.5 rounded-2xl text-base">
                {isSubmitting ? '⏳ กำลังบันทึก...' : '📍 บันทึกหมุด!'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
