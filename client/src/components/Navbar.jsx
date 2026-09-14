import React, { useState, useRef, useEffect } from 'react';
import { FiMenu, FiX } from 'react-icons/fi';

const NAV_LINKS = [
  { label: 'Insight Feed', id: 'landing' },
  { label: 'Kanban Board', id: 'kanban' },
  { label: 'Impact Commu', id: 'commu' },
  { label: 'ทำงานยังไง', id: 'how' },
  { label: 'คำถามที่เจอบ่อย', id: 'faq' },
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
        <button className="flex items-center cursor-pointer" onClick={() => onNavigate('landing')}>
          <img src="/images/08.png" alt="ImpEx Spot" className="h-12 sm:h-14 lg:h-16 w-auto object-contain" />
        </button>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map(link => (
            <button key={link.id} onClick={() => onNavigate(link.id)}
              className={`play-btn px-3 py-1.5 text-sm font-medium ${
                currentView === link.id ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:text-green-600'
              }`}>
              {link.label}
            </button>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2" ref={menuRef}>
          <button onClick={() => onNavigate(currentView === 'kanban' ? 'report' : 'map')}
            aria-label={currentView === 'kanban' ? 'รายงานใหม่' : 'เปิดแผนที่'}
            className="play-btn play-btn-primary text-sm lg:text-base p-2.5 sm:px-4 sm:py-2.5 lg:px-5">
            <img src={currentView === 'kanban' ? '/images/mascot_alert.png' : '/images/mascot_pin.png'} alt="" className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 object-contain" />
            <span className="hidden sm:inline">{currentView === 'kanban' ? 'รายงานใหม่' : 'มาดูแผนที่กัน'}</span>
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
              <button onClick={() => { onNavigate('report'); setMenuOpen(false); }}
                className="w-full text-left px-4 py-3 text-sm text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors border-b border-gray-50">
                แจ้งปัญหา
              </button>
              <button onClick={() => { onNavigate('admin'); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 text-left px-4 py-3 text-sm text-gray-400 hover:bg-gray-50 transition-colors">
                <img src="/images/mascot_ruthan.png" alt="" className="h-5 w-5 object-contain" /> Admin
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
