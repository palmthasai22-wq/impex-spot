import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { FiSearch, FiX } from 'react-icons/fi';

export default function SearchBar({ onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const { pins } = useAppContext();

  const results = query.length >= 2
    ? pins.filter(p => p.title?.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="relative">
      <div className="relative">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          className="input-modern pl-10 pr-10"
          placeholder="ค้นหาสถานที่..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <FiX size={16} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 glass-card overflow-hidden z-50 max-h-64 overflow-y-auto">
          {results.map(pin => (
            <button
              key={pin.id}
              onClick={() => { onSelect && onSelect(pin); setOpen(false); setQuery(''); }}
              className="w-full text-left px-4 py-3 hover:bg-brand-50 transition-colors border-b border-gray-100 last:border-0 flex items-center gap-3"
            >
              <span className="text-lg">{pin.emoji || '📍'}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{pin.title}</p>
                <p className="text-[10px] text-gray-400">{pin.type || pin.category}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
