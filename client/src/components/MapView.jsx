import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useAppContext } from '../context/AppContext';
import usePins from '../hooks/usePins';
import useGeolocation from '../hooks/useGeolocation';
import PinInfoWindow from './PinInfoWindow';
import Free3DMap from './Free3DMap';
import CameraPin from './CameraPin';
import LiveViewer from './LiveViewer';
import useCameras from '../hooks/useCameras';
import { PIN_CATEGORIES, MAIN_FEATURES } from '../utils/categories';
import { fetchDispatchedResponders } from '../utils/api';

const createPinIcon = (category) => {
  const image = category === 'emergency'
    ? '/images/5-transparent.png'
    : category === 'traffic'
      ? '/images/3-transparent.png'
      : category === 'cctv'
        ? '/images/cctv.png'
      : '/images/2.png';
  return L.divIcon({
    className: 'custom-pin-marker',
    html: `<div style="width:90px;height:90px;display:flex;align-items:center;justify-content:center;font-size:60px;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.3));animation:bounce 2s ease-in-out infinite;">
      <img src="${image}" alt="pin" style="width:100%;height:100%;object-fit:contain;" onerror="this.parentElement.textContent='📍'" />
    </div>`,
    iconSize: [90, 90],
    iconAnchor: [45, 90],
    popupAnchor: [0, -108],
  });
};

const userIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `<div style="width:70px;height:70px;display:flex;align-items:center;justify-content:center;font-size:50px;filter:drop-shadow(0 3px 10px rgba(0,0,0,0.3));animation:pulse 2s ease-in-out infinite;">
    <img src="/images/mascot_impact.png" alt="user" style="width:100%;height:100%;object-fit:contain;" onerror="this.parentElement.textContent='👤'" />
  </div>`,
  iconSize: [70, 70],
  iconAnchor: [35, 70],
  popupAnchor: [0, -75],
});

const selectedPinIcon = L.divIcon({
  className: 'custom-selected-pin-marker',
  html: `<div style="width:64px;height:64px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 3px 8px rgba(22,163,74,0.45));animation:bounce 1.4s ease-in-out infinite;">
    <img src="/images/mascot_impact.png" alt="ตำแหน่งที่เลือก" style="width:100%;height:100%;object-fit:contain;" />
  </div>`,
  iconSize: [64, 64],
  iconAnchor: [32, 64],
  popupAnchor: [0, -64],
});

const adminResponderIcon = L.divIcon({
  className: 'custom-admin-marker',
  html: `<div style="width:90px;height:90px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 3px 10px rgba(22,163,74,0.5));animation:bounce 2s ease-in-out infinite;">
    <img src="/images/admin2.png" alt="ทีมช่วยเหลือ" style="width:100%;height:100%;object-fit:contain;" onerror="this.parentElement.textContent='🛡️'" />
  </div>`,
  iconSize: [90, 90],
  iconAnchor: [45, 90],
  popupAnchor: [0, -95],
});

function FlyToUser({ position }) {
  const map = useMap();
  useEffect(() => { if (position) map.flyTo(position, 15, { duration: 1.5 }); }, [position]);
  return null;
}

function MapClickHandler({ onSelect }) {
  useMapEvents({ click: (event) => onSelect([event.latlng.lat, event.latlng.lng]) });
  return null;
}

