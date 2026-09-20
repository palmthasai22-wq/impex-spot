import React, { useState } from 'react';
import { uploadImages } from '../utils/api';
import toast from 'react-hot-toast';

export default function PlanShopForm({ planId, xPercent, yPercent, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ไฟล์ใหญ่เกิน 5MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('กรุณาระบุชื่อร้าน');
    setIsSubmitting(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        const urls = await uploadImages([imageFile]);
        imageUrl = urls[0] || '';
      }

      const api = (await import('../utils/api')).default;
      const { data } = await api.post(`/plans/${planId}/shops`, {
        xPercent,
        yPercent,
        name: name.trim(),
        description: description.trim(),
        imageUrl,
      });

      toast.success('🎉 ปักหมุดร้านสำเร็จ!');
      onCreated(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl">📍</span>
            <h3 className="font-bold text-sm">ปักหมุดร้านค้า</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Position indicator */}
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl">
            <span>📌</span>
            <span>ตำแหน่ง: ({xPercent.toFixed(1)}%, {yPercent.toFixed(1)}%)</span>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อร้าน / จุดสนใจ *</label>
            <input
              type="text"
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
              placeholder="เช่น ร้านกาแฟ ABC, ห้องน้ำ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">คำอธิบาย</label>
            <textarea
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all resize-none"
              rows={2}
              placeholder="รายละเอียดเพิ่มเติม..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">รูปภาพ (ไม่บังคับ)</label>
            <div className="flex items-center gap-3">
              {imagePreview ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-bl-lg text-[10px] flex items-center justify-center">✕</button>
                </div>
              ) : (
                <label className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-2xl text-gray-300 cursor-pointer hover:border-emerald-400 hover:text-emerald-400 transition-all flex-shrink-0">
                  📷
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
                </label>
              )}
              <p className="text-[10px] text-gray-400">JPEG, PNG หรือ WebP ขนาดไม่เกิน 5MB</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={isSubmitting}
              className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-all">
              ยกเลิก
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 h-11 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50">
              {isSubmitting ? 'กำลังบันทึก...' : '📍 ปักหมุด'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
