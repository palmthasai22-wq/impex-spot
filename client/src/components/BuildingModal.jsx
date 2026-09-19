import React, { useState, useEffect, useRef } from 'react';
import { BUILDINGS } from '../utils/buildings';
import PinForm from './PinForm';
import usePins from '../hooks/usePins';
import { PIN_CATEGORIES } from '../utils/categories';

export default function BuildingModal({ building, initialFloorId, onClose, onSelectBuilding }) {
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const [showPinForm, setShowPinForm] = useState(false);
  const [indoorPinData, setIndoorPinData] = useState(null);
  const { pins } = usePins();
  const imageRef = useRef(null);

  // Set initial floor when building changes or initialFloorId is provided
  useEffect(() => {
    if (building && initialFloorId) {
      const idx = (building.floors || []).findIndex(f => f.id === initialFloorId);
      if (idx !== -1) {
        setActiveFloorIndex(idx);
        return;
      }
    }
    setActiveFloorIndex(0);
  }, [building, initialFloorId]);

  if (!building) return null;

  const floors = building.floors || [];
  const activeFloor = floors[activeFloorIndex];

  // Filter pins for this floor
  const indoorPins = pins.filter(pin => 
    pin.is_indoor === true && 
    pin.indoor_building_id === building.id && 
    pin.indoor_floor_id === activeFloor?.id
  );

  const handleImageClick = (e) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setIndoorPinData({
      building_id: building.id,
      floor_id: activeFloor.id,
      x: x,
      y: y
    });
    setShowPinForm(true);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.85)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)', padding: '20px'
    }}>
      <div className="animate-slide-up" style={{
        background: 'white', width: '100%', maxWidth: '960px', height: '85vh',
        borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', background: 'linear-gradient(90deg, #1e3a8a, #3b82f6)',
          color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexDirection: window.innerWidth <= 640 ? 'column' : 'row', gap: 12
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>🏢 ผังอาคารภายใน (Indoor Maps)</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {BUILDINGS.map(b => (
                <button
                  key={b.id}
                  onClick={() => onSelectBuilding && onSelectBuilding(b)}
                  style={{
                    background: building.id === b.id ? 'white' : 'rgba(255,255,255,0.2)',
                    color: building.id === b.id ? '#1e3a8a' : 'white',
                    border: 'none', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer'
                  }}>
                  {b.name}
                </button>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
            width: 36, height: 36, borderRadius: '50%', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s',
            alignSelf: window.innerWidth <= 640 ? 'flex-end' : 'auto', marginTop: window.innerWidth <= 640 ? -48 : 0
          }}>✕</button>
        </div>

        {/* Content Area */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: window.innerWidth > 640 ? 'row' : 'column' }}>
          
          {/* Floor Switcher Sidebar */}
          {floors.length > 1 && (
            <div style={{
              width: window.innerWidth > 640 ? '220px' : '100%',
              background: '#f8fafc', borderRight: window.innerWidth > 640 ? '1px solid #e2e8f0' : 'none',
              borderBottom: window.innerWidth <= 640 ? '1px solid #e2e8f0' : 'none',
              padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: window.innerWidth > 640 ? 'column' : 'row',
              gap: 8, flexShrink: 0
            }}>
              <p style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 800, color: '#334155', display: window.innerWidth > 640 ? 'block' : 'none' }}>เลือกชั้นอาคาร</p>
              {floors.map((floor, index) => {
                const isActive = index === activeFloorIndex;
                return (
                  <button
                    key={floor.id}
                    onClick={() => setActiveFloorIndex(index)}
                    style={{
                      padding: '12px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                      background: isActive ? '#3b82f6' : 'white',
                      color: isActive ? 'white' : '#475569',
                      border: isActive ? 'none' : '1px solid #e2e8f0',
                      boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                      transition: 'all 0.2s', minWidth: window.innerWidth <= 640 ? '140px' : 'auto'
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{floor.name}</div>
                    <div style={{ fontSize: 11, opacity: isActive ? 0.9 : 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {floor.description}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Main Floor Plan View */}
          <div style={{
            flex: 1, overflow: 'auto', background: '#e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            position: 'relative'
          }}>
            {activeFloor ? (
              <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', maxHeight: '100%' }}>
                <img 
                  ref={imageRef}
                  src={activeFloor.image} 
                  alt={activeFloor.name}
                  onClick={handleImageClick}
                  style={{
                    maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)', borderRadius: 12, background: 'white',
                    cursor: 'crosshair', display: 'block'
                  }} 
                />
                
                {/* Render Indoor Pins */}
                {indoorPins.map(pin => {
                  const cat = PIN_CATEGORIES.find(c => c.id === (pin.category || pin.type));
                  const emoji = cat ? cat.emoji : '📍';
                  return (
                    <div 
                      key={pin.id}
                      style={{
                        position: 'absolute',
                        left: `${pin.indoor_x}%`,
                        top: `${pin.indoor_y}%`,
                        transform: 'translate(-50%, -100%)',
                        fontSize: 24,
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                        pointerEvents: 'none'
                      }}
                      title={pin.title}
                    >
                      {emoji}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: '#64748b', textAlign: 'center' }}>
                <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>🏗️</span>
                <p>ไม่มีข้อมูลผังอาคาร</p>
              </div>
            )}
            
            {/* Absolute Floor Label overlay on image */}
            {activeFloor && (
              <div style={{
                position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.9)',
                padding: '8px 16px', borderRadius: 999, fontWeight: 800, color: '#1e3a8a',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)', fontSize: 13,
                pointerEvents: 'none'
              }}>
                📍 {activeFloor.name} (คลิกที่รูปเพื่อปักหมุด)
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>* นำรูปผังอาคารของจริงมาวางทับที่ /images/floorplans/ ได้เลย</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontWeight: 800, cursor: 'pointer', padding: '4px 12px' }}>ปิดหน้าต่าง</button>
        </div>
      </div>
      
      {/* Pin Form Modal for Indoor Pins */}
      {showPinForm && (
        <div style={{ position: 'absolute', zIndex: 10000, inset: 0 }}>
          <PinForm 
            onClose={() => setShowPinForm(false)} 
            indoorData={indoorPinData}
            initialCategory="cctv"
          />
        </div>
      )}
    </div>
  );
}
