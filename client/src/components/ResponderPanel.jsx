import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const STATUS_OPTIONS = [
  { value: 'available', label: 'พร้อมช่วยเหลือ', className: 'bg-emerald-100 text-emerald-800' },
  { value: 'busy', label: 'กำลังปฏิบัติหน้าที่', className: 'bg-amber-100 text-amber-800' },
  { value: 'offline', label: 'ไม่พร้อม', className: 'bg-gray-100 text-gray-700' }
];

export default function ResponderPanel({ responders, token, onChanged }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ name: '', team: '', phone: '' });

  const headers = { Authorization: `Bearer ${token}` };

  const handleAdd = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/admin/responders', form, { headers });
      setForm({ name: '', team: '', phone: '' });
      setIsAdding(false);
      await onChanged();
      toast.success('เพิ่มทีมช่วยเหลือแล้ว');
    } catch (error) {
      toast.error('ไม่สามารถเพิ่มทีมช่วยเหลือได้');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await api.put(`/admin/responders/${id}`, { status }, { headers });
      await onChanged();
    } catch (error) {
      toast.error('ไม่สามารถเปลี่ยนสถานะทีมได้');
    }
  };

  const handleDelete = async (responder) => {
    if (!window.confirm(`ลบ ${responder.name} ออกจากทีมช่วยเหลือ?`)) return;
    try {
      await api.delete(`/admin/responders/${responder.id}`, { headers });
      await onChanged();
      toast.success('ลบทีมช่วยเหลือแล้ว');
    } catch (error) {
      toast.error('ไม่สามารถลบทีมช่วยเหลือได้');
    }
  };

  return (
    <section className="mb-8 overflow-hidden rounded-lg border border-blue-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 bg-blue-600 px-4 py-3 text-white">
        <div>
          <h3 className="font-black">ทีมช่วยเหลือ</h3>
          <p className="mt-0.5 text-xs text-blue-100">เลือกมอบหมายให้เหตุฉุกเฉินได้จากศูนย์ประสานเหตุ</p>
        </div>
        <button onClick={() => setIsAdding(!isAdding)} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-50">
          {isAdding ? 'ยกเลิก' : 'เพิ่มทีม'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="grid gap-3 border-b border-blue-100 bg-blue-50/60 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="ชื่อผู้ช่วยเหลือ"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
          <input required value={form.team} onChange={event => setForm({ ...form, team: event.target.value })} placeholder="หน่วยงาน / ทีม"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
          <input required type="tel" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder="เบอร์โทรติดต่อ"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
          <button disabled={isSaving} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60">
            {isSaving ? 'กำลังเพิ่ม...' : 'บันทึก'}
          </button>
        </form>
      )}

      {responders.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {responders.map(responder => {
            const status = STATUS_OPTIONS.find(option => option.value === responder.status) || STATUS_OPTIONS[2];
            return (
              <div key={responder.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-gray-800">{responder.name}</h4>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{responder.team} · {responder.phone}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a href={`tel:${responder.phone}`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100">โทรหา</a>
                  <select value={responder.status} onChange={event => handleStatus(responder.id, event.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold outline-none focus:border-blue-500">
                    {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <button onClick={() => handleDelete(responder)} className="rounded-lg px-2 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50">ลบ</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : !isAdding && <p className="p-6 text-center text-sm text-gray-500">ยังไม่มีทีมช่วยเหลือ เพิ่มรายชื่อและเบอร์ติดต่อเพื่อมอบหมายเหตุ</p>}
    </section>
  );
}