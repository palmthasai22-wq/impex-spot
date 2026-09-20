import React, { useState } from 'react';
import { SITUATION_CATEGORIES, PLACE_CATEGORIES, SHARE_CATEGORIES, ADMIN_ONLY_CATEGORIES, EXPIRY_CONFIG } from '../utils/categories';
import ImageUpload from './ImageUpload';
import ImageCropper from './ImageCropper';
import StarRating from './StarRating';
import { createPin, uploadImages } from '../utils/api';
import useGeolocation from '../hooks/useGeolocation';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';
import LiveViewer from './LiveViewer';

export default function PinForm({ onClose, initialPosition, initialCategory = '', onEmergency, isAdmin, indoorData = null }) {
  const [step, setStep] = useState(1); // 1=category, 2=details
  const [formData, setFormData] = useState({
    title: '', category: initialCategory, customType: '', description: '', images: [], trafficLevel: 'medium', reviewRating: 3, reviewNote: '', external_stream_url: '', ai_detection_url: '', camera_category: 'แยกหลัก',
    isPermanent: true, expiryHours: 24, customIcon: null
  });
  const [showPreview, setShowPreview] = useState(false);
  const [cropSource, setCropSource] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setPins } = useAppContext();
  const { lat: gpsLat, lng: gpsLng, accuracy, error, loading } = useGeolocation();
  const [pinPosition, setPinPosition] = useState(initialPosition || null);
  const selectedLat = pinPosition?.[0] ?? gpsLat;
  const selectedLng = pinPosition?.[1] ?? gpsLng;

  const handleSubmit = async () => {
    if (!formData.title) return toast.error('กรุณาระบุชื่อสถานที่นะคะ 😊');
    if (!formData.category) return toast.error('กรุณาเลือกประเภทด้วยนะ');
    if (!indoorData && (!selectedLat || !selectedLng)) return toast.error('ไม่สามารถดึงตำแหน่งได้ กรุณาอนุญาต GPS หรือคลิกเลือกบนแผนที่ 😅');
    const isShareCategory = ['restaurant', 'market', 'shop', 'event', 'review'].includes(formData.category);
    if (isShareCategory && (formData.reviewRating < 2 || formData.reviewRating > 5)) {
      return toast.error('ให้คะแนนรีวิวได้ตั้งแต่ 2 ถึง 5 ดาวเท่านั้น');
    }

    setIsSubmitting(true);
    try {
      if (formData.category === 'cctv') {
        const cameraPayload = {
          name: formData.title,
          camera_category: formData.camera_category || 'จุดทั่วไป',
          lat: indoorData ? 0 : selectedLat,
          lng: indoorData ? 0 : selectedLng,
          is_indoor: !!indoorData,
          indoor_building_id: indoorData?.building_id,
          indoor_floor_id: indoorData?.floor_id,
          indoor_x: indoorData?.x,
          indoor_y: indoorData?.y,
          coverage_direction: 0,
          owner_type: 'government',
          connection_type: 'wifi_local',
          camera_ip: '',
          rtsp_path: '/stream1',
          external_stream_url: formData.external_stream_url || '',
          ai_detection_url: formData.ai_detection_url || '',
          verification_status: 'verified',
          owner_consent: true,
        };
        const res = await import('../utils/api').then(m => m.default.post('/admin/cameras', cameraPayload));
        // Add to local state so it appears immediately on the map without waiting for next poll
        setPins(currentPins => [...currentPins, {
          ...res.data,
          category: 'cctv',
          type: 'cctv',
          title: res.data.name,
          lat: indoorData ? 0 : res.data.location?.lat,
          lng: indoorData ? 0 : res.data.location?.lng,
          is_indoor: !!indoorData,
          indoor_building_id: indoorData?.building_id,
          indoor_floor_id: indoorData?.floor_id,
          indoor_x: indoorData?.x,
          indoor_y: indoorData?.y,
          _communityPin: true
        }]);
        toast.success('🎉 เพิ่มกล้อง CCTV สำเร็จ! หมุดแสดงบนแผนที่และจัดการได้ที่หน้าตั้งค่า');
        onClose();
        setIsSubmitting(false);
        return;
      }

      // Upload images if any
      let imageUrls = [];
      if (formData.category !== 'cctv' && formData.images && formData.images.length > 0) {
        const imagesToUpload = formData.images.map(img => img.file).filter(Boolean);
        if (imagesToUpload.length > 0) {
          imageUrls = await uploadImages(imagesToUpload);
        }
      }

      let customIconUrl = '';
      if (formData.category === 'custom_admin' && formData.customIcon) {
        // formData.customIcon is a blob
        const iconFile = new File([formData.customIcon], 'custom_icon.png', { type: 'image/png' });
        const [url] = await uploadImages([iconFile]);
        customIconUrl = url;
      }

      const createdPin = await createPin({ 
        ...formData,
        lat: indoorData ? 0 : selectedLat,
        lng: indoorData ? 0 : selectedLng,
        is_indoor: !!indoorData,
        indoor_building_id: indoorData?.building_id,
        indoor_floor_id: indoorData?.floor_id,
        indoor_x: indoorData?.x,
        indoor_y: indoorData?.y,
        gpsAccuracy: accuracy,
        images: imageUrls,
        type: formData.category,
        customIcon: customIconUrl || undefined,
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

  const expiry = EXPIRY_CONFIG[formData.category] || { label: '30 วัน' };
  const selectedCatLabel = [...SITUATION_CATEGORIES,...PLACE_CATEGORIES,...SHARE_CATEGORIES,...ADMIN_ONLY_CATEGORIES,{id:'other',label:'อื่นๆ',emoji:'📌'}].find(c=>c.id===formData.category);

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
            onClick={() => { setFormData({...formData, category: cat.id, images: cat.id === 'cctv' ? [] : formData.images}); }}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all duration-200 active:scale-95 ${
              formData.category === cat.id
                ? 'border-brand-500 bg-brand-50 shadow-md scale-[1.02]'
                : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}>
            {cat.image
              ? <img src={cat.image} alt="" className="h-9 w-9 object-contain" />
              : <span className="text-2xl">{cat.emoji}</span>}
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
              {isAdmin && renderCategorySection('แอดมินเท่านั้น', '🛡️', 'หมุดพิเศษสำหรับผู้ดูแลระบบ', ADMIN_ONLY_CATEGORIES)}
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
                  {selectedCatLabel.image
                    ? <img src={selectedCatLabel.image} alt="" className="h-10 w-10 object-contain" />
                    : <span className="text-2xl">{selectedCatLabel.emoji}</span>}
                  <div>
                    <p className="text-xs text-gray-400">ประเภทที่เลือก</p>
                    <p className="font-bold text-sm text-brand-700">{selectedCatLabel.label}</p>
                  </div>
                  <button onClick={() => setStep(1)} className="ml-auto text-xs text-brand-500 hover:text-brand-700 font-semibold">เปลี่ยน</button>
                </div>
              )}

              {/* GPS Info + Lat/Lng Inputs */}
              {!indoorData && (
              <div className="glass-card p-3 border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">📡</span>
                  <span className="text-xs font-bold text-green-700">ตำแหน่งที่จะปักหมุด</span>
                </div>
                {pinPosition ? (
                  <>
                    <p className="text-xs text-green-700 mb-2">✅ จุดที่เลือกบนแผนที่</p>
                    {gpsLat !== null && gpsLng !== null && (
                      <button type="button" onClick={() => setPinPosition(null)} className="mb-2 text-[10px] font-bold text-blue-600 hover:text-blue-800">
                        📍 ใช้ตำแหน่ง GPS ปัจจุบันแทน
                      </button>
                    )}
                  </>
                ) : loading ? (
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-2">⏳ กำลังหาตำแหน่ง กรุณารอสักครู่...</p>
                ) : error ? (
                  <p className="text-xs text-red-500 mb-2">😅 {error} หรือกลับไปคลิกเลือกจุดบนแผนที่</p>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-2">✅ GPS พร้อมแล้ว</p>
                    {accuracy && <p className="mb-2 text-[10px] text-gray-400">ความแม่นยำประมาณ {Math.round(accuracy)} เมตร</p>}
                  </>
                )}
                {/* Editable Lat/Lng */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Latitude (-90 ถึง 90)</label>
                    <input type="number" step="any" min="-90" max="90"
                      className="input-modern text-xs"
                      placeholder="13.9126"
                      value={selectedLat ?? ''}
                      onChange={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= -90 && v <= 90) {
                          setPinPosition([v, selectedLng ?? 0]);
                        } else if (e.target.value === '' || e.target.value === '-') {
                          // allow typing
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Longitude (-180 ถึง 180)</label>
                    <input type="number" step="any" min="-180" max="180"
                      className="input-modern text-xs"
                      placeholder="100.5530"
                      value={selectedLng ?? ''}
                      onChange={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= -180 && v <= 180) {
                          setPinPosition([selectedLat ?? 0, v]);
                        }
                      }}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">💡 กรอกพิกัดตรงนี้ หรือคลิกเลือกจุดบนแผนที่ก็ได้</p>
              </div>
              )}

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

              {/* URL สำหรับ CCTV */}
              {formData.category === 'cctv' && (
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">URL ภาพสด หรือ โค้ด iframe (ไม่บังคับ)</label>
                  <input type="text" className="input-modern" placeholder="เช่น https://... หรือ <iframe src='...'>"
                    value={formData.external_stream_url || ''} onChange={e => setFormData({...formData, external_stream_url: e.target.value})} />
                  <p className="text-[10px] text-gray-400 mt-1 ml-1">💡 หากมีลิงก์ภาพสด ผู้ใช้จะสามารถดูภาพสดจากหมุดนี้ได้ทันที</p>
                  <label className="block text-sm font-bold text-gray-700">หมวดหมู่ย่อย</label>
                  <select className="input-modern" value={formData.camera_category} onChange={e=>setFormData({...formData,camera_category:e.target.value})}><option>ทางเข้า-ออก</option><option>แยกหลัก</option><option>ลานจอดรถ</option><option>หน้าอาคาร/ฮอลล์</option><option>จุดทั่วไป</option></select>
                  <label className="block text-sm font-bold text-gray-700">URL API วิเคราะห์จราจร (แยกจากภาพสด)</label>
                  <input type="text" className="input-modern" placeholder="https://.../traffic หรือ mock:random" value={formData.ai_detection_url} onChange={e=>setFormData({...formData,ai_detection_url:e.target.value})} />
                  {formData.external_stream_url&&<><button type="button" className="w-full min-h-11 rounded-xl bg-sky-50 text-sky-700 font-bold" onClick={()=>setShowPreview(v=>!v)}>{showPreview?'ซ่อนพรีวิว':'▶ พรีวิวภาพสดก่อนบันทึก'}</button>{showPreview&&<LiveViewer camera={{external_stream_url:formData.external_stream_url,status:'online'}} />}</>}
                </div>
              )}

              {/* Custom Admin Pin Fields */}
              {formData.category === 'custom_admin' && (
                <div className="space-y-4 bg-orange-50 border border-orange-200 p-4 rounded-2xl">
                  <h3 className="font-bold text-orange-800 flex items-center gap-2">⭐ ตั้งค่าหมุดพิเศษ</h3>
                  
                  {/* Icon Upload */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">ไอคอนหมุด (รูปวงกลม)</label>
                    <div className="flex items-center gap-4">
                      {formData.customIcon ? (
                        <div className="relative w-16 h-16 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100 flex-shrink-0">
                          <img src={URL.createObjectURL(formData.customIcon)} alt="Custom Icon" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 bg-white flex items-center justify-center text-2xl text-gray-400">
                          📷
                        </div>
                      )}
                      <div className="flex-1">
                        <input type="file" accept="image/*" className="hidden" id="custom-icon-upload"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              setCropSource(URL.createObjectURL(e.target.files[0]));
                              e.target.value = ''; // reset
                            }
                          }}
                        />
                        <label htmlFor="custom-icon-upload" className="btn-outline px-4 py-2 rounded-xl text-xs cursor-pointer inline-block">
                          เลือกรูปไอคอน
                        </label>
                        <p className="text-[10px] text-gray-500 mt-1">รูปจะถูกครอบเป็นวงกลม</p>
                      </div>
                    </div>
                  </div>

                  {/* Expiry Setting */}
                  <div className="pt-2 border-t border-orange-200/50">
                    <label className="block text-sm font-bold text-gray-700 mb-2">อายุของหมุด</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="pinExpiry" checked={formData.isPermanent} onChange={() => setFormData({...formData, isPermanent: true})} />
                        ถาวร
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="pinExpiry" checked={!formData.isPermanent} onChange={() => setFormData({...formData, isPermanent: false})} />
                        ชั่วคราว
                      </label>
                    </div>
                    {!formData.isPermanent && (
                      <div className="mt-2 flex items-center gap-2">
                        <input type="number" min="1" max="720" className="input-modern text-sm w-24"
                          value={formData.expiryHours} onChange={e => setFormData({...formData, expiryHours: parseInt(e.target.value) || 1})} />
                        <span className="text-sm text-gray-600">ชั่วโมง</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

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

              {/* หมุด CCTV และ custom_admin ใช้ไอคอนพิเศษ จึงไม่รับภาพจากผู้ใช้ปกติ */}
              {formData.category !== 'cctv' && formData.category !== 'custom_admin' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">📷 แนบรูปภาพ</label>
                  <p className="text-[10px] text-gray-400 mb-2">ภาพช่วยเพิ่มความน่าเชื่อถือให้ข้อมูลของคุณ ✨</p>
                  <ImageUpload images={formData.images} onChange={imgs => setFormData({...formData, images: imgs})} />
                </div>
              )}
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

      {cropSource && (
        <ImageCropper
          imageSrc={cropSource}
          onCropComplete={(blob) => {
            setFormData({ ...formData, customIcon: blob });
            setCropSource(null);
          }}
          onCancel={() => setCropSource(null)}
        />
      )}
    </div>
  );
}