function MapController({ onReady, bounds, pins }) {
  const map = useMap();
  const hasFocusedPins = useRef(false);

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  useEffect(() => {
    map.setMaxBounds(bounds || null);
  }, [bounds, map]);

  useEffect(() => {
    if (hasFocusedPins.current || pins.length === 0) return;

    const positions = pins
      .filter(pin => Number.isFinite(Number(pin.lat)) && Number.isFinite(Number(pin.lng)))
      .map(pin => [Number(pin.lat), Number(pin.lng)]);
    if (positions.length === 0) return;

    hasFocusedPins.current = true;
    if (positions.length === 1) {
      map.setView(positions[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, pins]);

  return null;
}

const trafficColors = {
  high: { color: '#dc2626', label: 'รถติดมาก' },
  medium: { color: '#eab308', label: 'รถติดปานกลาง' },
  low: { color: '#16a34a', label: 'รถไม่ติด' },
};

const getTrafficLevel = (pin) => {
  const value = pin.trafficLevel || pin.congestion || pin.trafficStatus;
  if (value === 'high' || value === 'heavy' || value === 'มาก') return 'high';
  if (value === 'low' || value === 'light' || value === 'น้อย') return 'low';
  return 'medium';
};

export default function MapView({ onAddPin, onEmergency, onFilter, onBack, pinFormOpen }) {
  const { cameras, cameraError } = useCameras();
  const [showCameras, setShowCameras] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const { pins, connected, lastRealtimeAt } = usePins();
  const { selectedPin, setSelectedPin, filters } = useAppContext();
  const { lat, lng } = useGeolocation();
  const [activeFilter, setActiveFilter] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [limitedBounds, setLimitedBounds] = useState(null);
  const [show3D, setShow3D] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [dispatchedResponders, setDispatchedResponders] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => setShowWelcome(false), 4000);
    return () => clearTimeout(t);
  }, []);

  // Real-time: poll dispatched responders every 10s
  useEffect(() => {
    const loadResponders = async () => {
      try {
        const data = await fetchDispatchedResponders();
        setDispatchedResponders(Array.isArray(data) ? data : []);
      } catch { /* API not ready yet — silent */ }
    };
    loadResponders();
    const interval = setInterval(loadResponders, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!pinFormOpen) setSelectedPosition(null);
  }, [pinFormOpen]);

  const filteredPins = pins.filter(pin => {
    if (pin.status !== 'active') return false;
    const t = pin.type || pin.category || 'other';
    if (activeFilter && t !== activeFilter) return false;
    if (filters.types.length > 0 && !filters.types.includes(t)) return false;
    if (filters.verified && (pin.confidence || 0) < 60) return false;
    return true;
  });

  const defaultCenter = [13.9127, 100.5534];
  const quickFilters = MAIN_FEATURES.filter(f => f.categories.length > 0);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const handleFilterClick = (feat) => {
    const isActive = feat.categories.some(c => c.id === activeFilter);
    setActiveFilter(isActive ? null : feat.categories[0]?.id);
  };

  const handleMapSelect = (position) => {
    if (limitedBounds) {
      const [selectedLat, selectedLng] = position;
      const [[south, west], [north, east]] = limitedBounds;
      if (selectedLat < south || selectedLat > north || selectedLng < west || selectedLng > east) return;
    }

    if (pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      if (action.action === 'emergency') {
        onEmergency(position);
      } else {
        onAddPin(position, action.category || '');
      }
      return;
    }

    setSelectedPosition(position);
    onAddPin(position);
  };

  const startAreaSelection = (action, category = '') => {
    setShowActionMenu(false);
    setSelectedPosition(null);
    setPendingAction({ action, category });
  };

  const handleLimitArea = () => {
    if (!mapInstance) return;
    const bounds = mapInstance.getBounds();
    setLimitedBounds([[bounds.getSouth(), bounds.getWest()], [bounds.getNorth(), bounds.getEast()]]);
  };

  return (
    <div style={{ width:'100%', height:'100%', position:'relative', overflow:'hidden', background:'#e8f0ea' }}>
      {selectedCamera && <div className="cctv-map-viewer"><LiveViewer camera={selectedCamera} onClose={() => setSelectedCamera(null)} /></div>}

      {/* ── TOP: Filter Bar (ซ่อนได้) ── */}
      {showFilterBar && (
        <div style={{
          position:'absolute', top:0, left:0, right:0, zIndex:900,
          background:'rgba(255,255,255,0.94)', borderBottom:'1px solid #e5e7eb',
          padding:'8px 12px', display:'flex', alignItems:'center', gap:8,
        }}>
          {/* Chips — scrollable */}
          <div style={{ display:'flex', gap:8, flex:1, overflowX:'auto' }} className="no-scrollbar">
            <button onClick={() => setActiveFilter(null)}
              style={{
                flexShrink:0, display:'flex', alignItems:'center', gap:6,
                padding:'8px 16px', borderRadius:999, border:'none', cursor:'pointer',
                fontSize:12, fontWeight:700,
                background: !activeFilter ? '#22c55e' : '#f3f4f6',
                color: !activeFilter ? '#fff' : '#4b5563',
              }}>
              <img src="/images/mascot.png" alt="" style={{width:16,height:16,objectFit:'contain'}} />
              ทั้งหมด
            </button>
            {quickFilters.map(feat => {
              const isActive = feat.categories.some(c => c.id === activeFilter);
              return (
                <button key={feat.id} onClick={() => handleFilterClick(feat)}
                  style={{
                    flexShrink:0, display:'flex', alignItems:'center', gap:6,
                    padding:'8px 16px', borderRadius:999, border:'none', cursor:'pointer',
                    fontSize:12, fontWeight:700,
                    background: isActive ? feat.color : '#f3f4f6',
                    color: isActive ? '#fff' : '#4b5563',
                  }}>
                  {feat.emoji} {feat.label}
                </button>
              );
            })}
          </div>

          {/* ปุ่มปิด ✕ */}
          <button onClick={() => setShowFilterBar(false)}
            style={{
              flexShrink:0, width:32, height:32, borderRadius:999,
              border:'1px solid #e5e7eb', background:'#f9fafb',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', fontSize:14, color:'#9ca3af',
              marginLeft:4,
            }}
            title="ซ่อนแถบตัวกรอง">
            ✕
          </button>
        </div>
      )}

      {/* ── MIDDLE: Map ── */}
      <div style={{ position:'absolute', inset:0, zIndex:1, overflow:'hidden' }}>
        {show3D ? (
          <Free3DMap
            cameras={showCameras ? cameras : []}
            onCameraClick={setSelectedCamera}
            pins={filteredPins}
            userPosition={lat && lng ? [lat, lng] : defaultCenter}
            selectedPosition={selectedPosition}
            limitedBounds={limitedBounds}
            onMapSelect={handleMapSelect}
            onPinClick={setSelectedPin}
            onReady={setMapInstance}
            onUnavailable={() => setShow3D(false)}
          />
        ) : <MapContainer center={defaultCenter} zoom={14} minZoom={3} maxZoom={19}
          style={{width:'100%',height:'100%',zIndex:1}}
          zoomControl={false} attributionControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          <ZoomControl position="bottomleft" />
          <MapController onReady={setMapInstance} bounds={limitedBounds} pins={filteredPins} />
          <MapClickHandler onSelect={handleMapSelect} />
          {flyTo && <FlyToUser position={flyTo} />}
          {showCameras && cameras.map(camera => <CameraPin key={camera.id} camera={camera} onSelect={setSelectedCamera} />)}
          {(lat && lng) ? (
            <Marker position={[lat, lng]} icon={userIcon} />
          ) : (
            <Marker position={defaultCenter} icon={userIcon} />
          )}
          {filteredPins.map(pin => (
            <React.Fragment key={pin.id}>
              {(pin.type || pin.category) === 'traffic' && (
                <Circle center={[pin.lat, pin.lng]} radius={90}
                  pathOptions={{
                    color: trafficColors[getTrafficLevel(pin)].color,
                    fillColor: trafficColors[getTrafficLevel(pin)].color,
                    fillOpacity: 0.2,
                    weight: 3,
                  }} />
              )}
              {(pin.type || pin.category) === 'emergency' && (
                <Circle center={[pin.lat, pin.lng]} radius={180}
                  pathOptions={{
                    color: '#dc2626',
                    fillColor: '#ef4444',
                    fillOpacity: 0.18,
                    weight: 4,
                    opacity: 0.85,
                  }} />
              )}
              {(pin.type || pin.category) === 'cctv' && (
                <Circle center={[pin.lat, pin.lng]} radius={100} interactive={false}
                  pathOptions={{
                    color: '#0284c7',
                    fillColor: '#38bdf8',
                    fillOpacity: 0.18,
                    weight: 2,
                    opacity: 0.9,
                  }} />
              )}
              <Marker position={[pin.lat, pin.lng]}
                icon={createPinIcon(pin.type || pin.category || 'other')}
                eventHandlers={{ click: () => setSelectedPin(pin) }}>
              <Popup maxWidth={260} minWidth={260} closeButton={false} className="custom-popup" autoPan={true} autoPanPaddingTopLeft={[50, 50]} autoPanPaddingBottomRight={[50, 280]}>
                <PinInfoWindow pin={pin} onClose={() => setSelectedPin(null)} />
              </Popup>
              </Marker>
            </React.Fragment>
          ))}
          {/* Admin/Responder Markers — real-time */}
          {dispatchedResponders.filter(r => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng))).map(responder => (
            <Marker key={`resp-${responder.id || responder._id}`}
              position={[Number(responder.lat), Number(responder.lng)]}
              icon={adminResponderIcon}>
              <Popup maxWidth={240} minWidth={200} closeButton={false} className="custom-popup">
                <div style={{padding:8,fontFamily:'inherit'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <span style={{width:36,height:36,background:'#dbeafe',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🛡️</span>
                    <div>
                      <p style={{fontSize:13,fontWeight:800,color:'#1e3a5f',margin:0}}>{responder.name || 'ทีมช่วยเหลือ'}</p>
                      <p style={{fontSize:10,color:'#64748b',margin:0}}>{responder.role || 'Admin Responder'}</p>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                    <span style={{width:8,height:8,borderRadius:'50%',background: responder.status === 'on_scene' ? '#16a34a' : responder.status === 'dispatched' ? '#2563eb' : '#eab308'}}></span>
                    <span style={{fontSize:11,fontWeight:700,color: responder.status === 'on_scene' ? '#166534' : '#1e40af'}}>
                      {responder.status === 'on_scene' ? 'ถึงที่เกิดเหตุแล้ว' : responder.status === 'dispatched' ? 'กำลังเดินทาง' : 'รับประสานงาน'}
                    </span>
                  </div>
                  {responder.phone && (
                    <a href={`tel:${responder.phone}`}
                      style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'8px 12px',borderRadius:12,background:'#2563eb',color:'white',fontSize:12,fontWeight:700,textDecoration:'none',marginTop:6}}>
                      📞 ติดต่อทีมงาน
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          {selectedPosition && <Marker position={selectedPosition} icon={selectedPinIcon} />}
        </MapContainer>}

        {/* Welcome */}
        {showWelcome && (
          <div className="map-welcome animate-slide-down" style={{ position:'absolute', top:12, left:'50%', transform:'translateX(-50%)', zIndex:800 }}>
            <div style={{background:'rgba(255,255,255,0.90)',borderRadius:16,padding:'10px 16px',display:'flex',alignItems:'center',gap:10,boxShadow:'0 4px 20px rgba(0,0,0,0.1)',border:'1px solid #dcfce7',whiteSpace:'nowrap',backdropFilter:'blur(10px)'}}>
              <img src="/images/mascot.png" alt="" style={{width:28,height:28,objectFit:'contain'}} className="animate-float" />
              <div>
                <p style={{fontSize:11,fontWeight:700,color:'#1f2937',margin:0}}>ยินดีต้อนรับ! 👋</p>
                <p style={{fontSize:9,color:'#9ca3af',margin:0}}>กดปักหมุดเพื่อแบ่งปัน</p>
              </div>
              <button onClick={()=>setShowWelcome(false)} style={{background:'none',border:'none',color:'#d1d5db',cursor:'pointer',fontSize:14,padding:4}}>✕</button>
            </div>
          </div>
        )}

        {/* Pin Count + ปุ่มเปิด Filter กลับ */}
        <div className="map-top-controls" style={{ position:'absolute', top:12, left:12, zIndex:800, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', rowGap:6, maxWidth:isMobile ? 'calc(100vw - 24px)' : 'none', padding:4, borderRadius:16, background:'rgba(255,255,255,0.78)', backdropFilter:'blur(10px)', boxShadow:'0 3px 12px rgba(15,23,42,0.12)' }}>
          <button aria-pressed={showCameras} title={cameraError || 'แสดงกล้อง CCTV'} onClick={() => { setShowCameras(value => !value); setSelectedCamera(null); }} style={{ border:'none',borderRadius:11,padding:'6px 10px',fontSize:11,fontWeight:800,background:showCameras ? '#fce7f3' : '#f1f5f9',color:'#9d174d',display:'flex',alignItems:'center',gap:5,cursor:'pointer' }}>
            <img src="/images/cctv.png" alt="" aria-hidden="true" style={{width:20,height:24,objectFit:'contain'}} />
            CCTV {cameraError ? '· ไม่พร้อมใช้งาน' : cameras.length}
          </button>
          <div style={{background:'#dcfce7',borderRadius:11,padding:'8px 11px',fontSize:11,fontWeight:800,color:'#15803d',display:'flex',alignItems:'center',gap:6}}>
            <img src="/images/mascot.png" alt="" style={{width:14,height:14,objectFit:'contain'}} />
            {filteredPins.length} หมุด
          </div>

          {/* ปุ่มเปิด filter กลับ (แสดงเมื่อซ่อน) */}
          {!showFilterBar && (
            <button onClick={() => setShowFilterBar(true)}
              style={{
                background:'#dbeafe', borderRadius:11, padding:'8px 11px',
                fontSize:11, fontWeight:800, color:'#1e40af',
                border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4,
              }}>
              <img src="/images/mascot_search.png" alt="" style={{width:16,height:16,objectFit:'contain'}} />
              ตัวกรอง ▼
            </button>
          )}
          <button className={`area-limit-button ${limitedBounds ? 'is-active' : ''}`}
            onClick={limitedBounds ? () => setLimitedBounds(null) : handleLimitArea}
            aria-label={limitedBounds ? 'ยกเลิกการจำกัดพื้นที่' : 'จำกัดพื้นที่นี้'}
            title={limitedBounds ? 'ยกเลิกการจำกัดพื้นที่' : 'จำกัดพื้นที่นี้'}
            style={{background:limitedBounds ? '#fee2e2' : '#fef3c7',borderRadius:11,padding:'8px 11px',fontSize:11,fontWeight:800,color:limitedBounds ? '#b91c1c' : '#92400e',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
            <img className="area-limit-icon" src="/images/mascot_impact.png" alt="" aria-hidden="true" />
            <span>{limitedBounds ? 'ปลดล็อกพื้นที่' : 'จำกัดพื้นที่นี้'}</span>
          </button>
          <button onClick={() => setShow3D(value => !value)}
            aria-label={show3D ? 'ใช้แผนที่ 2 มิติ' : 'ใช้แผนที่ 3 มิติ'}
            title={show3D ? 'เปลี่ยนเป็นแผนที่ 2 มิติ' : 'เปิดแผนที่ 3 มิติ'}
            style={{background:show3D ? '#dcfce7' : '#e0e7ff',borderRadius:11,padding:'8px 11px',fontSize:11,fontWeight:800,color:show3D ? '#166534' : '#3730a3',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
            {show3D ? '3D' : '2D'}
          </button>
        </div>

        <div className="traffic-legend" style={{position:'absolute',top:isMobile ? 74 : 12,right:isMobile ? 'auto' : 12,left:isMobile ? 12 : 'auto',zIndex:800,background:'rgba(255,255,255,0.92)',borderRadius:12,padding:'8px 10px',boxShadow:'0 2px 10px rgba(0,0,0,0.1)',backdropFilter:'blur(8px)',fontSize:10,fontWeight:700,color:'#374151',maxWidth:isMobile ? 'calc(100vw - 24px)' : 'none',overflowX:isMobile ? 'auto' : 'visible'}}>
          <div style={{display:'flex',gap:8,alignItems:'center',whiteSpace:'nowrap'}}>
            {Object.entries(trafficColors).map(([level, item]) => (
              <span key={level} style={{display:'flex',alignItems:'center',gap:3}}>
                <i style={{width:9,height:9,borderRadius:'50%',background:item.color,display:'inline-block'}} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className={`realtime-status ${connected ? 'is-live' : ''}`} title={lastRealtimeAt ? `อัปเดตล่าสุด ${lastRealtimeAt.toLocaleTimeString('th-TH')}` : 'กำลังเชื่อมต่อข้อมูล realtime'}>
          <span className="realtime-dot" />
          <span>{connected ? 'LIVE' : 'กำลังเชื่อมต่อ'}</span>
          {lastRealtimeAt && <small>{lastRealtimeAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</small>}
        </div>

        {pendingAction && !selectedPosition && (
          <div className="map-selection-hint" style={{position:'absolute',bottom:16,left:'50%',transform:'translateX(-50%)',zIndex:850,background:'rgba(127,29,29,0.95)',color:'#fff',borderRadius:14,padding:'10px 14px',boxShadow:'0 4px 16px rgba(0,0,0,0.2)',fontSize:11,fontWeight:700,whiteSpace:'nowrap'}}>
            {pendingAction.action === 'emergency' ? '🚨 แตะบนแผนที่เพื่อเลือกจุดเกิดเหตุ' : pendingAction.action === 'share' ? '💬 แตะบนแผนที่เพื่อเลือกจุดที่ต้องการแบ่งปัน' : '📍 แตะบนแผนที่เพื่อเลือกจุดปักหมุด'}
            <button onClick={() => setPendingAction(null)} style={{marginLeft:10,border:0,background:'transparent',color:'#fecaca',fontSize:15,cursor:'pointer'}}>✕</button>
          </div>
        )}

        {selectedPosition && (
          <div className="selected-position-banner" style={{position:'absolute',bottom:12,left:'50%',transform:'translateX(-50%)',zIndex:800,display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.96)',borderRadius:14,padding:'8px 10px 8px 12px',boxShadow:'0 4px 16px rgba(0,0,0,0.16)',whiteSpace:'nowrap'}}>
            <span style={{fontSize:11,fontWeight:700,color:pendingAction?.action === 'emergency' ? '#b91c1c' : '#166534'}}>{pendingAction?.action === 'emergency' ? 'เลือกจุดเกิดเหตุแล้ว' : pendingAction?.action === 'share' ? 'เลือกจุดแบ่งปันแล้ว' : 'เลือกตำแหน่งแล้ว'}</span>
            <button onClick={() => {
              if (pendingAction?.action === 'emergency') {
                setPendingAction(null);
                onEmergency(selectedPosition);
              } else {
                const category = pendingAction?.category || '';
                setPendingAction(null);
                onAddPin(selectedPosition, category);
              }
            }} style={{border:'none',borderRadius:9,padding:'7px 10px',background:pendingAction?.action === 'emergency' ? '#dc2626' : '#16a34a',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>{pendingAction?.action === 'emergency' ? 'กรอกข้อมูลแจ้งเหตุ' : pendingAction?.action === 'share' ? 'กรอกข้อมูลแบ่งปัน' : 'กรอกข้อมูลปักหมุด'}</button>
            <button onClick={() => setSelectedPosition(null)} aria-label="ยกเลิกตำแหน่งที่เลือก" style={{border:'none',background:'transparent',fontSize:16,color:'#9ca3af',cursor:'pointer'}}>✕</button>
          </div>
        )}

        {/* My Location */}
        {lat && lng && (
          <button className="my-location-button" onClick={() => { setFlyTo([lat, lng]); setSelectedPosition([lat, lng]); }}
            style={{position:'absolute',bottom:12,right:12,zIndex:800,width:40,height:40,background:'rgba(34,197,94,0.25)',borderRadius:999,border:'1px solid #dcfce7',boxShadow:'0 2px 8px rgba(0,0,0,0.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:16,backdropFilter:'blur(8px)'}}>
            📌
          </button>
        )}

        {/* Empty State */}
        {filteredPins.length === 0 && !showWelcome && (
          <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:800,textAlign:'center',pointerEvents:'none'}}>
            <div style={{background:'rgba(255,255,255,0.90)',borderRadius:24,padding:24,boxShadow:'0 4px 20px rgba(0,0,0,0.08)',maxWidth:220,backdropFilter:'blur(10px)'}}>
              <img src="/images/mascot_ruthan.png" alt="" style={{width:56,height:56,objectFit:'contain',margin:'0 auto 8px',display:'block'}} className="animate-float" />
              <p style={{fontSize:13,fontWeight:700,color:'#374151',margin:'0 0 4px'}}>ยังไม่มีหมุดในพื้นที่นี้</p>
              <p style={{fontSize:10,color:'#9ca3af',margin:0}}>ลองเลื่อนแผนที่ หรือปักหมุดเลย! 🎉</p>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM: Action Bar (ใหญ่ขึ้น + ปุ่มย้อนกลับ) ── */}
      <div className="map-action-dock" style={{ position:'absolute', right:'16px', top:'50%', transform:'translateY(-50%)', zIndex:900 }}>
        {showActionMenu && (
          <div className="map-action-menu" role="menu" aria-label="เมนูการทำงาน">
            <button onClick={() => startAreaSelection('pin', 'traffic')} role="menuitem">
              <img src="/images/mascot_pin.png" alt="" /> ปักหมุด
            </button>
            <button onClick={() => startAreaSelection('emergency')} role="menuitem">
              <img src="/images/mascot_alert.png" alt="" /> แจ้งเหตุ
            </button>
            <button onClick={() => startAreaSelection('share', 'restaurant')} role="menuitem">
              <img src="/images/mascot_share.png" alt="" /> แบ่งปัน
            </button>
            <button onClick={() => { setShowActionMenu(false); onFilter(); }} role="menuitem">
              <img src="/images/mascot_search.png" alt="" /> กรองหมุด
            </button>
          </div>
        )}
        <div className="map-action-buttons" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'clamp(8px, 1.6vw, 14px)'}}>
          {/* กลับหน้าแรก */}
          <button className="map-action-button" data-tooltip="กลับหน้าแรก" onClick={onBack} aria-label="กลับหน้าแรก" title="กลับหน้าแรก"
            style={{display:'flex',alignItems:'center',justifyContent:'center',width:'clamp(52px, 6vw, 64px)',height:'clamp(52px, 6vw, 64px)',borderRadius:18,border:'2px solid #16a34a',cursor:'pointer',background:'#ffffff',color:'#16a34a',boxShadow:'0 3px 9px rgba(22,163,74,0.15)',transition:'all 0.2s'}}
            onMouseEnter={(e) => {e.currentTarget.style.transform='scale(1.08)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(22,163,74,0.25)'}}
            onMouseLeave={(e) => {e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 2px 8px rgba(22,163,74,0.15)'}}>
            <img src="/images/mascot.png" alt="หน้าแรก" style={{width:'clamp(34px, 4.5vw, 50px)',height:'clamp(34px, 4.5vw, 50px)',objectFit:'contain'}} />
            <span className="map-action-label" style={{color:'#15803d',textShadow:'none'}}>หน้าแรก</span>
          </button>
          {/* รู้ทัน */}
          <button className="map-action-button" data-tooltip="รู้ทัน: เลือกพื้นที่" onClick={() => startAreaSelection('pin', 'traffic')} aria-label="เลือกพื้นที่ปักหมุดสถานการณ์" title="เลือกพื้นที่ปักหมุดสถานการณ์"
            style={{display:'flex',alignItems:'center',justifyContent:'center',width:'clamp(52px, 6vw, 64px)',height:'clamp(52px, 6vw, 64px)',borderRadius:18,border:'2px solid #16a34a',cursor:'pointer',background:'#ffffff',color:'#16a34a',boxShadow:'0 3px 9px rgba(22,163,74,0.15)',transition:'all 0.2s'}}
            onMouseEnter={(e) => {e.target.style.transform='scale(1.08)'; e.target.style.boxShadow='0 4px 16px rgba(22,163,74,0.25)'}}
            onMouseLeave={(e) => {e.target.style.transform='scale(1)'; e.target.style.boxShadow='0 2px 8px rgba(22,163,74,0.15)'}}
            onMouseDown={(e) => e.target.style.transform='scale(0.95)'}
            onMouseUp={(e) => {e.target.style.transform='scale(1.08)'}}>
            <img src="/images/mascot.png" alt="รู้ทัน" style={{width:'clamp(34px, 4.5vw, 50px)',height:'clamp(34px, 4.5vw, 50px)',objectFit:'contain'}} />
            <span className="map-action-label" style={{color:'#15803d',textShadow:'none'}}>รู้ทัน</span>
          </button>
          {/* ปักหมุด */}
          <button className={`map-action-button ${showActionMenu ? 'is-open' : ''}`} data-tooltip="ปักหมุด: เลือกพื้นที่" onClick={() => startAreaSelection('pin', 'restroom')} aria-label="เลือกพื้นที่ปักหมุดสถานที่" title="เลือกพื้นที่ปักหมุดสถานที่"
            style={{display:'flex',alignItems:'center',justifyContent:'center',width:'clamp(52px, 6vw, 64px)',height:'clamp(52px, 6vw, 64px)',borderRadius:18,border:'none',cursor:'pointer',background:'#16a34a',color:'#fff',boxShadow:'0 3px 9px rgba(22,163,74,0.3)',transition:'all 0.2s'}}
            onMouseEnter={(e) => {e.target.style.transform='scale(1.08)'; e.target.style.boxShadow='0 4px 16px rgba(34,197,94,0.5)'}}
            onMouseLeave={(e) => {e.target.style.transform='scale(1)'; e.target.style.boxShadow='0 2px 8px rgba(34,197,94,0.3)'}}
            onMouseDown={(e) => e.target.style.transform='scale(0.95)'}
            onMouseUp={(e) => {e.target.style.transform='scale(1.08)'}}>
            <img src="/images/mascot_pin.png" alt="ปักหมุด" style={{width:'clamp(34px, 4.5vw, 50px)',height:'clamp(34px, 4.5vw, 50px)',objectFit:'contain'}} />
            <span className="map-action-label">ปักหมุด</span>
          </button>
          {/* CCTV */}
          <button className="map-action-button" data-tooltip="CCTV: เลือกพื้นที่" onClick={() => startAreaSelection('pin', 'cctv')} aria-label="เลือกพื้นที่ปักหมุดกล้อง CCTV" title="เลือกพื้นที่ปักหมุดกล้อง CCTV"
            style={{display:'flex',flexDirection:'column',gap:0,alignItems:'center',justifyContent:'center',width:'clamp(52px, 6vw, 64px)',height:'clamp(52px, 6vw, 64px)',borderRadius:18,border:'2px solid #ec4899',cursor:'pointer',background:'#fce7f3',color:'#be185d',boxShadow:'0 3px 9px rgba(236,72,153,0.2)',transition:'all 0.2s'}}
            onMouseEnter={(e) => {e.currentTarget.style.transform='scale(1.08)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(236,72,153,0.35)'}}
            onMouseLeave={(e) => {e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 3px 9px rgba(236,72,153,0.2)'}}>
            <img src="/images/cctv.png" alt="CCTV" style={{width:'clamp(32px, 4vw, 42px)',height:'clamp(34px, 4.3vw, 44px)',objectFit:'contain'}} />
            <span className="map-action-label" style={{color:'#be185d',textShadow:'none'}}>CCTV</span>
          </button>
          {/* แจ้งเหตุ */}
          <button className="map-action-button" data-tooltip="แจ้งเหตุ: เลือกพื้นที่" onClick={() => startAreaSelection('emergency')} aria-label="เลือกพื้นที่แจ้งเหตุฉุกเฉิน" title="เลือกพื้นที่แจ้งเหตุฉุกเฉิน"
            style={{display:'flex',alignItems:'center',justifyContent:'center',width:'clamp(52px, 6vw, 64px)',height:'clamp(52px, 6vw, 64px)',borderRadius:18,border:'none',cursor:'pointer',background:'#dc2626',color:'#fff',boxShadow:'0 3px 9px rgba(220,38,38,0.3)',transition:'all 0.2s',animation:'pulse 2s ease-in-out infinite'}}
            onMouseEnter={(e) => {e.target.style.transform='scale(1.08)'; e.target.style.boxShadow='0 4px 16px rgba(239,68,68,0.5)'}}
            onMouseLeave={(e) => {e.target.style.transform='scale(1)'; e.target.style.boxShadow='0 2px 8px rgba(239,68,68,0.3)'}}
            onMouseDown={(e) => e.target.style.transform='scale(0.95)'}
            onMouseUp={(e) => {e.target.style.transform='scale(1.08)'}}>
            <img src="/images/mascot_alert.png" alt="แจ้งเหตุ" style={{width:'clamp(34px, 4.5vw, 50px)',height:'clamp(34px, 4.5vw, 50px)',objectFit:'contain'}} />
            <span className="map-action-label">แจ้งเหตุ</span>
          </button>
          {/* แบ่งปัน */}
          <button className="map-action-button" data-tooltip="แบ่งปัน: เลือกพื้นที่" onClick={() => startAreaSelection('share', 'restaurant')} aria-label="เลือกพื้นที่แบ่งปัน" title="เลือกพื้นที่แบ่งปัน"
            style={{display:'flex',alignItems:'center',justifyContent:'center',width:'clamp(52px, 6vw, 64px)',height:'clamp(52px, 6vw, 64px)',borderRadius:18,border:'2px solid #16a34a',cursor:'pointer',background:'#ffffff',color:'#16a34a',boxShadow:'0 3px 9px rgba(22,163,74,0.15)',transition:'all 0.2s'}}
            onMouseEnter={(e) => {e.target.style.transform='scale(1.08)'; e.target.style.boxShadow='0 4px 16px rgba(22,163,74,0.25)'}}
            onMouseLeave={(e) => {e.target.style.transform='scale(1)'; e.target.style.boxShadow='0 2px 8px rgba(22,163,74,0.15)'}}
            onMouseDown={(e) => e.target.style.transform='scale(0.95)'}
            onMouseUp={(e) => {e.target.style.transform='scale(1.08)'}}>
            <img src="/images/mascot_share.png" alt="แบ่งปัน" style={{width:'clamp(34px, 4.5vw, 50px)',height:'clamp(34px, 4.5vw, 50px)',objectFit:'contain'}} />
            <span className="map-action-label" style={{color:'#15803d',textShadow:'none'}}>แบ่งปัน</span>
          </button>
          {/* กรอง */}
          <button className="map-action-button" data-tooltip="กรองหมุด" onClick={onFilter} aria-label="กรองหมุด" title="กรองหมุด"
            style={{display:'flex',alignItems:'center',justifyContent:'center',width:'clamp(52px, 6vw, 64px)',height:'clamp(52px, 6vw, 64px)',borderRadius:18,border:'2px solid #16a34a',cursor:'pointer',background:'#ffffff',color:'#16a34a',boxShadow:'0 3px 9px rgba(22,163,74,0.15)',transition:'all 0.2s'}}
            onMouseEnter={(e) => {e.target.style.transform='scale(1.08)'; e.target.style.boxShadow='0 4px 16px rgba(22,163,74,0.25)'}}
            onMouseLeave={(e) => {e.target.style.transform='scale(1)'; e.target.style.boxShadow='0 2px 8px rgba(22,163,74,0.15)'}}
            onMouseDown={(e) => e.target.style.transform='scale(0.95)'}
            onMouseUp={(e) => {e.target.style.transform='scale(1.08)'}}>
            <img src="/images/mascot_search.png" alt="กรองหมุด" style={{width:'clamp(34px, 4.5vw, 50px)',height:'clamp(34px, 4.5vw, 50px)',objectFit:'contain'}} />
            <span className="map-action-label" style={{color:'#15803d',textShadow:'none'}}>กรองหมุด</span>
          </button>
        </div>
      </div>
    </div>
  );
}
