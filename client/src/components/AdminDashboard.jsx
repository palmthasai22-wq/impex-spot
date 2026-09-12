import React, { useEffect, useState } from 'react';
import { PIN_CATEGORIES } from '../utils/categories';
import ResponderPanel from './ResponderPanel';
import UsersTab from './admin/UsersTab';
import AuditLogTab from './admin/AuditLogTab';
import CategoriesTab from './admin/CategoriesTab';
import SystemSettingsTab from './admin/SystemSettingsTab';
import FlagsTab from './admin/FlagsTab';
import toast from 'react-hot-toast';
import api from '../utils/api';

const DISPATCH_STATUS = {
  pending: { label: 'รอประสาน', className: 'bg-amber-100 text-amber-800' },
  coordinating: { label: 'กำลังประสาน', className: 'bg-orange-100 text-orange-800' },
  dispatched: { label: 'ส่งทีมแล้ว', className: 'bg-blue-100 text-blue-800' },
  acknowledged: { label: 'ทีมรับทราบ', className: 'bg-violet-100 text-violet-800' },
  on_scene: { label: 'ถึงที่เกิดเหตุ', className: 'bg-emerald-100 text-emerald-800' },
  resolved: { label: 'ปิดเหตุ', className: 'bg-gray-100 text-gray-700' }
};

const TRAFFIC_STATUS = {
  monitoring: { label: 'เฝ้าระวัง', className: 'bg-amber-100 text-amber-800' },
  responding: { label: 'กำลังแก้ไข', className: 'bg-orange-100 text-orange-800' },
  cleared: { label: 'คลี่คลายแล้ว', className: 'bg-emerald-100 text-emerald-800' }
};

