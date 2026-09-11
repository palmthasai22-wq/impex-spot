import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function ReportPage({ onBack }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    type: 'bug',
    description: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.description) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    toast.success('ขอบคุณสำหรับการรายงาน! เราจะตรวจสอบในเร็วๆ นี้');
    setFormData({ name: '', email: '', subject: '', type: 'bug', description: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button onClick={onBack}
            className="mb-4 flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition-colors">
            ← ย้อนกลับ
          </button>
          <h1 className="text-4xl font-black text-gray-800 mb-2">แจ้งปัญหา</h1>
          <p className="text-gray-500">ช่วยเราปรับปรุง ImpEx Spot ด้วยการรายงานปัญหาที่คุณพบ</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          {/* Name */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">ชื่อของคุณ *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="เช่น นายสมชาย"
            />
          </div>

          {/* Email */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">อีเมลของคุณ *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="you@example.com"
            />
          </div>

          {/* Type */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">ประเภทของปัญหา</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="bug">🐛 บั๊ก/ข้อผิดพลาด</option>
              <option value="feature">✨ คำขอฟีเจอร์ใหม่</option>
              <option value="improvement">📈 ข้อเสนอแนะการปรับปรุง</option>
              <option value="other">❓ อื่น ๆ</option>
            </select>
          </div>

          {/* Subject */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">หัวข้อ</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="อธิบายปัญหาโดยสรุป"
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">รายละเอียด *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="6"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              placeholder="บอกเราถึงปัญหาที่คุณพบ วิธีการ และผลลัพธ์ที่คาดหวัง..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-3 rounded-lg transition-all active:scale-95"
          >
            📤 ส่งรายงาน
          </button>
        </form>

        {/* Tips */}
        <div className="mt-8 bg-orange-100 rounded-2xl p-6 border-l-4 border-orange-500">
          <p className="text-orange-900 font-bold mb-3">💡 เคล็ดลับการรายงาน:</p>
          <ul className="text-orange-800 space-y-2 text-sm">
            <li>• อธิบายปัญหาอย่างชัดเจนและให้รายละเอียด</li>
            <li>• ระบุขั้นตอนการทำซ้ำปัญหา</li>
            <li>• แจ้งบราวเซอร์และอุปกรณ์ที่ใช้</li>
            <li>• ถ่ายภาพหรือวิดีโอถ้าเป็นไปได้</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
