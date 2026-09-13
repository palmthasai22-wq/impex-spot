import React, { useEffect, useState } from 'react';
import { PIN_CATEGORIES, SITUATION_CATEGORIES, PLACE_CATEGORIES, SHARE_CATEGORIES, EMERGENCY_CATEGORIES, EXPIRY_CONFIG } from '../utils/categories';
import ResponderPanel from './ResponderPanel';
import UsersTab from './admin/UsersTab';
import AuditLogTab from './admin/AuditLogTab';
import SystemSettingsTab from './admin/SystemSettingsTab';
import FlagsTab from './admin/FlagsTab';
import toast from 'react-hot-toast';
import api from '../utils/api';

const DISPATCH_STATUS = {
  pending: { label: 'รอประสาน', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  coordinating: { label: 'กำลังประสาน', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  dispatched: { label: 'ส่งทีมแล้ว', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  acknowledged: { label: 'ทีมรับทราบ', className: 'bg-violet-100 text-violet-800 border-violet-200' },
  on_scene: { label: 'ถึงที่เกิดเหตุ', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  resolved: { label: 'ปิดเหตุ', className: 'bg-gray-100 text-gray-700 border-gray-200' }
};

const TRAFFIC_STATUS = {
  monitoring: { label: 'เฝ้าระวัง', className: 'bg-amber-100 text-amber-800' },
  responding: { label: 'กำลังแก้ไข', className: 'bg-orange-100 text-orange-800' },
  cleared: { label: 'คลี่คลายแล้ว', className: 'bg-emerald-100 text-emerald-800' }
};

// ─── Mascot icon helper (แทน emoji) ───
const MascotIcon = ({ src, alt, size = 'h-7 w-7' }) => (
  <img src={src} alt={alt} className={`${size} object-contain select-none`} draggable={false} />
);

// ─── Nav Item Component ───
const NavItem = ({ active, onClick, mascot, label, accent }) => (
  <button onClick={onClick}
    className={`group w-full flex items-center gap-3.5 rounded-xl px-3 py-3 text-[13px] font-bold transition-all duration-200
      ${active
        ? 'bg-white/15 text-white shadow-lg shadow-black/10 scale-[1.02]'
        : 'text-emerald-100 hover:bg-white/8 hover:text-white hover:translate-x-0.5'}`}>
    <span className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200
      ${active ? `${accent} shadow-md` : 'bg-white/5 group-hover:bg-white/10'}`}>
      <MascotIcon src={mascot} alt={label} size="h-6 w-6" />
    </span>
    {label}
    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
  </button>
);

// ─── Stat Card Component ───
const StatCard = ({ mascot, label, value, gradient, delay }) => (
  <div className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5 cursor-default animate-fade-in"
    style={{ animationDelay: `${delay}ms` }}>
    <div className={`absolute -right-3 -top-3 h-20 w-20 rounded-full ${gradient} opacity-10 transition-all duration-300 group-hover:opacity-20 group-hover:scale-125`} />
    <div className="flex items-center gap-3">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${gradient} shadow-md transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110`}>
        <MascotIcon src={mascot} alt={label} size="h-9 w-9" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="text-2xl font-black text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

// ─── Categories Kanban Board ───
function CategoriesKanban({ pins }) {
  const groups = [
    { key: 'situation', label: 'รู้ทัน (สถานการณ์)', mascot: '/images/mascot_alert.png', categories: SITUATION_CATEGORIES, gradient: 'from-orange-500 to-red-500', border: 'border-orange-200', headerBg: 'bg-gradient-to-r from-orange-50 to-red-50' },
    { key: 'place', label: 'ปักหมุด (สถานที่)', mascot: '/images/mascot_pin.png', categories: PLACE_CATEGORIES, gradient: 'from-emerald-500 to-teal-500', border: 'border-emerald-200', headerBg: 'bg-gradient-to-r from-emerald-50 to-teal-50' },
    { key: 'share', label: 'แบ่งปัน (รีวิว/ร้านค้า)', mascot: '/images/mascot_share.png', categories: SHARE_CATEGORIES, gradient: 'from-purple-500 to-pink-500', border: 'border-purple-200', headerBg: 'bg-gradient-to-r from-purple-50 to-pink-50' },
    { key: 'emergency', label: 'จุดแจ้ง (ฉุกเฉิน)', mascot: '/images/mascot_alert.png', categories: EMERGENCY_CATEGORIES, gradient: 'from-red-500 to-rose-500', border: 'border-red-200', headerBg: 'bg-gradient-to-r from-red-50 to-rose-50' },
  ];

  const countByCategory = (catId) => pins.filter(p => (p.type || p.category) === catId && p.status === 'active').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
      {groups.map((group, gi) => (
        <div key={group.key} className={`rounded-2xl border ${group.border} bg-white shadow-sm overflow-hidden animate-fade-in`}
          style={{ animationDelay: `${gi * 80}ms` }}>
          {/* Column Header */}
          <div className={`${group.headerBg} px-4 py-3.5 flex items-center gap-3`}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${group.gradient} shadow-md`}>
              <MascotIcon src={group.mascot} alt={group.label} size="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-gray-800 truncate">{group.label}</h3>
              <p className="text-[10px] font-bold text-gray-500">{group.categories.length} หมวดหมู่</p>
            </div>
          </div>
          {/* Cards */}
          <div className="p-3 space-y-2">
            {group.categories.map(cat => {
              const count = countByCategory(cat.id);
              const expiry = EXPIRY_CONFIG[cat.id];
              return (
                <div key={cat.id}
                  className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-3.5 py-3 transition-all duration-200 hover:bg-white hover:border-gray-200 hover:shadow-sm cursor-default">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg text-xl bg-white shadow-sm border border-gray-100 transition-transform duration-200 group-hover:scale-110">
                    {cat.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{cat.label}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{expiry?.label || 'ถาวร'}</p>
                  </div>
                  {count > 0 && (
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-100 px-1.5 text-[10px] font-black text-emerald-700">
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      await Promise.all(selectedPinIds.map(id => api.delete(`/admin/pins/${id}`, { headers: { Authorization: `Bearer ${token}` } })));
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
    setEditForm({ title: pin.title || '', type: pin.type || pin.category || 'other', customType: pin.customType || '', description: pin.description || '' });
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editingPin) return;
    setIsSaving(true);
    try {
      await api.put(`/admin/pins/${pinId(editingPin)}`, editForm, { headers: { Authorization: `Bearer ${token}` } });
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
      await api.put(`/admin/pins/${pinId(pin)}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
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
      await api.put(`/admin/emergencies/${pinId(pin)}/dispatch`, { dispatchStatus, responderId }, { headers: { Authorization: `Bearer ${token}` } });
      await fetchPins();
      toast.success(`อัปเดตเป็น "${DISPATCH_STATUS[dispatchStatus].label}" แล้ว`);
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
        trafficStatus, trafficNote: trafficNotes[pinId(pin)] ?? pin.trafficNote ?? ''
      }, { headers: { Authorization: `Bearer ${token}` } });
      await fetchPins();
      toast.success(`อัปเดตเป็น "${TRAFFIC_STATUS[trafficStatus].label}" แล้ว`);
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
    { label: 'หมุดทั้งหมด', value: pins.length, mascot: '/images/mascot_pin.png', gradient: 'bg-gradient-to-br from-emerald-400 to-green-500' },
    { label: 'เหตุฉุกเฉิน', value: emergencies.length, mascot: '/images/mascot_alert.png', gradient: 'bg-gradient-to-br from-red-400 to-rose-500' },
    { label: 'ยืนยันแล้ว', value: verified.length, mascot: '/images/mascot_star.png', gradient: 'bg-gradient-to-br from-amber-400 to-yellow-500' },
    { label: 'หมดอายุ', value: expired.length, mascot: '/images/mascot_search.png', gradient: 'bg-gradient-to-br from-gray-400 to-slate-500' },
  ];

  // ── Nav items definition ──
  const NAV_ITEMS = [
    { id: 'overview', label: 'ภาพรวม', mascot: '/images/mascot_ruthan.png', accent: 'bg-emerald-600/30' },
    { id: 'dispatch', label: 'ศูนย์ประสานเหตุ', mascot: '/images/mascot_alert.png', accent: 'bg-red-500/30' },
    { id: 'traffic', label: 'จัดการรถติด', mascot: '/images/mascot_search.png', accent: 'bg-amber-500/30' },
    { id: 'responders', label: 'ทีมช่วยเหลือ', mascot: '/images/mascot_share.png', accent: 'bg-sky-500/30' },
    { id: 'pins', label: 'รายการหมุด', mascot: '/images/mascot_pin.png', accent: 'bg-green-500/30' },
    { id: 'categories', label: 'หมวดหมู่', mascot: '/images/mascot_impact.png', accent: 'bg-purple-500/30' },
    { id: 'flags', label: 'รายงานปัญหา', mascot: '/images/mascot_alert.png', accent: 'bg-rose-500/30' },
  ];

  const SYSTEM_NAV_ITEMS = [
    { id: 'users', label: 'ผู้ใช้งาน', mascot: '/images/mascot_share.png', accent: 'bg-blue-500/30' },
    { id: 'settings', label: 'ตั้งค่าระบบ', mascot: '/images/mascot_search.png', accent: 'bg-slate-500/30' },
    { id: 'audit', label: 'Audit Log', mascot: '/images/mascot_star.png', accent: 'bg-teal-500/30' },
  ];

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 via-emerald-50/30 to-gray-50 text-gray-800 lg:flex">
      {/* ── Sidebar Overlay (Mobile) ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 shrink-0 flex-col bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 px-4 py-5 text-white transition-transform duration-300 lg:static lg:flex lg:translate-x-0 lg:h-screen overflow-y-auto overflow-x-hidden scrollbar-hide
        ${sidebarOpen ? 'flex translate-x-0' : 'hidden -translate-x-full'}`}>

        {/* Logo */}
        <button onClick={onBack} className="flex items-center gap-3 px-2 text-left group" aria-label="กลับสู่แผนที่">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-600/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <MascotIcon src="/images/mascot_ruthan.png" alt="ImpEx Spot" size="h-10 w-10" />
          </span>
          <span>
            <strong className="block text-lg font-black tracking-tight">ImpEx Spot</strong>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Admin Workspace</span>
          </span>
        </button>

        {/* User Profile */}
        <div className="mt-8 rounded-2xl bg-white/5 p-4 text-center backdrop-blur-sm border border-white/5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg">
            <MascotIcon src="/images/mascot_star.png" alt="admin" size="h-12 w-12" />
          </div>
          <p className="mt-3 text-sm font-black">{userName}</p>
          <span className={`mt-1.5 inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
            userRole === 'admin' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
          }`}>
            {userRole === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ตรวจสอบ'}
          </span>
        </div>

        {/* Navigation */}
        <nav className="mt-8 space-y-1 text-sm font-bold flex-1">
          <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-400/80">การจัดการ</p>
          {NAV_ITEMS.map(item => (
            <NavItem key={item.id} active={activeTab === item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              mascot={item.mascot} label={item.label} accent={item.accent} />
          ))}

          {userRole !== 'moderator' && (
            <>
              <p className="mt-6 mb-2 px-3 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-400/80">ระบบ</p>
              {SYSTEM_NAV_ITEMS.map(item => (
                <NavItem key={item.id} active={activeTab === item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                  mascot={item.mascot} label={item.label} accent={item.accent} />
              ))}
            </>
          )}
        </nav>

        {/* Logout */}
        <div className="mt-4 border-t border-white/10 pt-4">
          <button onClick={handleLogout}
            className="group w-full flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-bold text-emerald-200 transition-all duration-200 hover:bg-red-500/15 hover:text-red-300">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 transition-all group-hover:bg-red-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </span>
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="min-w-0 flex-1">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-emerald-100/50 bg-white/80 backdrop-blur-xl px-4 shadow-sm sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile burger */}
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden" aria-label="เปิดเมนู">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2.5">
              <MascotIcon src="/images/mascot_ruthan.png" alt="ImpEx Spot" size="h-8 w-8" />
              <div>
                <p className="text-sm font-black text-emerald-950">Admin Dashboard</p>
                <p className="text-[10px] font-bold text-gray-400">ศูนย์จัดการข้อมูลชุมชน</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onBack}
              className="group flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-xs font-bold text-emerald-700 transition-all duration-200 hover:bg-emerald-50 hover:border-emerald-300 hover:shadow-sm active:scale-95">
              <MascotIcon src="/images/mascot_pin.png" alt="แผนที่" size="h-5 w-5" />
              <span className="hidden sm:inline">กลับแผนที่</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6 lg:p-8 overflow-y-auto">

          {/* ═══════ Overview ═══════ */}
          {activeTab === 'overview' && (
            <>
              {/* Welcome Section */}
              <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="hidden sm:flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-green-50 border border-emerald-200">
                    <MascotIcon src="/images/mascot_star.png" alt="ภาพรวม" size="h-16 w-16" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600">ภาพรวมวันนี้</p>
                    <h2 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">จัดการพื้นที่อย่างมั่นใจ</h2>
                    <p className="mt-1.5 text-sm text-gray-500 max-w-md">ติดตามหมุด ประสานเหตุ และดูแลข้อมูลชุมชนจากที่เดียว</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200/50 bg-emerald-50/50 px-4 py-2.5 text-xs font-bold text-emerald-700 shadow-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                  </span>
                  ระบบออนไลน์
                </div>
              </section>

              {/* Stats Grid */}
              <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
                {STATS.map((s, i) => (
                  <StatCard key={i} mascot={s.mascot} label={s.label} value={s.value} gradient={s.gradient} delay={i * 100} />
                ))}
              </div>

              {/* Quick Actions */}
              <section className="mb-8">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-gray-500">
                  <MascotIcon src="/images/mascot_pin.png" alt="" size="h-5 w-5" />
                  การดำเนินการด่วน
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'ศูนย์ประสานเหตุ', tab: 'dispatch', mascot: '/images/mascot_alert.png', count: activeEmergencies.length, bg: 'bg-red-50 hover:bg-red-100 border-red-200', text: 'text-red-700' },
                    { label: 'จัดการรถติด', tab: 'traffic', mascot: '/images/mascot_search.png', count: trafficIncidents.length, bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200', text: 'text-amber-700' },
                    { label: 'รายการหมุด', tab: 'pins', mascot: '/images/mascot_pin.png', count: pins.length, bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200', text: 'text-emerald-700' },
                    { label: 'หมวดหมู่', tab: 'categories', mascot: '/images/mascot_impact.png', count: PIN_CATEGORIES.length, bg: 'bg-purple-50 hover:bg-purple-100 border-purple-200', text: 'text-purple-700' },
                  ].map(action => (
                    <button key={action.tab} onClick={() => setActiveTab(action.tab)}
                      className={`group flex flex-col items-center gap-2 rounded-2xl border ${action.bg} p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95`}>
                      <div className="transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3">
                        <MascotIcon src={action.mascot} alt={action.label} size="h-10 w-10" />
                      </div>
                      <span className={`text-xs font-bold ${action.text}`}>{action.label}</span>
                      <span className={`rounded-full ${action.text} bg-white px-2.5 py-0.5 text-[10px] font-black shadow-sm`}>{action.count}</span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ═══════ Categories Kanban ═══════ */}
          {activeTab === 'categories' && (
            <section>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-pink-50 border border-purple-200">
                    <MascotIcon src="/images/mascot_impact.png" alt="หมวดหมู่" size="h-10 w-10" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-purple-600">จัดการหมวดหมู่</p>
                    <h2 className="mt-1 text-xl font-black text-gray-900 sm:text-2xl">หมวดหมู่ทั้งหมด</h2>
                    <p className="mt-1 text-sm text-gray-500">ดูภาพรวมหมวดหมู่ทั้งหมดจัดเรียงตามกลุ่ม</p>
                  </div>
                </div>
                <span className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold text-purple-700 shadow-sm">
                  ทั้งหมด {PIN_CATEGORIES.length} หมวดหมู่
                </span>
              </div>
              <CategoriesKanban pins={pins} />
            </section>
          )}

          {/* ═══════ Emergency Dispatch ═══════ */}
          {activeTab === 'dispatch' && (
            <section className="mb-8 overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
              <div className="flex items-center justify-between bg-gradient-to-r from-red-600 to-rose-600 px-5 py-4 text-white">
                <div className="flex items-center gap-3">
                  <MascotIcon src="/images/mascot_alert.png" alt="ฉุกเฉิน" size="h-10 w-10" />
                  <div>
                    <h3 className="font-black text-lg">ศูนย์ประสานเหตุฉุกเฉิน</h3>
                    <p className="text-xs text-red-100">โทร 191 หรือ 1669 ก่อนเสมอ หากเป็นเหตุเร่งด่วน</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/20 px-4 py-1.5 text-xs font-black">{activeEmergencies.length} เหตุ</span>
              </div>
              {activeEmergencies.length > 0 ? (
                <div className="divide-y divide-red-100">
                  {activeEmergencies.map(pin => {
                    const dispatch = DISPATCH_STATUS[pin.dispatchStatus || 'pending'];
                    const isDispatching = dispatchingId === pinId(pin);
                    return (
                      <article key={pinId(pin)} className="p-5 transition-colors hover:bg-red-50/30">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-black text-gray-900">{pin.title}</h4>
                              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${dispatch.className}`}>{dispatch.label}</span>
                            </div>
                            <p className="mt-1.5 text-sm text-gray-600">{pin.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-gray-500">
                              <span className="flex items-center gap-1"><MascotIcon src="/images/mascot_pin.png" alt="" size="h-4 w-4" />{Number(pin.lat).toFixed(5)}, {Number(pin.lng).toFixed(5)}</span>
                              <span>ผู้บาดเจ็บ {pin.injuryCount || 0} คน</span>
                              <span>{pin.createdAt ? new Date(pin.createdAt).toLocaleString('th-TH') : '-'}</span>
                            </div>
                            {pin.injuryDetails?.symptoms && <p className="mt-2 text-xs font-medium text-red-700 bg-red-50 rounded-lg px-3 py-1.5">อาการ: {pin.injuryDetails.symptoms}</p>}
                          </div>
                          <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
                            <a href="tel:1669" className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition-all duration-200 hover:bg-red-700 hover:shadow-md active:scale-95">โทร 1669</a>
                            <a href="tel:191" className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white transition-all duration-200 hover:bg-slate-900 hover:shadow-md active:scale-95">โทร 191</a>
                            <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`, '_blank', 'noopener,noreferrer')}
                              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700 transition-all duration-200 hover:bg-blue-100 hover:shadow-sm active:scale-95">เปิดพิกัด</button>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                          <select value={responderAssignments[pinId(pin)] || pin.assignedResponderId || ''}
                            onChange={e => setResponderAssignments(a => ({ ...a, [pinId(pin)]: e.target.value }))}
                            className="min-w-48 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                            <option value="">เลือกทีมช่วยเหลือ</option>
                            {responders.filter(r => r.status === 'available' || r.id === pin.assignedResponderId).map(r => (
                              <option key={r.id} value={r.id}>{r.name} - {r.team}</option>
                            ))}
                          </select>
                          {pin.dispatchStatus !== 'coordinating' && <button disabled={isDispatching} onClick={() => handleDispatch(pin, 'coordinating')} className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800 transition-all hover:bg-orange-100 disabled:opacity-50 active:scale-95">รับประสาน</button>}
                          <button disabled={isDispatching || !(responderAssignments[pinId(pin)] || pin.assignedResponderId)} onClick={() => handleDispatch(pin, 'dispatched')} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition-all hover:bg-blue-100 disabled:opacity-50 active:scale-95">ส่งทีม</button>
                          <button disabled={isDispatching} onClick={() => handleDispatch(pin, 'acknowledged')} className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition-all hover:bg-violet-100 disabled:opacity-50 active:scale-95">ทีมรับทราบ</button>
                          <button disabled={isDispatching} onClick={() => handleDispatch(pin, 'on_scene')} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-100 disabled:opacity-50 active:scale-95">ถึงที่เกิดเหตุ</button>
                          <button disabled={isDispatching} onClick={() => handleDispatch(pin, 'resolved')} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 transition-all hover:bg-gray-100 disabled:opacity-50 active:scale-95">ปิดเหตุ</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <MascotIcon src="/images/mascot_share.png" alt="ว่าง" size="h-20 w-20 mx-auto" />
                  <p className="mt-4 text-sm font-bold text-gray-400">ไม่มีเหตุฉุกเฉินที่กำลังดำเนินการ</p>
                </div>
              )}
            </section>
          )}

          {/* ═══════ Traffic ═══════ */}
          {activeTab === 'traffic' && (
            <section className="mb-8 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
              <div className="flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 text-white">
                <div className="flex items-center gap-3">
                  <MascotIcon src="/images/mascot_search.png" alt="จราจร" size="h-10 w-10" />
                  <div>
                    <h3 className="font-black text-lg">Traffic Operations</h3>
                    <p className="text-xs text-amber-100">อัปเดตสถานการณ์และคำแนะนำเส้นทางสำหรับผู้ใช้งาน</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/20 px-4 py-1.5 text-xs font-black">{trafficIncidents.length} จุด</span>
              </div>
              {trafficIncidents.length > 0 ? (
                <div className="divide-y divide-amber-100">
                  {trafficIncidents.map(pin => {
                    const traffic = TRAFFIC_STATUS[pin.trafficStatus || 'monitoring'];
                    const isUpdating = updatingTrafficId === pinId(pin);
                    return (
                      <article key={pinId(pin)} className="p-5 transition-colors hover:bg-amber-50/30">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-black text-gray-900">{pin.title}</h4>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${traffic.className}`}>{traffic.label}</span>
                            </div>
                            <p className="mt-1.5 text-sm text-gray-600">{pin.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-gray-500"><MascotIcon src="/images/mascot_pin.png" alt="" size="h-4 w-4" />{Number(pin.lat).toFixed(5)}, {Number(pin.lng).toFixed(5)}</p>
                          </div>
                          <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`, '_blank', 'noopener,noreferrer')}
                            className="w-fit rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700 transition-all duration-200 hover:bg-blue-100 hover:shadow-sm active:scale-95">เปิดพิกัด</button>
                        </div>
                        <label className="mt-4 block text-xs font-bold text-gray-700">
                          คำแนะนำหรือเส้นทางเลี่ยง
                          <input value={trafficNotes[pinId(pin)] ?? pin.trafficNote ?? ''}
                            onChange={e => setTrafficNotes(n => ({ ...n, [pinId(pin)]: e.target.value }))}
                            placeholder="เช่น ใช้ทางเข้าฝั่งเหนือ หรือหลีกเลี่ยงช่วง 17:00-19:00"
                            className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all" />
                        </label>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {Object.entries(TRAFFIC_STATUS).map(([status, option]) => (
                            <button key={status} disabled={isUpdating} onClick={() => handleTrafficUpdate(pin, status)}
                              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${option.className}`}>
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <MascotIcon src="/images/mascot_share.png" alt="ว่าง" size="h-20 w-20 mx-auto" />
                  <p className="mt-4 text-sm font-bold text-gray-400">ไม่มีหมุดรถติดที่กำลังดำเนินการ</p>
                </div>
              )}
            </section>
          )}

          {/* ═══════ Responders ═══════ */}
          {activeTab === 'responders' && <ResponderPanel responders={responders} token={token} onChanged={fetchResponders} />}

          {/* ═══════ Pins Table ═══════ */}
          {activeTab === 'pins' && (
            <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white p-5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <MascotIcon src="/images/mascot_pin.png" alt="หมุด" size="h-10 w-10" />
                  <div>
                    <h3 className="font-black text-lg">รายการหมุดทั้งหมด</h3>
                    <span className="text-xs text-emerald-100">{pins.length} รายการ</span>
                  </div>
                </div>
                <button onClick={handleDeleteSelected} disabled={selectedPinIds.length === 0 || isDeletingSelected}
                  className="rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white transition-all duration-200 hover:bg-red-600 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
                  {isDeletingSelected ? 'กำลังลบ...' : `ลบที่เลือก${selectedPinIds.length ? ` (${selectedPinIds.length})` : ''}`}
                </button>
              </div>
              <div className="grid gap-3 border-b border-gray-100 bg-gray-50/50 p-4 md:grid-cols-[minmax(0,1fr)_10rem_12rem]">
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ค้นหาจากหัวข้อ..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald-500">
                  <option value="all">ทุกสถานะ</option>
                  <option value="pending">รอตรวจสอบ</option>
                  <option value="active">ใช้งาน</option>
                  <option value="expired">หมดอายุ</option>
                  <option value="deleted">ลบแล้ว</option>
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald-500">
                  <option value="all">ทุกประเภท</option>
                  {PIN_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="w-12 p-4">
                        <input type="checkbox" checked={allSelected} onChange={toggleAllSelection} aria-label="เลือกทุกหัวข้อ"
                          className="h-4 w-4 cursor-pointer accent-green-600 rounded" />
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
                        <tr key={id} className="border-t border-gray-100 hover:bg-emerald-50/30 transition-colors">
                          <td className="w-12 p-4">
                            <input type="checkbox" checked={selectedPinIds.includes(id)} onChange={() => togglePinSelection(id)}
                              aria-label={`เลือกหัวข้อ ${pin.title}`} className="h-4 w-4 cursor-pointer accent-green-600 rounded" />
                          </td>
                          <td className="p-4 font-bold text-gray-800">{pin.title}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-700">
                              {cat.emoji} {cat.label}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${conf >= 60 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                  style={{ width: `${conf}%` }} />
                              </div>
                              <span className="text-xs font-bold text-gray-500">{conf}%</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg ${
                              pin.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                              pin.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              pin.status === 'expired' ? 'bg-gray-100 text-gray-500' :
                              'bg-red-100 text-red-700'
                            }`}>
                              <MascotIcon src={pin.status === 'active' ? '/images/mascot_star.png' : pin.status === 'pending' ? '/images/mascot_search.png' : '/images/mascot_ruthan.png'} alt="" size="h-4 w-4" />
                              {pin.status === 'active' ? 'ใช้งาน' : pin.status === 'pending' ? 'รอตรวจสอบ' : pin.status === 'expired' ? 'หมดอายุ' : 'ลบแล้ว'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap items-center gap-1">
                              <button onClick={() => setDetailPin(pin)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-800 active:scale-95">ดู</button>
                              {pin.status === 'pending' && (
                                <>
                                  <button onClick={() => handleStatusChange(pin, 'active')} className="rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-600 transition-all hover:bg-emerald-50 active:scale-95">อนุมัติ</button>
                                  <button onClick={() => handleStatusChange(pin, 'deleted')} className="rounded-lg px-3 py-1.5 text-xs font-bold text-amber-700 transition-all hover:bg-amber-50 active:scale-95">ปฏิเสธ</button>
                                </>
                              )}
                              <button onClick={() => openEditModal(pin)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-blue-600 transition-all hover:bg-blue-50 active:scale-95">แก้ไข</button>
                              <button onClick={() => handleDelete(id)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-500 transition-all hover:bg-red-50 active:scale-95">ลบ</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {visiblePins.length === 0 && (
                      <tr><td colSpan="6" className="p-12 text-center">
                        <MascotIcon src="/images/mascot_search.png" alt="ไม่พบ" size="h-16 w-16 mx-auto" />
                        <p className="mt-3 text-sm font-bold text-gray-400">ไม่มีข้อมูลหมุด</p>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════ Other Tabs ═══════ */}
          {activeTab === 'flags' && <FlagsTab token={token} />}
          {activeTab === 'users' && userRole !== 'moderator' && <UsersTab token={token} />}
          {activeTab === 'settings' && userRole !== 'moderator' && <SystemSettingsTab token={token} />}
          {activeTab === 'audit' && userRole !== 'moderator' && <AuditLogTab token={token} />}

          {/* ═══════ Modals ═══════ */}
          {detailPin && (
            <div className="fixed inset-0 z-[1000] flex items-end bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" onClick={() => setDetailPin(null)}>
              <div onClick={e => e.stopPropagation()} className="w-full max-h-[90vh] overflow-y-auto bg-white p-6 shadow-2xl sm:max-w-lg sm:rounded-2xl">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <MascotIcon src="/images/mascot_search.png" alt="detail" size="h-10 w-10" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">รายละเอียดหมุด</span>
                      <h3 className="mt-0.5 text-xl font-black text-gray-800">{detailPin.title}</h3>
                    </div>
                  </div>
                  <button type="button" onClick={() => setDetailPin(null)} aria-label="ปิดรายละเอียด"
                    className="rounded-xl p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700 active:scale-90">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
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
                {detailPin.description && <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-700 border border-gray-100">{detailPin.description}</p>}
                {detailPin.images?.length > 0 && (
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {detailPin.images.map((image, index) => <img key={image || index} src={image} alt={`รูปหมุด ${index + 1}`} className="aspect-square w-full rounded-xl object-cover" />)}
                  </div>
                )}
              </div>
            </div>
          )}

          {editingPin && (
            <div className="fixed inset-0 z-[1000] flex items-end bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" onClick={() => setEditingPin(null)}>
              <form onSubmit={handleSaveEdit} onClick={e => e.stopPropagation()} className="w-full bg-white p-6 shadow-2xl sm:max-w-lg sm:rounded-2xl">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <MascotIcon src="/images/mascot_impact.png" alt="edit" size="h-10 w-10" />
                    <div>
                      <h3 className="text-lg font-black text-gray-800">แก้ไขข้อมูลหมุด</h3>
                      <p className="text-xs text-gray-500">เปลี่ยนหัวข้อ ประเภท และรายละเอียด</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setEditingPin(null)} aria-label="ปิดหน้าต่างแก้ไข"
                    className="rounded-xl p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700 active:scale-90">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-gray-700">หัวข้อ
                    <input required value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 font-medium outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                  </label>
                  <label className="block text-sm font-bold text-gray-700">ประเภท
                    <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-medium outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
                      {PIN_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                    </select>
                  </label>
                  {editForm.type === 'other' && (
                    <label className="block text-sm font-bold text-gray-700">ระบุประเภทอื่น
                      <input value={editForm.customType} onChange={e => setEditForm({ ...editForm, customType: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 font-medium outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                    </label>
                  )}
                  <label className="block text-sm font-bold text-gray-700">รายละเอียด
                    <textarea rows="4" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 font-medium outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                  </label>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setEditingPin(null)} className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 active:scale-95">ยกเลิก</button>
                  <button type="submit" disabled={isSaving} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 hover:shadow-md active:scale-95 disabled:opacity-50">
                    {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
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
