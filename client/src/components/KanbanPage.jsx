import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'impex-kanban-tasks';

const COLUMNS = [
  {
    id: 'todo',
    title: 'รอเริ่ม',
    en: 'To Do',
    mascot: '/images/mascot_pin.png',
    tone: 'from-sky-50 to-blue-50',
    ring: 'ring-sky-100',
    chip: 'bg-sky-100 text-sky-700',
  },
  {
    id: 'progress',
    title: 'กำลังทำ',
    en: 'In Progress',
    mascot: '/images/mascot_search.png',
    tone: 'from-rose-50 to-orange-50',
    ring: 'ring-rose-100',
    chip: 'bg-rose-100 text-rose-700',
  },
  {
    id: 'review',
    title: 'รอตรวจ',
    en: 'Review',
    mascot: '/images/mascot_share.png',
    tone: 'from-emerald-50 to-teal-50',
    ring: 'ring-emerald-100',
    chip: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'done',
    title: 'เสร็จแล้ว',
    en: 'Done',
    mascot: '/images/mascot_star.png',
    tone: 'from-amber-50 to-yellow-50',
    ring: 'ring-amber-100',
    chip: 'bg-amber-100 text-amber-800',
  },
];

const PRIORITY = {
  high: { label: 'ด่วน', className: 'bg-red-100 text-red-700' },
  mid: { label: 'ปกติ', className: 'bg-slate-100 text-slate-600' },
  low: { label: 'ค่อยทำ', className: 'bg-green-100 text-green-700' },
};

const SEED = [
  { id: 't1', column: 'todo', title: 'ตรวจหมุดจราจรแถว IMPACT', note: 'เช็กความถูกต้องก่อนแชร์ต่อชุมชน', priority: 'high' },
  { id: 't2', column: 'progress', title: 'อัปเดตจุดแจ้งเหตุล่าสุด', note: 'ตามสถานะจากผู้แจ้งในพื้นที่', priority: 'mid' },
  { id: 't3', column: 'done', title: 'แชร์ร้านอาหารใกล้ฮอลล์', note: 'หมุดแบ่งปันพร้อมรีวิวสั้น ๆ', priority: 'low' },
];

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : SEED;
  } catch {
    return SEED;
  }
}

