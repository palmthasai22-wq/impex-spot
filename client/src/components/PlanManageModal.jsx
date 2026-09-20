import React, { useState, useEffect } from 'react';
import { uploadImages } from '../utils/api';
import toast from 'react-hot-toast';

export default function PlanManageModal({ pin, token, onClose }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('location');
  const [locationName, setLocationName] = useState(pin.title || '');
  const [floorName, setFloorName] = useState('');
  const [floorLevel, setFloorLevel] = useState('1');
  const [zoneName, setZoneName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const pinId = pin.id || pin._id;

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const api = (await import('../utils/api')).default;
      const { data } = await api.get(`/plans/${pinId}`);
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch plans', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, [pinId]);

  useEffect(() => {
    setLocationName(pin.title || '');
    setStep('location');
  }, [pinId, pin.title]);

  useEffect(() => () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const resetDraft = (nextFloor = plans.length + 2) => {
    setStep('location');
    setLocationName(pin.title || '');
    setFloorName('');
    setFloorLevel(String(nextFloor));
    setZoneName('');
    setDescription('');
    setImageFile(null);
    setImagePreview(null);
  };

  const confirmLocation = () => {
    const cleanLocation = locationName.trim();
    const cleanFloor = floorName.trim();
    if (!cleanLocation) return toast.error('กรุณาระบุอาคารหรือสถานที่ก่อน');
    if (!cleanFloor) return toast.error('กรุณาระบุชั้นก่อนเพิ่มภาพ');
    const duplicate = plans.some(plan =>
      String(plan.locationName || pin.title || '').trim().toLocaleLowerCase('th-TH') === cleanLocation.toLocaleLowerCase('th-TH') &&
      String(plan.floorName || '').trim().toLocaleLowerCase('th-TH') === cleanFloor.toLocaleLowerCase('th-TH') &&
      String(plan.zoneName || '').trim().toLocaleLowerCase('th-TH') === zoneName.trim().toLocaleLowerCase('th-TH')
    );
    if (duplicate) return toast.error('อาคาร ชั้น และโซนนี้มีแผนผังอยู่แล้ว');
    setStep('image');
  };

  const handleImageSelect = (e) => {
    if (step !== 'image') return toast.error('กรุณายืนยันอาคารและชั้นก่อนเลือกภาพ');
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ไฟล์ใหญ่เกิน 5MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (step !== 'image') return toast.error('กรุณาระบุอาคารและชั้นก่อน');
    if (!imageFile) return toast.error('กรุณาเลือกรูปแผนผัง');
    setIsUploading(true);
    try {
      const urls = await uploadImages([imageFile]);
      const planImageUrl = urls[0];

      const api = (await import('../utils/api')).default;
      await api.post('/plans', {
        linkedPinId: pinId,
        locationName: locationName.trim(),
        floorName: floorName.trim(),
        floorLevel: floorLevel.trim(),
        floorOrder: Number(floorLevel) || plans.length + 1,
        zoneName: zoneName.trim(),
        description: description.trim(),
        planImageUrl,
      });

      toast.success('🎉 เพิ่มแผนผังสำเร็จ!');
      resetDraft();
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('ลบแผนผังนี้และหมุดร้านค้าทั้งหมดภายใน?')) return;
    try {
      const api = (await import('../utils/api')).default;
      await api.delete(`/plans/${planId}`);
      toast.success('ลบแผนผังสำเร็จ');
      fetchPlans();
    } catch (err) {
      toast.error('ลบไม่สำเร็จ');
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-500 text-white p-4 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="font-bold text-sm">📐 จัดการแผนผัง</h3>
            <p className="text-[10px] text-violet-200 mt-0.5">{pin.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Existing plans */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-2">แผนผังที่มี ({plans.length})</h4>
            {loading ? (
              <div className="text-center py-6 text-gray-400 text-sm">กำลังโหลด...</div>
            ) : plans.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                <span className="text-3xl block mb-2">🏗️</span>
                <p className="text-xs text-gray-400">ยังไม่มีแผนผังสำหรับสถานที่นี้</p>
              </div>
            ) : (
              <div className="space-y-2">
                {plans.map((plan) => (
                  <div key={plan.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <img src={plan.planImageUrl} alt={plan.floorName} className="w-16 h-16 rounded-lg object-cover bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-violet-600 truncate">{plan.locationName || pin.title}</p>
                      <p className="text-sm font-bold text-gray-700 truncate">{plan.floorName}</p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {plan.zoneName ? `${plan.zoneName} · ` : ''}{new Date(plan.createdAt).toLocaleDateString('th-TH')}
                      </p>
                    </div>
                    <button onClick={() => handleDelete(plan.id)}
                      className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-all text-sm flex-shrink-0">
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add new plan */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="text-sm font-bold text-gray-700">➕ เพิ่มแผนผังใหม่</h4>
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <span className={`px-2 py-1 rounded-full ${step === 'location' ? 'bg-violet-500 text-white' : 'bg-emerald-100 text-emerald-700'}`}>1 สถานที่</span>
                <span className="text-gray-300">→</span>
                <span className={`px-2 py-1 rounded-full ${step === 'image' ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-400'}`}>2 รูปแผนผัง</span>
              </div>
            </div>

            <div className="space-y-3">
              {step === 'location' ? (
                <>
                  <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3 text-xs text-violet-800">
                    <strong className="block mb-1">📍 จะเพิ่มแผนผังตรงไหน?</strong>
                    ระบุอาคาร ชั้น และโซนให้เรียบร้อยก่อน ระบบจึงจะเปิดให้อัปโหลดภาพ
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">อาคาร / สถานที่ *</label>
                    <input type="text" className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      placeholder="เช่น IMPACT Arena" value={locationName} onChange={(e) => setLocationName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-[1fr_92px] gap-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">ชื่อชั้น *</label>
                      <input type="text" className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        placeholder="เช่น ชั้น 1 หรือ B1" value={floorName} onChange={(e) => setFloorName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">ลำดับชั้น</label>
                      <input type="number" className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400"
                        value={floorLevel} onChange={(e) => setFloorLevel(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">โซน / ส่วนอาคาร</label>
                    <input type="text" className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-violet-400"
                      placeholder="เช่น Hall 1–3, โซน A" value={zoneName} onChange={(e) => setZoneName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">คำอธิบาย</label>
                    <textarea rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none resize-none focus:border-violet-400"
                      placeholder="รายละเอียดของพื้นที่ชั้นนี้" value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <button onClick={confirmLocation} className="w-full h-11 rounded-xl bg-violet-500 text-white text-sm font-bold hover:bg-violet-600 active:scale-95 transition-all">
                    ยืนยันตำแหน่ง แล้วเพิ่มภาพ →
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                    <div className="min-w-0 text-xs text-emerald-800">
                      <strong className="block truncate">🏢 {locationName}</strong>
                      <span>{floorName}{zoneName ? ` · ${zoneName}` : ''}</span>
                    </div>
                    <button onClick={() => { setStep('location'); setImageFile(null); setImagePreview(null); }} className="shrink-0 text-[11px] font-bold text-violet-600">แก้ไข</button>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">รูปแผนผัง *</label>
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="ตัวอย่างแผนผัง" className="w-full max-h-56 object-contain rounded-xl bg-gray-100" />
                        <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow-lg">✕</button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center gap-2 p-7 border-2 border-dashed border-violet-300 rounded-xl cursor-pointer hover:border-violet-500 hover:bg-violet-50/50 transition-all">
                        <span className="text-3xl">🗺️</span>
                        <span className="text-xs text-gray-600 font-bold">เลือกรูปแผนผังของชั้นนี้</span>
                        <span className="text-[10px] text-gray-400">JPEG, PNG, WebP ไม่เกิน 5MB</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageSelect} />
                      </label>
                    )}
                  </div>
                  <button onClick={handleUpload} disabled={!imageFile || isUploading}
                    className="w-full h-11 rounded-xl bg-violet-500 text-white text-sm font-bold hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {isUploading ? 'กำลังอัปโหลด...' : `📐 เพิ่มแผนผัง ${floorName}`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
