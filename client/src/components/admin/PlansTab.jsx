import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api, { uploadImages } from '../../utils/api';

export default function PlansTab({ pins, token }) {
  const [selectedPinId, setSelectedPinId] = useState('');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [floorName, setFloorName] = useState('');
  const [floorLevel, setFloorLevel] = useState(1);
  const [floorOrder, setFloorOrder] = useState(10);
  const [zoneName, setZoneName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  
  // Filter only place/facility pins as candidates for indoor plans
  const candidatePins = pins.filter(p => p.type === 'place' || p.category === 'place' || p.category === 'facility');

  const fetchPlans = async (pinId) => {
    if (!pinId) {
      setPlans([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/plans/${pinId}`);
      setPlans(res.data);
    } catch (err) {
      toast.error('ไม่สามารถโหลดแผนผังได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans(selectedPinId);
  }, [selectedPinId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPinId) return toast.error('กรุณาเลือกหมุดสถานที่');
    if (!imageFile) return toast.error('กรุณาอัพโหลดรูปภาพแผนผัง');
    if (!floorName.trim()) return toast.error('กรุณาระบุชื่อชั้น');

    const selectedPin = pins.find(p => (p.id || p._id) === selectedPinId);
    if (!selectedPin) return;

    setIsSaving(true);
    try {
      // 1. Upload Image
      const urls = await uploadImages([imageFile]);
      if (!urls || urls.length === 0) throw new Error('อัพโหลดรูปภาพไม่สำเร็จ');
      
      const planImageUrl = urls[0];
      
      // 2. Create Plan
      const payload = {
        linkedPinId: selectedPinId,
        locationName: selectedPin.title,
        floorName,
        floorLevel: parseInt(floorLevel, 10),
        floorOrder: parseInt(floorOrder, 10),
        zoneName,
        description,
        planImageUrl
      };

      await api.post('/plans', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('อัพโหลดแผนผังสำเร็จ');
      
      // Reset form
      setFloorName('');
      setFloorLevel(1);
      setFloorOrder(10);
      setZoneName('');
      setDescription('');
      setImageFile(null);
      if (document.getElementById('plan-image-upload')) {
        document.getElementById('plan-image-upload').value = '';
      }
      
      // Refresh list
      fetchPlans(selectedPinId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกแผนผัง');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('ยืนยันการลบแผนผังและหมุดร้านค้าทั้งหมดในชั้นนี้?')) return;
    try {
      await api.delete(`/plans/${planId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('ลบแผนผังสำเร็จ');
      fetchPlans(selectedPinId);
    } catch (err) {
      toast.error('ไม่สามารถลบแผนผังได้');
    }
  };

  return (
    <section className="mb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-blue-50 border border-indigo-200">
            <span className="text-2xl">🏢</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-600">Indoor Maps</p>
            <h2 className="mt-1 text-xl font-black text-gray-900 sm:text-2xl">จัดการแผนผังอาคาร</h2>
            <p className="mt-1 text-sm text-gray-500">อัพโหลดและจัดการแผนผังภายในอาคารสำหรับแต่ละสถานที่</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* เลือสถานที่และเพิ่มแผนผัง */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-indigo-600">1.</span> เลือกสถานที่ (หมุด)
            </h3>
            <select
              value={selectedPinId}
              onChange={(e) => setSelectedPinId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">-- เลือกสถานที่ --</option>
              {candidatePins.map(pin => (
                <option key={pin.id || pin._id} value={pin.id || pin._id}>
                  {pin.title}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm opacity-100 transition-opacity" style={{ opacity: selectedPinId ? 1 : 0.5, pointerEvents: selectedPinId ? 'auto' : 'none' }}>
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-indigo-600">2.</span> อัพโหลดแผนผังใหม่
            </h3>
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700">
                รูปภาพแผนผัง (JPG/PNG) *
                <input
                  id="plan-image-upload"
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  required
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="mt-1.5 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </label>

              <label className="block text-xs font-bold text-gray-700">
                ชื่อชั้น (เช่น ชั้น 1, ชั้น M) *
                <input
                  type="text"
                  required
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-gray-700">
                  ระดับชั้น (Floor Level)
                  <input
                    type="number"
                    value={floorLevel}
                    onChange={(e) => setFloorLevel(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="block text-xs font-bold text-gray-700">
                  ลำดับการแสดงผล
                  <input
                    type="number"
                    value={floorOrder}
                    onChange={(e) => setFloorOrder(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              </div>

              <label className="block text-xs font-bold text-gray-700">
                ชื่อโซน (ถ้ามี)
                <input
                  type="text"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <button
                type="submit"
                disabled={isSaving}
                className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? 'กำลังอัพโหลด...' : 'บันทึกแผนผัง'}
              </button>
            </div>
          </form>
        </div>

        {/* รายการแผนผัง */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden h-full min-h-[400px]">
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-4">
              <h3 className="font-bold text-gray-800">แผนผังที่อัพโหลดแล้ว</h3>
            </div>
            <div className="p-5">
              {!selectedPinId ? (
                <div className="text-center py-12 text-gray-400">
                  <span className="text-4xl block mb-2">👆</span>
                  <p className="font-medium text-sm">กรุณาเลือกสถานที่จากรายการด้านซ้าย</p>
                </div>
              ) : loading ? (
                <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
              ) : plans.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <span className="text-4xl block mb-2">🏢</span>
                  <p className="font-medium text-sm">ยังไม่มีแผนผังสำหรับสถานที่นี้</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plans.sort((a, b) => (a.floorOrder || 0) - (b.floorOrder || 0)).map((plan) => (
                    <div key={plan.id} className="rounded-xl border border-gray-200 overflow-hidden flex flex-col">
                      <div className="h-32 bg-gray-100 relative group">
                        <img src={plan.planImageUrl} alt={plan.floorName} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <a href={plan.planImageUrl} target="_blank" rel="noopener noreferrer" className="text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-lg hover:bg-black/70">ดูรูปเต็ม</a>
                        </div>
                      </div>
                      <div className="p-3 bg-white flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-sm text-gray-800">{plan.floorName}</h4>
                            {plan.zoneName && <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">{plan.zoneName}</span>}
                          </div>
                          <p className="text-xs text-gray-500">อาคาร: {plan.locationName}</p>
                          <p className="text-[10px] text-gray-400 mt-1">Level: {plan.floorLevel} | Order: {plan.floorOrder}</p>
                        </div>
                        <button
                          onClick={() => handleDelete(plan.id)}
                          className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
                        >
                          ลบแผนผัง
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
