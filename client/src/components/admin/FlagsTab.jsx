import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const REASON_LABELS = {
  spam: 'สแปม',
  inappropriate: 'ไม่เหมาะสม',
  fake: 'ข้อมูลเท็จ',
  duplicate: 'ซ้ำ',
  other: 'อื่นๆ'
};

const STATUS_BADGES = {
  pending: 'bg-amber-100 text-amber-800',
  reviewed: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  dismissed: 'bg-gray-100 text-gray-800'
};

const STATUS_LABELS = {
  pending: 'รอตรวจสอบ',
  reviewed: 'กำลังตรวจสอบ',
  resolved: 'จัดการแล้ว',
  dismissed: 'เพิกเฉย'
};

export default function FlagsTab({ token }) {
  const [flags, setFlags] = useState([]);
  const [filter, setFilter] = useState('pending');

  const fetchFlags = async () => {
    try {
      const { data } = await api.get('/admin/flags');
      setFlags(data);
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูลรายงานได้');
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/admin/flags/${id}`, { status });
      toast.success('อัปเดตสถานะสำเร็จ');
      fetchFlags();
    } catch (err) {
      toast.error('อัปเดตสถานะไม่สำเร็จ');
    }
  };

  const filteredFlags = filter === 'all' ? flags : flags.filter(f => f.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest">รายงานเนื้อหา (Flags)</h2>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors">
          <option value="all">ทั้งหมด ({flags.length})</option>
          <option value="pending">รอตรวจสอบ ({flags.filter(f => f.status === 'pending').length})</option>
          <option value="resolved">จัดการแล้ว ({flags.filter(f => f.status === 'resolved').length})</option>
          <option value="dismissed">เพิกเฉย ({flags.filter(f => f.status === 'dismissed').length})</option>
        </select>
      </div>

      <div className="rounded-lg border border-emerald-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4">วันที่</th>
                <th className="p-4">เป้าหมาย</th>
                <th className="p-4">เหตุผล</th>
                <th className="p-4">รายละเอียด</th>
                <th className="p-4">สถานะ</th>
                <th className="p-4">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFlags.map(flag => (
                <tr key={flag.id || flag._id} className="hover:bg-brand-50/30 transition-colors">
                  <td className="p-4 whitespace-nowrap">{new Date(flag.createdAt).toLocaleString('th-TH')}</td>
                  <td className="p-4">
                    <span className="font-bold text-gray-800">{flag.targetType}</span>
                    <br/>
                    <span className="text-[10px] font-mono text-gray-400">{flag.targetId}</span>
                  </td>
                  <td className="p-4 font-semibold text-red-600">{REASON_LABELS[flag.reason] || flag.reason}</td>
                  <td className="p-4 max-w-xs truncate text-gray-600" title={flag.details}>{flag.details || '-'}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${STATUS_BADGES[flag.status || 'pending']}`}>
                      {STATUS_LABELS[flag.status || 'pending']}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {flag.status === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(flag.id || flag._id, 'resolved')} className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 transition-colors">จัดการแล้ว</button>
                          <button onClick={() => updateStatus(flag.id || flag._id, 'dismissed')} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors">เพิกเฉย</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredFlags.length === 0 && (
                <tr><td colSpan="6" className="p-10 text-center text-gray-400 font-medium">ไม่มีรายงานในสถานะที่เลือก</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
