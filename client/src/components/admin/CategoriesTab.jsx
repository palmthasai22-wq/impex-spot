import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function CategoriesTab({ token }) {
  const [categories, setCategories] = useState([]);

  const fetchCats = async () => {
    try {
      const { data } = await api.get('/admin/categories');
      setCategories(data);
    } catch (err) {
      toast.error('ไม่สามารถโหลดหมวดหมู่ได้');
    }
  };

  useEffect(() => {
    fetchCats();
  }, []);

  // Use a simple layout since we don't have all the add/edit form logic defined
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest">หมวดหมู่</h2>
        <button onClick={() => toast('ยังไม่เปิดให้เพิ่มหมวดหมู่ผ่าน UI', { icon: '🚧' })} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors">เพิ่มหมวดหมู่</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.length > 0 ? categories.map(cat => (
          <div key={cat.id || cat._id} className="rounded-lg border border-emerald-100 bg-white p-4 shadow-sm flex items-start gap-4 transition-all hover:shadow-md hover:border-emerald-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-3xl shadow-inner">{cat.emoji || '📌'}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-gray-900 truncate">{cat.label || cat.name}</h3>
              <p className="mt-0.5 text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">{cat.group_name || 'ทั่วไป'}</p>
              
              <div className="mt-3 flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${cat.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                  {cat.isActive !== false ? 'เปิดใช้' : 'ปิดใช้'}
                </span>
                {cat.sort_order !== undefined && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700">ลำดับ: {cat.sort_order}</span>
                )}
              </div>
            </div>
            <button onClick={() => toast('ยังไม่เปิดให้แก้ไขผ่าน UI', { icon: '🚧' })} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
              </svg>
            </button>
          </div>
        )) : (
          <div className="col-span-full p-10 text-center text-sm font-semibold text-gray-400 border border-dashed border-gray-300 rounded-lg bg-gray-50/50">
            กำลังพัฒนาการดึงข้อมูลหมวดหมู่ หรือไม่มีข้อมูล
          </div>
        )}
      </div>
    </div>
  );
}
