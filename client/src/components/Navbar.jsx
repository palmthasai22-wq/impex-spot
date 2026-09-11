import React, { useState, useRef, useEffect } from 'react';
import { FiMenu, FiX } from 'react-icons/fi';

const NAV_LINKS = [
  { label: 'ทำงานยังไง', id: 'how' },
  { label: 'Impact Commu', id: 'commu' },
  { label: 'คำถามที่เจอบ่อย', id: 'faq' },
  { label: 'แจ้งปัญหา', id: 'report' },
];

const Navbar = ({ onNavigate, currentView }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <nav className="sticky top-0 z-50 shrink-0 bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
        {/* Brand */}
        <button className="flex flex-col items-start text-left cursor-pointer" onClick={() => onNavigate('landing')}>
          <div className="flex items-center gap-1.5 mb-1 sm:gap-2 sm:mb-1.5">
            <span className="bg-green-100 text-green-700 text-[10px] sm:text-xs font-black px-2 py-0.5 sm:px-3 sm:py-1 rounded-full whitespace-nowrap">ปักหมุด</span>
            <span className="bg-red-100 text-red-600 text-[10px] sm:text-xs font-black px-2 py-0.5 sm:px-3 sm:py-1 rounded-full whitespace-nowrap">จุดแจ้ง</span>
          </div>
          <div className="flex items-baseline gap-0.5 leading-none">
            <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-800 tracking-tight">ImpEx</span>
            <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-green-500 tracking-tight">Spot</span>
          </div>
          <span className="mt-1 text-[8px] sm:mt-1.5 sm:text-[10px] lg:text-[11px] font-medium text-gray-500 whitespace-nowrap">วงจรง่ายๆ ที่ให้พื้นที่นี้แม่นขึ้นทุกวัน</span>
        </button>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map(link => (
            <button key={link.id} onClick={() => onNavigate(link.id)}
              className="text-sm text-gray-500 hover:text-green-600 font-medium transition-colors cursor-pointer">
              {link.label}
            </button>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2" ref={menuRef}>
          <button onClick={() => onNavigate('map')}
            aria-label="เปิดแผนที่"
            className="bg-green-500 hover:bg-green-600 text-white text-sm lg:text-lg font-black p-2.5 sm:px-4 sm:py-2.5 lg:px-6 rounded-full transition-all hover:shadow-lg active:scale-95 shadow-md hover:shadow-green-500/50 animate-pulse flex items-center gap-2">
            <img src="/images/mascot_pin.png" alt="" className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 object-contain" />
            <span className="hidden sm:inline">มาดูแผนที่กัน</span>
          </button>
          <button onClick={() => onNavigate('admin')}
            className="hidden lg:block text-xs text-gray-400 hover:text-gray-600 font-medium px-3 py-2 rounded-full hover:bg-gray-100 transition-all">
            Admin
          </button>

          {/* Mobile Menu */}
          <button className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-all"
            aria-label={menuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
            onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>

          {menuOpen && (
            <div className="absolute right-3 top-full mt-2 w-52 bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100 z-50 lg:hidden">
              {NAV_LINKS.map(link => (
                <button key={link.id} onClick={() => { onNavigate(link.id); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors border-b border-gray-50 last:border-0">
                  {link.label}
                </button>
              ))}
              <button onClick={() => { onNavigate('admin'); setMenuOpen(false); }}
                className="w-full text-left px-4 py-3 text-sm text-gray-400 hover:bg-gray-50 transition-colors">
                🔒 Admin
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
