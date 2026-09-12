import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const DEFAULT_SETTINGS = [
  { key: 'maintenance_mode', type: 'boolean', label: 'โหมดซ่อมบำรุง', desc: 'ปิดการใช้งานระบบชั่วคราว', value: false },
  { key: 'enable_emergency_dispatch', type: 'boolean', label: 'ระบบประสานเหตุฉุกเฉิน', desc: 'เปิด/ปิด ระบบศูนย์ประสานเหตุ', value: true },
  { key: 'max_upload_size', type: 'number', label: 'ขนาดไฟล์สูงสุด (Bytes)', desc: 'ขนาดไฟล์รูปภาพสูงสุดที่อัปโหลดได้', value: 5242880 },
  { key: 'max_images_per_pin', type: 'number', label: 'จำนวนรูปภาพสูงสุดต่อหมุด', desc: 'จำนวนรูปที่อนุญาตให้อัปโหลดต่อหนึ่งหมุด', value: 3 },
  { key: 'default_expiry_hours', type: 'number', label: 'เวลาหมดอายุเริ่มต้น (ชั่วโมง)', desc: 'เวลาหมดอายุของหมุดโดยค่าเริ่มต้น', value: 24 },
  { key: 'map_default_center_lat', type: 'text', label: 'ละติจูดศูนย์กลางแผนที่', desc: 'ค่าเริ่มต้นละติจูดของศูนย์กลางแผนที่', value: '13.9142' },
  { key: 'map_default_center_lng', type: 'text', label: 'ลองจิจูดศูนย์กลางแผนที่', desc: 'ค่าเริ่มต้นลองจิจูดของศูนย์กลางแผนที่', value: '100.5401' }
];

export default function SystemSettingsTab({ token }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/admin/settings');
        if (data && Object.keys(data).length > 0) {
          setSettings(settings.map(s => ({ ...s, value: data[s.key] !== undefined ? data[s.key] : s.value })));
        }
      } catch (err) {
        // Use defaults if fetch fails
      }
    };
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (key, value) => {
    try {
      await api.put('/admin/settings', { [key]: value });
      setSettings(settings.map(s => s.key === key ? { ...s, value } : s));
      toast.success('บันทึกการตั้งค่าแล้ว');
    } catch (err) {
      toast.error('บันทึกไม่สำเร็จ');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest">ตั้งค่าระบบ (System Settings)</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {settings.map(s => (
          <div key={s.key} className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <h3 className="font-black text-gray-900">{s.label}</h3>
            <p className="mt-1 text-xs font-semibold text-emerald-600 uppercase tracking-wider">{s.key}</p>
            <p className="mt-1 text-sm text-gray-500 mb-4">{s.desc}</p>
            
            <div className="flex items-center gap-3">
              {s.type === 'boolean' ? (
                <button 
                  onClick={() => handleSave(s.key, !s.value)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${s.value ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${s.value ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              ) : (
                <div className="flex flex-1 gap-2">
                  <input 
                    type={s.type} 
                    defaultValue={s.value}
                    onBlur={(e) => handleSave(s.key, s.type === 'number' ? Number(e.target.value) : e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors"
                  />
                  <button onClick={(e) => handleSave(s.key, s.type === 'number' ? Number(e.currentTarget.previousSibling.value) : e.currentTarget.previousSibling.value)} className="rounded-lg bg-gray-100 border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200 transition-colors">บันทึก</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
