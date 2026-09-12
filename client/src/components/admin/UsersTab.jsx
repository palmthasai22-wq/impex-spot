import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function UsersTab({ token }) {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ username: '', displayName: '', email: '', password: '', role: 'moderator' });
  const [editingUser, setEditingUser] = useState(null);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/admin/users/${editingUser.id || editingUser._id}`, formData);
        toast.success('แก้ไขผู้ใช้สำเร็จ');
      } else {
        await api.post('/admin/users', formData);
        toast.success('เพิ่มผู้ใช้สำเร็จ');
      }
      setFormData({ username: '', displayName: '', email: '', password: '', role: 'moderator' });
      setShowAddForm(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('ยืนยันการลบผู้ใช้นี้?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('ลบผู้ใช้สำเร็จ');
      fetchUsers();
    } catch (err) {
      toast.error('ลบผู้ใช้ไม่สำเร็จ');
    }
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      displayName: user.displayName || '',
      email: user.email || '',
      password: '',
      role: user.role,
      isActive: user.isActive !== false
    });
    setShowAddForm(true);
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.displayName && u.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest">ผู้ใช้งาน</h2>
        <button onClick={() => { setShowAddForm(!showAddForm); setEditingUser(null); setFormData({ username: '', displayName: '', email: '', password: '', role: 'moderator' }); }} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
          {showAddForm ? 'ยกเลิก' : 'เพิ่มผู้ใช้'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSave} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-gray-700">
              ชื่อผู้ใช้ (Username)
              <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} disabled={!!editingUser} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="block text-sm font-bold text-gray-700">
              ชื่อแสดงผล (Display Name)
              <input value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="block text-sm font-bold text-gray-700">
              อีเมล (Email)
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="block text-sm font-bold text-gray-700">
              รหัสผ่าน (Password) {editingUser && <span className="text-xs font-normal text-gray-500">(เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)</span>}
              <input type="password" required={!editingUser} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="block text-sm font-bold text-gray-700">
              บทบาท
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white">
                <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                <option value="moderator">ผู้ตรวจสอบ (Moderator)</option>
              </select>
            </label>
            {editingUser && (
              <label className="block text-sm font-bold text-gray-700">
                สถานะ
                <select value={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.value === 'true'})} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white">
                  <option value="true">เปิดใช้งาน (Active)</option>
                  <option value="false">ปิดใช้งาน (Inactive)</option>
                </select>
              </label>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors">บันทึก</button>
          </div>
        </form>
      )}

      <div className="rounded-lg border border-emerald-100 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-white/60">
          <input type="text" placeholder="ค้นหาจากชื่อผู้ใช้หรือชื่อแสดงผล..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-100" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4">ชื่อผู้ใช้</th>
                <th className="p-4">ชื่อแสดงผล</th>
                <th className="p-4">อีเมล</th>
                <th className="p-4">บทบาท</th>
                <th className="p-4">สถานะ</th>
                <th className="p-4">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map(user => (
                <tr key={user.id || user._id} className="hover:bg-brand-50/30 transition-colors">
                  <td className="p-4 font-semibold text-gray-900">{user.username}</td>
                  <td className="p-4">{user.displayName || '-'}</td>
                  <td className="p-4">{user.email || '-'}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${user.role === 'admin' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                      {user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ตรวจสอบ'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${user.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {user.isActive !== false ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openEdit(user)} className="px-3 py-1.5 text-xs font-semibold text-blue-600 transition-all hover:rounded-lg hover:bg-blue-50 hover:text-blue-800">แก้ไข</button>
                      <button onClick={() => handleDelete(user.id || user._id)} className="px-3 py-1.5 text-xs font-semibold text-red-500 transition-all hover:rounded-lg hover:bg-red-50 hover:text-red-700">ลบ</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan="6" className="p-10 text-center text-gray-400">ไม่พบข้อมูลผู้ใช้งาน</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
