import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const ACTION_LABELS = {
  'auth.login': 'เข้าสู่ระบบ',
  'places.update': 'แก้ไขสถานที่',
  'places.delete': 'ลบสถานที่',
  'incidents.update': 'แก้ไขเหตุการณ์',
  'users.create': 'สร้างผู้ใช้',
  'users.update': 'แก้ไขผู้ใช้',
  'users.delete': 'ลบผู้ใช้',
  'pins.delete': 'ลบหมุด',
  'pins.update': 'แก้ไขหมุด',
  'categories.create': 'สร้างหมวดหมู่',
  'categories.update': 'แก้ไขหมวดหมู่',
  'categories.delete': 'ลบหมวดหมู่',
  'settings.update': 'อัปเดตการตั้งค่า',
  'flags.update': 'จัดการรายงาน'
};

export default function AuditLogTab({ token }) {
  const [logs, setLogs] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data } = await api.get('/admin/audit-logs');
        setLogs(Array.isArray(data) ? data : data.logs || []);
      } catch (err) {
        toast.error('ไม่สามารถโหลด Audit Log ได้');
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest">Audit Log (บันทึกการทำงาน)</h2>
      
      <div className="rounded-lg border border-emerald-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4">เวลา</th>
                <th className="p-4">ผู้ดำเนินการ</th>
                <th className="p-4">การกระทำ</th>
                <th className="p-4">ประเภทเป้าหมาย</th>
                <th className="p-4">รหัสเป้าหมาย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <React.Fragment key={log.id || log._id}>
                  <tr className="hover:bg-brand-50/30 cursor-pointer transition-colors" onClick={() => setExpandedRow(expandedRow === (log.id || log._id) ? null : (log.id || log._id))}>
                    <td className="p-4">{new Date(log.createdAt).toLocaleString('th-TH')}</td>
                    <td className="p-4 font-semibold text-gray-900">{log.actorUsername || log.actorId}</td>
                    <td className="p-4">
                      <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="p-4">{log.targetType || '-'}</td>
                    <td className="p-4 font-mono text-[10px] text-gray-500">{log.targetId || '-'}</td>
                  </tr>
                  {expandedRow === (log.id || log._id) && (
                    <tr>
                      <td colSpan="5" className="p-4 bg-slate-50 border-b border-gray-200">
                        <div className="text-xs font-mono bg-slate-900 text-emerald-400 p-4 rounded-lg overflow-x-auto shadow-inner">
                          <pre>{JSON.stringify(log.details || log.changes || log, null, 2)}</pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan="5" className="p-10 text-center text-gray-400">ไม่มีบันทึกการทำงาน</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
