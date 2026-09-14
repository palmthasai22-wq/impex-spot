import React, { useRef, useState } from 'react';

const FEATURES = [
  { label: 'รู้ทัน', desc: 'ดูสถานการณ์รอบตัว', mascot: '/images/mascot_ruthan.png' },
  { label: 'ปักหมุด', desc: 'เพิ่มสถานที่ให้คนรู้', mascot: '/images/mascot_pin.png' },
  { label: 'จุดแจ้ง', desc: 'แจ้งเหตุฉุกเฉิน', mascot: '/images/mascot_alert.png' },
  { label: 'แบ่งปัน', desc: 'รีวิว ฝากร้าน แชร์', mascot: '/images/mascot_share.png' },
  { label: 'ให้ดาว', desc: 'ให้คะแนนสถานที่', mascot: '/images/mascot_star.png' },
];

const SCENE_CAPTIONS = [
  'หลงทางกลางถนน IMPACT',
  'ถึงจุดหมายอย่างมีความสุข',
  'ช่วยเหลือเด็กที่เป็นลม',
  'รถติด ขอเปลี่ยนเส้นทาง',
  'เรื่องราวของ ImpEx Spot',
  'หน้าจอแอป ImpEx Spot',
];

const STORIES = [
  { image: 1, category: 'การเดินทาง', icon: '📍', title: 'หลงทางแถว IMPACT?', description: 'ค้นหาเส้นทาง ไปถึงจุดหมายได้ง่ายขึ้น', type: 'travel' },
  { image: 2, category: 'การเดินทาง', icon: '🚗', title: 'รถติด ไปทางไหนดี?', description: 'ค้นพบเส้นทางใหม่ ให้เดินทางสะดวกขึ้น', type: 'travel' },
  { image: 3, category: 'เหตุฉุกเฉิน', icon: '🚨', title: 'เจอเหตุฉุกเฉิน ต้องทำอย่างไร?', description: 'อุ่นใจ พร้อมรับมือสถานการณ์ใกล้ตัว', type: 'emergency' },
  { image: 4, category: 'รู้ทันแอป', icon: '💬', title: 'เรื่องราวของ ImpEx Spot', description: 'ทุกการแชร์ช่วยให้พื้นที่นี้ดีขึ้น', type: 'guide' },
  { image: 5, category: 'รู้ทันแอป', icon: '🗺️', title: 'เริ่มต้นใช้งาน ImpEx Spot', description: 'ดูหมุด สำรวจพื้นที่ และช่วยกันแชร์', type: 'guide' },
  { image: 6, category: 'รู้ทันแอป', icon: '📱', title: 'หน้าจอแอป ImpEx Spot', description: 'ข้อมูลรอบตัวที่เข้าถึงได้ในไม่กี่วินาที', type: 'guide' },
];