export default function KanbanPage({ onNavigate }) {
  const [tasks, setTasks] = useState(loadTasks);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ title: '', note: '', priority: 'mid' });
  const [dragId, setDragId] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((task) => `${task.title} ${task.note}`.toLowerCase().includes(q));
  }, [query, tasks]);

  const moveTask = (id, column) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, column } : task)));
  };

  const addTask = (event) => {
    event.preventDefault();
    if (!draft.title.trim()) {
      toast.error('ใส่ชื่องานก่อนนะ');
      return;
    }
    setTasks((prev) => [
      {
        id: `t-${Date.now()}`,
        column: 'todo',
        title: draft.title.trim(),
        note: draft.note.trim() || 'งานจากกระดาน ImpEx Spot',
        priority: draft.priority,
      },
      ...prev,
    ]);
    setDraft({ title: '', note: '', priority: 'mid' });
    setShowForm(false);
    toast.success('เพิ่มงานบนกระดานแล้ว');
  };

  const removeTask = (id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  return (
    <div className="kanban-shell min-h-full bg-[#f6f8f5]">
      <div className="mx-auto flex min-h-full max-w-[1440px]">
        <aside className="kanban-sidebar hidden w-[88px] shrink-0 flex-col items-center gap-2 border-r border-white/10 bg-[#163c2d] py-5 lg:flex xl:w-[220px] xl:items-stretch xl:px-3">
          <div className="mb-4 hidden items-center gap-2 px-2 xl:flex">
            <img src="/images/mascot.png" alt="" className="h-10 w-10 object-contain" />
            <div>
              <p className="text-xs font-black text-white">ImpEx Spot</p>
              <p className="text-[10px] text-emerald-200">พื้นที่งานชุมชน</p>
            </div>
          </div>
          <img src="/images/mascot.png" alt="" className="mb-2 h-11 w-11 object-contain xl:hidden" />
          {[
            { id: 'landing', label: 'Insight Feed', mascot: '/images/mascot_ruthan.png' },
            { id: 'map', label: 'แผนที่', mascot: '/images/mascot_pin.png' },
            { id: 'kanban', label: 'กระดานงาน', mascot: '/images/mascot_search.png', active: true },
            { id: 'commu', label: 'ชุมชน', mascot: '/images/mascot_share.png' },
            { id: 'report', label: 'รายงาน', mascot: '/images/mascot_alert.png' },
            { id: 'faq', label: 'ติดต่อเรา', mascot: '/images/mascot_star.png' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`play-btn group flex items-center justify-center gap-3 rounded-2xl px-2 py-2.5 text-left xl:justify-start xl:px-3 ${
                item.active
                  ? 'bg-white/15 text-white shadow-inner ring-1 ring-white/20'
                  : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <img src={item.mascot} alt="" className="h-8 w-8 object-contain transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110" />
              <span className="hidden text-sm font-bold xl:inline">{item.label}</span>
            </button>
          ))}
        </aside>

        <section className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3">
              <img src="/images/mascot_ruthan.png" alt="" className="h-14 w-14 object-contain drop-shadow-md animate-float" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Kanban Board</p>
                <h1 className="text-2xl font-black text-slate-800 sm:text-3xl">จัดระเบียบสิ่งที่ต้องทำ</h1>
                <p className="mt-1 max-w-xl text-sm text-slate-500">ลากการ์ดข้ามคอลัมน์ หรือกดลูกศร เพื่อเลื่อนงานจากรอเริ่มไปจนเสร็จ</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-[200px] flex-1">
                <img src="/images/mascot_search.png" alt="" className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 object-contain" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ค้นหางานบนกระดาน"
                  className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
                />
              </label>
              <button type="button" onClick={() => setShowForm(true)} className="play-btn play-btn-primary">
                <img src="/images/mascot_pin.png" alt="" className="h-7 w-7 object-contain" />
                เพิ่มงานใหม่
              </button>
              <button type="button" onClick={() => onNavigate('report')} className="play-btn play-btn-ghost">
                <img src="/images/mascot_alert.png" alt="" className="h-7 w-7 object-contain" />
                รายงานใหม่
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((column) => {
              const items = filtered.filter((task) => task.column === column.id);
              return (
                <div
                  key={column.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (dragId) moveTask(dragId, column.id);
                    setDragId(null);
                  }}
                  className={`flex min-h-[420px] flex-col rounded-[28px] bg-gradient-to-b ${column.tone} p-4 ring-1 ${column.ring} shadow-[0_10px_30px_rgba(15,23,42,0.06)]`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={column.mascot} alt="" className="h-10 w-10 object-contain drop-shadow-sm" />
                      <div>
                        <h2 className="text-sm font-black text-slate-800">{column.title}</h2>
                        <p className="text-[11px] font-medium text-slate-400">{column.en}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${column.chip}`}>{items.length}</span>
                  </div>

                  <div className="flex flex-1 flex-col gap-3">
                    {items.length === 0 && (
                      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/80 bg-white/40 px-4 py-8 text-center">
                        <img src={column.mascot} alt="" className="mb-2 h-12 w-12 object-contain opacity-80" />
                        <p className="text-xs font-bold text-slate-500">ยังว่างอยู่</p>
                        <p className="mt-1 text-[11px] text-slate-400">ลากการ์ดมาวางที่นี่ได้เลย</p>
                      </div>
                    )}
                    {items.map((task) => (
                      <article
                        key={task.id}
                        draggable
                        onDragStart={() => setDragId(task.id)}
                        onDragEnd={() => setDragId(null)}
                        className={`kanban-card ${dragId === task.id ? 'opacity-60' : ''}`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-800">{task.title}</h3>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${PRIORITY[task.priority].className}`}>
                            {PRIORITY[task.priority].label}
                          </span>
                        </div>
                        <p className="text-xs leading-5 text-slate-500">{task.note}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex gap-1">
                            {COLUMNS.map((target) => (
                              <button
                                key={target.id}
                                type="button"
                                title={target.title}
                                onClick={() => moveTask(task.id, target.id)}
                                className={`play-btn-icon ${task.column === target.id ? 'ring-2 ring-emerald-300 bg-emerald-50' : ''}`}
                              >
                                <img src={target.mascot} alt={target.title} className="h-5 w-5 object-contain" />
                              </button>
                            ))}
                          </div>
                          <button type="button" onClick={() => removeTask(task.id)} className="play-btn-icon hover:bg-red-50" title="ลบงาน">
                            <img src="/images/mascot_alert.png" alt="ลบ" className="h-5 w-5 object-contain" />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <form className="modal-sheet p-6" onClick={(event) => event.stopPropagation()} onSubmit={addTask}>
            <div className="mb-5 flex items-center gap-3">
              <img src="/images/mascot_pin.png" alt="" className="h-14 w-14 object-contain animate-float" />
              <div>
                <h2 className="text-xl font-black text-slate-800">เพิ่มงานใหม่</h2>
                <p className="text-sm text-slate-500">งานจะไปอยู่ในคอลัมน์รอเริ่มก่อน</p>
              </div>
            </div>
            <label className="mb-3 block text-sm font-bold text-slate-700">
              ชื่องาน
              <input
                autoFocus
                value={draft.title}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                className="input-modern mt-1"
                placeholder="เช่น ตรวจหมุดชุมชน"
              />
            </label>
            <label className="mb-3 block text-sm font-bold text-slate-700">
              รายละเอียด
              <textarea
                value={draft.note}
                onChange={(event) => setDraft((prev) => ({ ...prev, note: event.target.value }))}
                className="textarea-modern mt-1 h-24"
                placeholder="สั้น ๆ ก็ได้"
              />
            </label>
            <div className="mb-5 flex gap-2">
              {Object.entries(PRIORITY).map(([id, meta]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, priority: id }))}
                  className={`play-btn rounded-full px-3 py-1.5 text-xs font-black ${meta.className} ${draft.priority === id ? 'ring-2 ring-emerald-400' : ''}`}
                >
                  {meta.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="play-btn play-btn-ghost flex-1 justify-center">
                ยกเลิก
              </button>
              <button type="submit" className="play-btn play-btn-primary flex-1 justify-center">
                <img src="/images/mascot_star.png" alt="" className="h-6 w-6 object-contain" />
                บันทึกงาน
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