export default function AdminDashboard({ onBack, onLogout, token }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [pins, setPins] = useState([]);
  const [selectedPinIds, setSelectedPinIds] = useState([]);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [editingPin, setEditingPin] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', type: '', customType: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [detailPin, setDetailPin] = useState(null);
  const [dispatchingId, setDispatchingId] = useState('');
  const [responders, setResponders] = useState([]);
  const [responderAssignments, setResponderAssignments] = useState({});
  const [trafficNotes, setTrafficNotes] = useState({});
  const [updatingTrafficId, setUpdatingTrafficId] = useState('');

  // Decode token for role
  let userRole = 'moderator';
  let userName = 'Admin';
  try {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userRole = payload.role || 'moderator';
      userName = payload.username || 'Admin';
    }
  } catch (err) {}

  const visiblePins = pins.filter(pin => {
    const matchesSearch = pin.title?.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchesStatus = statusFilter === 'all' || pin.status === statusFilter;
    const matchesType = typeFilter === 'all' || (pin.type || pin.category) === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const fetchPins = async () => {
    try {
      const response = await api.get('/admin/pins', { headers: { Authorization: `Bearer ${token}` } });
      setPins(response.data);
    } catch (err) {
      toast.error('ไม่สามารถโหลดรายการหมุดได้');
    }
  };

  const fetchResponders = async () => {
    try {
      const response = await api.get('/admin/responders', { headers: { Authorization: `Bearer ${token}` } });
      setResponders(response.data);
    } catch (err) {
      toast.error('ไม่สามารถโหลดทีมช่วยเหลือได้');
    }
  };

  useEffect(() => {
    fetchPins();
    fetchResponders();
  }, [token]);

  const handleLogout = () => { onLogout(); toast.success('ออกจากระบบแล้ว'); };

  const handleDelete = async (id) => {
    if (!window.confirm('ยืนยันการลบหมุดนี้?')) return;
    try {
      await api.delete(`/admin/pins/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedPinIds(ids => ids.filter(selectedId => selectedId !== id));
      await fetchPins();
      toast.success('ลบสำเร็จ');
    } catch (err) { toast.error('ไม่สามารถลบได้'); }
  };

  const pinId = (pin) => pin.id || pin._id;
  const allSelected = visiblePins.length > 0 && visiblePins.every(pin => selectedPinIds.includes(pinId(pin)));

  const togglePinSelection = (id) => {
    setSelectedPinIds(ids => ids.includes(id) ? ids.filter(selectedId => selectedId !== id) : [...ids, id]);
  };

  const toggleAllSelection = () => {
    const visiblePinIds = visiblePins.map(pinId);
    setSelectedPinIds(ids => allSelected
      ? ids.filter(id => !visiblePinIds.includes(id))
      : [...new Set([...ids, ...visiblePinIds])]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedPinIds.length === 0 || !window.confirm(`ยืนยันการลบ ${selectedPinIds.length} หัวข้อที่เลือก?`)) return;

    setIsDeletingSelected(true);
    try {
      await Promise.all(selectedPinIds.map(id => api.delete(`/admin/pins/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })));
      setSelectedPinIds([]);
      await fetchPins();
      toast.success(`ลบ ${selectedPinIds.length} หัวข้อสำเร็จ`);
    } catch (err) {
      toast.error('ไม่สามารถลบหัวข้อที่เลือกได้ทั้งหมด');
    } finally {
      setIsDeletingSelected(false);
    }
  };

  const openEditModal = (pin) => {
    setEditingPin(pin);
    setEditForm({
      title: pin.title || '',
      type: pin.type || pin.category || 'other',
      customType: pin.customType || '',
      description: pin.description || ''
    });
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editingPin) return;

    setIsSaving(true);
    try {
      await api.put(`/admin/pins/${pinId(editingPin)}`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingPin(null);
      await fetchPins();
      toast.success('บันทึกการแก้ไขแล้ว');
    } catch (err) {
      toast.error('ไม่สามารถบันทึกการแก้ไขได้');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (pin, status) => {
    try {
      await api.put(`/admin/pins/${pinId(pin)}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchPins();
      toast.success(status === 'active' ? 'อนุมัติหมุดแล้ว' : 'ปฏิเสธหมุดแล้ว');
    } catch (err) {
      toast.error('ไม่สามารถเปลี่ยนสถานะหมุดได้');
    }
  };

  const handleDispatch = async (pin, dispatchStatus) => {
    setDispatchingId(pinId(pin));
    try {
      const responderId = responderAssignments[pinId(pin)] || pin.assignedResponderId;
      await api.put(`/admin/emergencies/${pinId(pin)}/dispatch`, { dispatchStatus, responderId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchPins();
      toast.success(`อัปเดตเป็น “${DISPATCH_STATUS[dispatchStatus].label}” แล้ว`);
    } catch (err) {
      toast.error('ไม่สามารถอัปเดตการประสานเหตุได้');
    } finally {
      setDispatchingId('');
    }
  };

  const handleTrafficUpdate = async (pin, trafficStatus) => {
    setUpdatingTrafficId(pinId(pin));
    try {
      await api.put(`/admin/traffic/${pinId(pin)}`, {
        trafficStatus,
        trafficNote: trafficNotes[pinId(pin)] ?? pin.trafficNote ?? ''
      }, { headers: { Authorization: `Bearer ${token}` } });
      await fetchPins();
      toast.success(`อัปเดตเป็น “${TRAFFIC_STATUS[trafficStatus].label}” แล้ว`);
    } catch (err) {
      toast.error('ไม่สามารถอัปเดตสถานการณ์รถติดได้');
    } finally {
      setUpdatingTrafficId('');
    }
  };

  const emergencies = pins.filter(p => p.type === 'emergency' || p.category === 'emergency');
  const activeEmergencies = emergencies.filter(pin => pin.status === 'active' && pin.dispatchStatus !== 'resolved');
  const trafficIncidents = pins.filter(pin => pin.type === 'traffic' && !['deleted', 'resolved'].includes(pin.status));
  const verified = pins.filter(p => (p.confidence || 0) >= 60);
  const expired = pins.filter(p => p.status === 'expired');
  const getCat = (id) => PIN_CATEGORIES.find(c => c.id === id) || PIN_CATEGORIES[PIN_CATEGORIES.length - 1];

  const STATS = [
    { label: 'หมุดทั้งหมด', value: pins.length, icon: '📍', color: 'text-brand-600', bg: 'bg-brand-50 border-brand-200' },
    { label: 'เหตุฉุกเฉิน', value: emergencies.length, icon: '🚨', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
    { label: 'ยืนยันแล้ว', value: verified.length, icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'หมดอายุ', value: expired.length, icon: '⏰', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  ];

  return (
    <div className="min-h-full bg-[#f3f8f5] text-gray-800 lg:flex">
      <aside className="hidden w-72 shrink-0 flex-col bg-emerald-950 px-5 py-6 text-white lg:flex h-screen sticky top-0 overflow-y-auto overflow-x-hidden scrollbar-hide">
        <button onClick={onBack} className="flex items-center gap-3 px-3 text-left" aria-label="กลับสู่แผนที่">
          <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-green-500 shadow-lg">
            <img src="/images/mascot_ruthan.png" alt="ImpEx Spot" className="h-12 w-12 object-contain" />
          </span>
          <span>
            <strong className="block text-xl font-black">ImpEx Spot</strong>
            <span className="text-xs font-medium text-emerald-200">Admin Workspace</span>
          </span>
        </button>

        <div className="mt-10 border-b border-emerald-800 pb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-800 text-2xl">🛡️</div>
          <p className="mt-3 text-sm font-bold">{userName}</p>
          <p className="mt-1 text-xs text-emerald-200">{userRole === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ตรวจสอบ'}</p>
        </div>

        <nav className="mt-8 space-y-2 text-base font-bold pb-20">
          <p className="mb-3 px-3 text-xs font-black uppercase tracking-widest text-emerald-300">การจัดการ</p>
          
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 rounded-lg px-3 py-3.5 transition-colors ${activeTab === 'overview' ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-50 hover:bg-emerald-900'}`}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-md text-sm ${activeTab === 'overview' ? 'bg-white/15' : 'bg-white/5'}`}>▦</span> ภาพรวม
          </button>
          
          <button onClick={() => setActiveTab('dispatch')} className={`w-full flex items-center gap-3 rounded-lg px-3 py-3.5 transition-colors ${activeTab === 'dispatch' ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-50 hover:bg-emerald-900'}`}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-md text-base ${activeTab === 'dispatch' ? 'bg-red-500/30' : 'bg-red-500/20'}`}>🚨</span> ศูนย์ประสานเหตุ
          </button>
          
          <button onClick={() => setActiveTab('traffic')} className={`w-full flex items-center gap-3 rounded-lg px-3 py-3.5 transition-colors ${activeTab === 'traffic' ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-50 hover:bg-emerald-900'}`}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-md text-base ${activeTab === 'traffic' ? 'bg-amber-400/30' : 'bg-amber-400/20'}`}>🚦</span> จัดการรถติด
          </button>
          
          <button onClick={() => setActiveTab('responders')} className={`w-full flex items-center gap-3 rounded-lg px-3 py-3.5 transition-colors ${activeTab === 'responders' ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-50 hover:bg-emerald-900'}`}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-md text-base ${activeTab === 'responders' ? 'bg-sky-400/30' : 'bg-sky-400/20'}`}>👥</span> ทีมช่วยเหลือ
          </button>
          
          <button onClick={() => setActiveTab('pins')} className={`w-full flex items-center gap-3 rounded-lg px-3 py-3.5 transition-colors ${activeTab === 'pins' ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-50 hover:bg-emerald-900'}`}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-md text-base ${activeTab === 'pins' ? 'bg-green-400/30' : 'bg-green-400/20'}`}>📌</span> รายการหมุด
          </button>

          <button onClick={() => setActiveTab('categories')} className={`w-full flex items-center gap-3 rounded-lg px-3 py-3.5 transition-colors ${activeTab === 'categories' ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-50 hover:bg-emerald-900'}`}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-md text-base ${activeTab === 'categories' ? 'bg-purple-400/30' : 'bg-purple-400/20'}`}>🏷️</span> หมวดหมู่
          </button>

          <button onClick={() => setActiveTab('flags')} className={`w-full flex items-center gap-3 rounded-lg px-3 py-3.5 transition-colors ${activeTab === 'flags' ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-50 hover:bg-emerald-900'}`}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-md text-base ${activeTab === 'flags' ? 'bg-rose-400/30' : 'bg-rose-400/20'}`}>🚩</span> Flags
          </button>

          {userRole !== 'moderator' && (
            <>
              <p className="mt-6 mb-3 px-3 text-xs font-black uppercase tracking-widest text-emerald-300">ระบบ</p>
              
              <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 rounded-lg px-3 py-3.5 transition-colors ${activeTab === 'users' ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-50 hover:bg-emerald-900'}`}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-md text-sm ${activeTab === 'users' ? 'bg-blue-400/30' : 'bg-blue-400/20'}`}>👤</span> ผู้ใช้งาน
              </button>
              
              <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 rounded-lg px-3 py-3.5 transition-colors ${activeTab === 'settings' ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-50 hover:bg-emerald-900'}`}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-md text-sm ${activeTab === 'settings' ? 'bg-slate-400/30' : 'bg-slate-400/20'}`}>⚙️</span> ตั้งค่าระบบ
              </button>

              <button onClick={() => setActiveTab('audit')} className={`w-full flex items-center gap-3 rounded-lg px-3 py-3.5 transition-colors ${activeTab === 'audit' ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-50 hover:bg-emerald-900'}`}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-md text-sm ${activeTab === 'audit' ? 'bg-teal-400/30' : 'bg-teal-400/20'}`}>📝</span> Audit Log
              </button>
            </>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 w-full p-5 bg-emerald-950 border-t border-emerald-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 rounded-lg px-3 py-3.5 text-left text-base font-bold text-emerald-100 transition-colors hover:bg-emerald-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10">↪</span> ออกจากระบบ
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex min-h-16 items-center justify-between border-b border-emerald-100 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-800 lg:hidden">
              <img src="/images/mascot_ruthan.png" alt="ImpEx Spot" className="h-9 w-9 object-contain" />
            </span>
            <div>
              <p className="text-sm font-black text-emerald-950">Admin Dashboard</p>
              <p className="text-[11px] font-medium text-gray-500">ศูนย์จัดการข้อมูลชุมชน</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-50 sm:px-4">แผนที่</button>
            <button onClick={handleLogout} className="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-900 sm:hidden">ออก</button>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'overview' && (
            <>
              <section className="mb-6 flex flex-col gap-4 border-b border-emerald-100 pb-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">ภาพรวมวันนี้</p>
                  <h2 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">จัดการพื้นที่อย่างมั่นใจ</h2>
                  <p className="mt-1 text-sm text-gray-500">ติดตามหมุด ประสานเหตุ และดูแลข้อมูลชุมชนจากที่เดียว</p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-green-500" /> ระบบออนไลน์
                </div>
              </section>

              <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
                {STATS.map((s, i) => (
                  <div key={i} className={`stat-card border ${s.bg} animate-fade-in`} style={{animationDelay:`${i*100}ms`}}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{s.icon}</span>
                      <span className="stat-label">{s.label}</span>
                    </div>
                    <span className={`stat-value ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'dispatch' && (
            <section className="mb-8 overflow-hidden rounded-lg border border-red-200 bg-white shadow-sm">
              <div className="flex items-center justify-between bg-red-600 px-4 py-3 text-white">
                <div>
                  <h3 className="flex items-center gap-2 font-black">🚨 ศูนย์ประสานเหตุฉุกเฉิน</h3>
                  <p className="mt-0.5 text-xs text-red-100">โทร 191 หรือ 1669 ก่อนเสมอ หากเป็นเหตุเร่งด่วน</p>
                </div>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{activeEmergencies.length} เหตุ</span>
              </div>

              {activeEmergencies.length > 0 ? (
                <div className="divide-y divide-red-100">
                  {activeEmergencies.map(pin => {
                    const dispatch = DISPATCH_STATUS[pin.dispatchStatus || 'pending'];
                    const isDispatching = dispatchingId === pinId(pin);
                    return (
                      <article key={pinId(pin)} className="p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-black text-gray-900">{pin.title}</h4>
                              <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${dispatch.className}`}>{dispatch.label}</span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{pin.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-gray-500">
                              <span>📍 {Number(pin.lat).toFixed(5)}, {Number(pin.lng).toFixed(5)}</span>
                              <span>🩹 ผู้บาดเจ็บ {pin.injuryCount || 0} คน</span>
                              <span>🕒 {pin.createdAt ? new Date(pin.createdAt).toLocaleString('th-TH') : '-'}</span>
                            </div>
                            {pin.injuryDetails?.symptoms && <p className="mt-2 text-xs text-red-700">อาการ: {pin.injuryDetails.symptoms}</p>}
                          </div>
                          <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
                            <a href="tel:1669" className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700">โทร 1669</a>
                            <a href="tel:191" className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-900">โทร 191</a>
                            <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`, '_blank', 'noopener,noreferrer')}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100">เปิดพิกัด</button>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                          <select value={responderAssignments[pinId(pin)] || pin.assignedResponderId || ''}
                            onChange={event => setResponderAssignments(assignments => ({ ...assignments, [pinId(pin)]: event.target.value }))}
                            className="min-w-48 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-blue-500">
                            <option value="">เลือกทีมช่วยเหลือ</option>
                            {responders.filter(responder => responder.status === 'available' || responder.id === pin.assignedResponderId).map(responder => (
                              <option key={responder.id} value={responder.id}>{responder.name} - {responder.team}</option>
                            ))}
                          </select>
                          {pin.dispatchStatus !== 'coordinating' && <button disabled={isDispatching} onClick={() => handleDispatch(pin, 'coordinating')} className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800 disabled:opacity-50">รับประสาน</button>}
                          <button disabled={isDispatching || !(responderAssignments[pinId(pin)] || pin.assignedResponderId)} onClick={() => handleDispatch(pin, 'dispatched')} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 disabled:opacity-50">ส่งทีม</button>
                          <button disabled={isDispatching} onClick={() => handleDispatch(pin, 'acknowledged')} className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 disabled:opacity-50">ทีมรับทราบ</button>
                          <button disabled={isDispatching} onClick={() => handleDispatch(pin, 'on_scene')} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 disabled:opacity-50">ถึงที่เกิดเหตุ</button>
                          <button disabled={isDispatching} onClick={() => handleDispatch(pin, 'resolved')} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 disabled:opacity-50">ปิดเหตุ</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="p-6 text-center text-sm text-gray-500">ไม่มีเหตุฉุกเฉินที่กำลังดำเนินการ</p>
              )}
            </section>
          )}

          {activeTab === 'traffic' && (
            <section className="mb-8 overflow-hidden rounded-lg border border-orange-200 bg-white shadow-sm">
              <div className="flex items-center justify-between bg-orange-500 px-4 py-3 text-white">
                <div>
                  <h3 className="font-black">🚦 Traffic Operations</h3>
                  <p className="mt-0.5 text-xs text-orange-100">อัปเดตสถานการณ์และคำแนะนำเส้นทางสำหรับผู้ใช้งาน</p>
                </div>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{trafficIncidents.length} จุด</span>
              </div>
              {trafficIncidents.length > 0 ? (
                <div className="divide-y divide-orange-100">
                  {trafficIncidents.map(pin => {
                    const traffic = TRAFFIC_STATUS[pin.trafficStatus || 'monitoring'];
                    const isUpdating = updatingTrafficId === pinId(pin);
                    return (
                      <article key={pinId(pin)} className="p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-black text-gray-900">{pin.title}</h4>
                              <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${traffic.className}`}>{traffic.label}</span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{pin.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                            <p className="mt-2 text-xs font-medium text-gray-500">📍 {Number(pin.lat).toFixed(5)}, {Number(pin.lng).toFixed(5)}</p>
                          </div>
                          <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`, '_blank', 'noopener,noreferrer')}
                            className="w-fit rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100">เปิดพิกัด</button>
                        </div>
                        <label className="mt-4 block text-xs font-bold text-gray-700">
                          คำแนะนำหรือเส้นทางเลี่ยง
                          <input value={trafficNotes[pinId(pin)] ?? pin.trafficNote ?? ''}
                            onChange={event => setTrafficNotes(notes => ({ ...notes, [pinId(pin)]: event.target.value }))}
                            placeholder="เช่น ใช้ทางเข้าฝั่งเหนือ หรือหลีกเลี่ยงช่วงเวลา 17:00-19:00"
                            className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
                        </label>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {Object.entries(TRAFFIC_STATUS).map(([status, option]) => (
                            <button key={status} disabled={isUpdating} onClick={() => handleTrafficUpdate(pin, status)}
                              className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${option.className}`}>
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="p-6 text-center text-sm text-gray-500">ไม่มีหมุดรถติดที่กำลังดำเนินการ</p>
              )}
            </section>
          )}

          {activeTab === 'responders' && (
            <div><ResponderPanel responders={responders} token={token} onChanged={fetchResponders} /></div>
          )}

          {activeTab === 'pins' && (
            <div className="overflow-hidden rounded-lg border border-emerald-100 bg-white shadow-sm">
              <div className="bg-brand-gradient text-white p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-bold flex items-center gap-2"><span>📋</span> รายการหมุดทั้งหมด</h3>
                  <span className="text-xs text-blue-200">{pins.length} รายการ</span>
                </div>
                <button onClick={handleDeleteSelected} disabled={selectedPinIds.length === 0 || isDeletingSelected}
                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {isDeletingSelected ? 'กำลังลบ...' : `ลบที่เลือก${selectedPinIds.length ? ` (${selectedPinIds.length})` : ''}`}
                </button>
              </div>
              <div className="grid gap-3 border-b border-gray-100 bg-white/60 p-4 md:grid-cols-[minmax(0,1fr)_10rem_12rem]">
                <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="ค้นหาจากหัวข้อ..."
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-100" />
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-green-500">
                  <option value="all">ทุกสถานะ</option>
                  <option value="pending">รอตรวจสอบ</option>
                  <option value="active">ใช้งาน</option>
                  <option value="expired">หมดอายุ</option>
                  <option value="deleted">ลบแล้ว</option>
                </select>
                <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-green-500">
                  <option value="all">ทุกประเภท</option>
                  {PIN_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.emoji} {category.label}</option>)}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="w-12 p-4">
                        <input type="checkbox" checked={allSelected} onChange={toggleAllSelection} aria-label="เลือกทุกหัวข้อ"
                          className="h-4 w-4 cursor-pointer accent-green-600" />
                      </th>
                      <th className="p-4">หัวข้อ</th>
                      <th className="p-4">ประเภท</th>
                      <th className="p-4">ความน่าเชื่อถือ</th>
                      <th className="p-4">สถานะ</th>
                      <th className="p-4">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePins.map(pin => {
                      const cat = getCat(pin.type || pin.category);
                      const conf = pin.confidence || 0;
                      const id = pinId(pin);
                      return (
                        <tr key={pin.id || pin._id} className="border-t border-gray-100 hover:bg-brand-50/30 transition-colors">
                          <td className="w-12 p-4">
                            <input type="checkbox" checked={selectedPinIds.includes(id)} onChange={() => togglePinSelection(id)}
                              aria-label={`เลือกหัวข้อ ${pin.title}`} className="h-4 w-4 cursor-pointer accent-green-600" />
                          </td>
                          <td className="p-4 font-semibold text-gray-800">{pin.title}</td>
                          <td className="p-4">
                            <span className={`badge badge-${pin.type || pin.category || 'other'} text-[10px]`}>
                              {cat.emoji} {cat.label}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${conf >= 60 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                  style={{width: `${conf}%`}} />
                              </div>
                              <span className="text-xs font-semibold text-gray-500">{conf}%</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                              pin.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                              pin.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              pin.status === 'expired' ? 'bg-gray-100 text-gray-500' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {pin.status === 'active' ? '✅ ใช้งาน' : pin.status === 'pending' ? '⏳ รอตรวจสอบ' : pin.status === 'expired' ? '⏰ หมดอายุ' : '🗑️ ลบแล้ว'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap items-center gap-1">
                              <button onClick={() => setDetailPin(pin)}
                                className="px-3 py-1.5 text-xs font-semibold text-gray-600 transition-all hover:rounded-lg hover:bg-gray-100 hover:text-gray-800">
                                ดู
                              </button>
                              {pin.status === 'pending' && (
                                <>
                                  <button onClick={() => handleStatusChange(pin, 'active')}
                                    className="px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-all hover:rounded-lg hover:bg-emerald-50 hover:text-emerald-800">
                                    อนุมัติ
                                  </button>
                                  <button onClick={() => handleStatusChange(pin, 'deleted')}
                                    className="px-3 py-1.5 text-xs font-semibold text-amber-700 transition-all hover:rounded-lg hover:bg-amber-50 hover:text-amber-900">
                                    ปฏิเสธ
                                  </button>
                                </>
                              )}
                              <button onClick={() => openEditModal(pin)}
                                className="px-3 py-1.5 text-xs font-semibold text-blue-600 transition-all hover:rounded-lg hover:bg-blue-50 hover:text-blue-800">
                                แก้ไข
                              </button>
                              <button onClick={() => handleDelete(id)}
                                className="px-3 py-1.5 text-xs font-semibold text-red-500 transition-all hover:rounded-lg hover:bg-red-50 hover:text-red-700">
                                🗑️ ลบ
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {visiblePins.length === 0 && (
                      <tr><td colSpan="6" className="p-10 text-center text-gray-400">ไม่มีข้อมูลหมุด</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'categories' && <CategoriesTab token={token} />}
          {activeTab === 'flags' && <FlagsTab token={token} />}
          {activeTab === 'users' && userRole !== 'moderator' && <UsersTab token={token} />}
          {activeTab === 'settings' && userRole !== 'moderator' && <SystemSettingsTab token={token} />}
          {activeTab === 'audit' && userRole !== 'moderator' && <AuditLogTab token={token} />}

          {/* Modals */}
          {detailPin && (
            <div className="fixed inset-0 z-[1000] flex items-end bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
              <div className="w-full max-h-[90vh] overflow-y-auto bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-lg sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-green-700">รายละเอียดหมุด</span>
                    <h3 className="mt-1 text-xl font-black text-gray-800">{detailPin.title}</h3>
                  </div>
                  <button type="button" onClick={() => setDetailPin(null)} aria-label="ปิดรายละเอียด"
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">✕</button>
                </div>
                <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-3 text-sm">
                  <dt className="font-bold text-gray-500">ประเภท</dt>
                  <dd className="font-medium text-gray-800">{getCat(detailPin.type || detailPin.category).emoji} {getCat(detailPin.type || detailPin.category).label}</dd>
                  <dt className="font-bold text-gray-500">สถานะ</dt>
                  <dd className="font-medium text-gray-800">{detailPin.status === 'pending' ? 'รอตรวจสอบ' : detailPin.status === 'active' ? 'ใช้งาน' : detailPin.status === 'expired' ? 'หมดอายุ' : 'ลบแล้ว'}</dd>
                  <dt className="font-bold text-gray-500">พิกัด</dt>
                  <dd className="font-medium text-gray-800">{Number(detailPin.lat).toFixed(6)}, {Number(detailPin.lng).toFixed(6)}</dd>
                  <dt className="font-bold text-gray-500">แจ้งเมื่อ</dt>
                  <dd className="font-medium text-gray-800">{detailPin.createdAt ? new Date(detailPin.createdAt).toLocaleString('th-TH') : '-'}</dd>
                  <dt className="font-bold text-gray-500">ยืนยัน</dt>
                  <dd className="font-medium text-gray-800">{detailPin.verifications?.length || 0} คน</dd>
                </dl>
                {detailPin.description && <p className="mt-5 rounded-lg bg-gray-50 p-3 text-sm leading-relaxed text-gray-700">{detailPin.description}</p>}
                {detailPin.images?.length > 0 && (
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {detailPin.images.map((image, index) => <img key={image || index} src={image} alt={`รูปหมุด ${index + 1}`} className="aspect-square w-full rounded-lg object-cover" />)}
                  </div>
                )}
              </div>
            </div>
          )}

          {editingPin && (
            <div className="fixed inset-0 z-[1000] flex items-end bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
              <form onSubmit={handleSaveEdit} className="w-full bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-lg sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-gray-800">แก้ไขข้อมูลหมุด</h3>
                    <p className="mt-1 text-xs text-gray-500">เปลี่ยนหัวข้อ ประเภท และรายละเอียด</p>
                  </div>
                  <button type="button" onClick={() => setEditingPin(null)} aria-label="ปิดหน้าต่างแก้ไข"
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">✕</button>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-bold text-gray-700">
                    หัวข้อ
                    <input required value={editForm.title} onChange={event => setEditForm({ ...editForm, title: event.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 font-medium outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-100" />
                  </label>
                  <label className="block text-sm font-bold text-gray-700">
                    ประเภท
                    <select value={editForm.type} onChange={event => setEditForm({ ...editForm, type: event.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-medium outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-100">
                      {PIN_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.emoji} {category.label}</option>)}
                    </select>
                  </label>
                  {editForm.type === 'other' && (
                    <label className="block text-sm font-bold text-gray-700">
                      ระบุประเภทอื่น
                      <input value={editForm.customType} onChange={event => setEditForm({ ...editForm, customType: event.target.value })}
                        className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 font-medium outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-100" />
                    </label>
                  )}
                  <label className="block text-sm font-bold text-gray-700">
                    รายละเอียด
                    <textarea rows="4" value={editForm.description} onChange={event => setEditForm({ ...editForm, description: event.target.value })}
                      className="mt-1.5 w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 font-medium outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-100" />
                  </label>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setEditingPin(null)} className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50">ยกเลิก</button>
                  <button type="submit" disabled={isSaving} className="rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