export default function LandingHero({ onEnter, onPin }) {
  const [storyFilter, setStoryFilter] = useState('all');
  const storyTrackRef = useRef(null);
  const storyDragRef = useRef({ active: false, startX: 0, startScrollLeft: 0 });
  const visibleStories = storyFilter === 'all' ? STORIES : STORIES.filter(story => story.type === storyFilter);

  const scrollStories = (direction) => {
    storyTrackRef.current?.scrollBy({ left: direction * 420, behavior: 'smooth' });
  };

  const startStoryDrag = (event) => {
    const track = event.currentTarget;
    storyDragRef.current = { active: true, startX: event.clientX, startScrollLeft: track.scrollLeft };
    track.setPointerCapture(event.pointerId);
  };

  const moveStoryDrag = (event) => {
    const track = event.currentTarget;
    if (!storyDragRef.current.active) return;
    track.scrollLeft = storyDragRef.current.startScrollLeft - (event.clientX - storyDragRef.current.startX);
  };

  const endStoryDrag = (event) => {
    storyDragRef.current.active = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <div className="flex w-full min-h-screen flex-col overflow-x-hidden bg-transparent">

      {/* ===== HERO ===== */}
      <div className="relative h-[58vh] min-h-[420px] w-full overflow-hidden bg-transparent sm:h-[62vh] sm:min-h-[520px] lg:h-[78vh] lg:min-h-[640px] xl:h-[82vh] max-sm:h-[100svh] max-sm:min-h-[100svh] max-sm:max-w-none max-sm:mx-0 max-sm:rounded-none max-sm:border-0">
        {/* Hero Background — Manhwa illustration */}
        <img
          src="/images/07.png"
          alt="ImpEx Spot - IMPACT Muang Thong Thani"
          className="absolute inset-0 h-full w-full object-cover object-center max-sm:object-[15%_center]"
        />

        {/* Gradient overlays removed - fully transparent */}

        {/* Content */}
        <div className="absolute inset-0 z-10">
          <div className="flex-1" aria-hidden="true" />
          <div className="absolute right-2 top-3 z-10 sm:right-4 sm:top-4 max-sm:left-3 max-sm:right-auto max-sm:top-3">
            <img src="/images/mascot.png" alt="ImpEx Spot Mascot" className="h-14 w-14 object-contain drop-shadow-2xl animate-float sm:h-16 sm:w-16 lg:h-40 lg:w-40 max-sm:h-20 max-sm:w-20" />
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="absolute bottom-4 left-1/2 z-20 flex w-full -translate-x-1/2 flex-wrap justify-center gap-3 px-4 sm:bottom-6 sm:px-6 max-sm:bottom-3 max-sm:w-[88%] max-sm:flex-col max-sm:items-center max-sm:gap-2.5">
          <button onClick={onEnter}
            className="flex items-center gap-2.5 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all text-sm sm:text-base sm:py-3.5 sm:px-8 max-sm:w-full max-sm:justify-center max-sm:py-3 max-sm:px-4">
            <img src="/images/mascot.png" alt="" className="w-5 h-5 object-contain sm:w-6 sm:h-6 max-sm:w-5 max-sm:h-5" />
            เปิด Map แผนที่
          </button>
          <button onClick={onPin}
            className="flex items-center gap-2.5 bg-white/35 hover:bg-white/45 text-gray-700 font-bold py-3 px-6 rounded-full shadow-md border-2 border-white/40 hover:border-green-300 hover:-translate-y-0.5 active:scale-95 transition-all text-sm sm:text-base sm:py-3.5 sm:px-8 backdrop-blur-md max-sm:w-full max-sm:justify-center max-sm:py-3 max-sm:px-4">
            <span className="text-green-500 text-lg">📍</span>
            ปักหมุดที่คุณรู้ไว้
          </button>
        </div>
      </div>

      {/* ===== FEATURES — มาสคอต 5 ท่า ===== */}
      <div className="px-5 py-10 bg-transparent border-t border-white/10">
        <div className="text-center mb-7">
          <h2 className="text-2xl font-black text-gray-800">ทำอะไรได้บ้าง?</h2>
          <p className="text-sm text-gray-400 mt-1">เช็คดู = จุดที่แชร์สถานทุกแบบบน Map</p>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:gap-4 max-w-4xl mx-auto">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex flex-col items-center text-center group cursor-default">
              <div className="w-full aspect-square max-w-[110px] sm:max-w-[130px] rounded-2xl border-2 border-white/20 bg-transparent shadow-sm hover:shadow-lg hover:border-green-300 transition-all duration-300 flex items-center justify-center p-2 sm:p-3 group-hover:-translate-y-1.5 overflow-hidden">
                <img src={f.mascot} alt={f.label}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-gray-800 mt-2.5">{f.label}</h3>
              <p className="text-[9px] sm:text-[10px] text-gray-400 leading-tight mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== HOW IT WORKS ===== */}
      <div className="px-4 py-10 sm:px-5 sm:py-14 bg-gradient-to-b from-white/20 to-green-50/40">
        <h2 className="text-center text-xl sm:text-2xl font-black text-gray-900 mb-2">ง่ายมาก 3 ขั้นตอน 🎯</h2>
        <p className="text-center text-xs sm:text-sm text-gray-500 mb-8 sm:mb-10">ใครก็ใช้ได้ ไม่ต้องเป็นโปรก็ทำได้!</p>
        <div className="flex flex-col gap-6 sm:flex-row sm:gap-8 max-w-4xl mx-auto">
          {[
            { step: '1', title: 'เปิดเว็บ', desc: 'ไม่ต้องสมัคร ไม่ต้อง Login\nแค่เปิดเว็บก็ใช้ได้เลย!', emoji: '🌐' },
            { step: '2', title: 'ดูแผนที่', desc: 'เห็นทุกหมุดรอบตัวคุณ\nกรองตามประเภทได้สะดวก', emoji: '🗺️' },
            { step: '3', title: 'ปักหมุด!', desc: 'เลือกประเภท กรอกข้อมูล\nแนบรูป แล้วส่งได้เลย!', emoji: '📍' },
          ].map((s, i) => (
            <div key={i} className="w-full flex-1 text-center group">
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-green-500 text-white text-lg font-bold flex items-center justify-center mx-auto mb-3 sm:mb-4 border-4 border-green-100 shadow-lg shadow-green-200/70 group-hover:scale-110 transition-transform">
                <div className="flex items-center justify-center gap-0.5">
                  {Array.from({ length: i + 1 }, (_, mascotIndex) => (
                    <img key={mascotIndex} src="/images/mascot.png" alt="" className={`${i === 0 ? 'h-11 w-11 sm:h-16 sm:w-16' : i === 1 ? 'h-7 w-7 sm:h-11 sm:w-11' : 'h-5 w-5 sm:h-8 sm:w-8'} object-contain`} />
                  ))}
                </div>
              </div>
              <h3 className="font-black text-sm sm:text-base text-gray-900 mb-1">{s.title} {s.emoji}</h3>
              <p className="text-xs sm:text-sm text-gray-500 whitespace-pre-line leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== GALLERY ===== */}
      <section className="border-y border-green-100 bg-white px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-green-600">ImpEx Stories</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-4xl">ทุกสถานการณ์ มี ImpEx Spot ช่วย</h2>
              <p className="mt-2 text-sm font-medium text-slate-500 sm:text-base">ค้นพบตัวช่วยของคุณ ผ่านเรื่องราวใกล้ตัว</p>
            </div>
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <span className="hidden text-sm font-bold text-green-600 sm:inline">ดูทั้งหมด</span>
              <button type="button" onClick={() => scrollStories(-1)} aria-label="เลื่อนเรื่องราวก่อนหน้า" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-bold text-slate-500 transition-colors hover:border-green-300 hover:text-green-600">‹</button>
              <button type="button" onClick={() => scrollStories(1)} aria-label="เลื่อนเรื่องราวถัดไป" className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-xl font-bold text-white shadow-md transition-colors hover:bg-green-600">›</button>
            </div>
          </div>

          <div className="mt-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'travel', label: 'การเดินทาง' },
              { id: 'emergency', label: 'เหตุฉุกเฉิน' },
              { id: 'guide', label: 'รู้ทันแอป' },
            ].map(filter => (
              <button key={filter.id} type="button" onClick={() => setStoryFilter(filter.id)}
                className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${storyFilter === filter.id ? 'bg-green-500 text-white shadow-md' : 'border border-slate-200 bg-white text-slate-500 hover:border-green-200 hover:text-green-600'}`}>
                {filter.label}
              </button>
            ))}
          </div>

          <div ref={storyTrackRef} onPointerDown={startStoryDrag} onPointerMove={moveStoryDrag} onPointerUp={endStoryDrag} onPointerCancel={endStoryDrag}
            className="mt-6 flex snap-x gap-5 overflow-x-auto pb-5 no-scrollbar cursor-grab active:cursor-grabbing">
            {visibleStories.map(story => (
              <article key={story.image} className="group w-[280px] shrink-0 snap-start overflow-hidden rounded-lg border border-slate-100 bg-white shadow-md transition-all hover:-translate-y-1 hover:shadow-xl sm:w-[360px]">
                <img src={`/images/scene${story.image}.png`} alt={SCENE_CAPTIONS[story.image - 1]} draggable="false" className="h-44 w-full select-none object-cover transition-transform duration-500 group-hover:scale-105 sm:h-52" />
                <div className="p-5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">{story.icon} {story.category}</span>
                  <h3 className="mt-3 text-lg font-black text-slate-900">{story.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{story.description}</p>
                  <button type="button" className="mt-4 text-sm font-black text-green-600 transition-colors hover:text-green-700">อ่านเรื่องราว <span aria-hidden="true">→</span></button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES DETAIL ===== */}
      <div className="px-5 py-10 bg-transparent">
        <h2 className="text-center text-xl font-bold text-gray-800 mb-6">ทำไมต้อง ImpEx Spot? 💡</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
          {[
            { emoji: '🔓', title: 'ใช้ได้ทันที ไม่ต้อง Login', desc: 'ไม่ต้องสมัคร ไม่ต้องจำรหัส เข้ามาช่วยชุมชนได้เลย!' },
            { emoji: '🧭', title: 'นำทางด้วย Google Maps', desc: 'กดนำทาง เปิด Google Maps พาไปถึงที่หมายทันที' },
            { emoji: '✅', title: 'ยืนยันโดยชุมชน', desc: 'ยิ่งมีคนยืนยัน ยิ่งน่าเชื่อถือ!' },
            { emoji: '⏰', title: 'หมดอายุอัตโนมัติ', desc: 'ข้อมูลเก่าหายไปเอง แผนที่ไม่รก' },
            { emoji: '🟢', title: 'Responder ช่วยเหลือ', desc: 'เห็น Admin ที่พร้อมช่วยเหลือใกล้คุณ' },
            { emoji: '📊', title: 'ดูย้อนหลังได้', desc: 'บันทึกทุกรายงาน ค้นหาดูประวัติได้' },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-white/20 backdrop-blur-sm hover:bg-green-400/20 transition-all group border border-white/20 hover:border-green-300/50">
              <span className="text-2xl group-hover:scale-110 transition-transform flex-shrink-0">{f.emoji}</span>
              <div>
                <h3 className="font-bold text-sm text-gray-800">{f.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== FOOTER CTA ===== */}
      <div className="relative w-full shrink-0 overflow-hidden bg-white">
        <img
          src="/images/08.png"
          alt="ImpEx Spot community scene"
        className="block w-full h-auto object-contain object-center"
          decoding="async"
        />
      </div>
    </div>
  );
}
