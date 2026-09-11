import React, { useState } from 'react';
import StarRating from './StarRating';
import { addReview } from '../utils/api';
import toast from 'react-hot-toast';

export default function ReviewForm({ pin, onClose }) {
  const [title, setTitle] = useState('');
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating < 2 || rating > 5) {
      return toast.error('ให้ดาวได้ตั้งแต่ 2 ถึง 5 ดาวเท่านั้น');
    }
    if (!title.trim()) return toast.error('กรุณาใส่หัวข้อรีวิว');
    setSubmitting(true);
    try {
      await addReview(pin.id || pin._id, { title: title.trim(), rating, comment: comment.trim() });
      toast.success('⭐ รีวิวสำเร็จ!');
      onClose();
    } catch (err) { toast.error('เกิดข้อผิดพลาด'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet max-w-sm">
        <div className="bg-accent-gradient text-amber-900 p-5 flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">⭐ รีวิว {pin.title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-black/10 hover:bg-black/20 flex items-center justify-center">✕</button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">หัวข้อรีวิว</label>
            <input type="text" className="input-modern" placeholder="เช่น ร้านอาหารคุ้มค่า / บรรยากาศดี"
              value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">ให้คะแนนสถานที่นี้ (2-5 ดาว)</p>
            <StarRating value={rating} onChange={value => setRating(Math.min(5, Math.max(2, value)))} size="large" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">ความคิดเห็น</label>
            <textarea className="textarea-modern" rows="3" placeholder="แชร์ประสบการณ์ของคุณ..."
              value={comment} onChange={e => setComment(e.target.value)} />
          </div>
        </div>
        <div className="p-5 border-t">
          <button onClick={handleSubmit} disabled={submitting} className="btn-accent w-full py-3.5 rounded-2xl">
            {submitting ? '⏳ กำลังส่ง...' : '⭐ ส่งรีวิว'}
          </button>
        </div>
      </div>
    </div>
  );
}
