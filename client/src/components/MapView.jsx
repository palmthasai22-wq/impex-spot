import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, Circle, useMapEvents, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { useAppContext } from '../context/AppContext';
import usePins from '../hooks/usePins';
import useGeolocation from '../hooks/useGeolocation';
import PinInfoWindow from './PinInfoWindow';
import Free3DMap from './Free3DMap';
import CameraPin from './CameraPin';
import LiveViewer from './LiveViewer';
import useCameras from '../hooks/useCameras';
import useTrafficFlow from '../hooks/useTrafficFlow';
import useCameraTraffic from '../hooks/useCameraTraffic';
import useEvents from '../hooks/useEvents';
import EventPin from './EventPin';
import BuildingModal from './BuildingModal';
import MapExplorerControls from './MapExplorerControls';
import { BUILDINGS } from '../utils/buildings';
import { PIN_CATEGORIES, MAIN_FEATURES } from '../utils/categories';
import { fetchDispatchedResponders } from '../utils/api';
import { TRAFFIC_LEVELS, connectCctvToDetec, getTrafficLevel as getAiTrafficLevel, hasTrafficCoordinates, trafficNodeId } from '../utils/traffic';
import { eventOccursOn, getCamerasNearVenue, getEventStatus, getVenueLocation } from '../utils/events';

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

const createTrafficIcon = (node) => {
  const level = getAiTrafficLevel(node);
  const traffic = TRAFFIC_LEVELS[level];
  return L.divIcon({
    className: 'ai-traffic-marker',
    html: `<div title="${traffic.label}" style="width:42px;height:42px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${traffic.color};border:3px solid white;box-shadow:0 4px 14px rgba(15,23,42,.35);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:18px">🚦</span></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 42],
    popupAnchor: [0, -44],
  });
};

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

function MapController({ onReady, bounds }) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  useEffect(() => {
    map.setMaxBounds(bounds || null);
  }, [bounds, map]);

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

export default function MapView({ onAddPin, onEmergency, onFilter, onBack, pinFormOpen, isAdmin = false }) {
  const { cameras, cameraError } = useCameras();
  const { events, eventError } = useEvents();
  const { trafficNodes, detecCameras, trafficError, trafficUpdatedAt } = useTrafficFlow();
  const [showCameras, setShowCameras] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const { pins, connected, lastRealtimeAt } = usePins();
  const { selectedPin, setSelectedPin, filters } = useAppContext();
  const [pollingSeconds, setPollingSeconds] = useState(30);
  const cctvPins = useMemo(() => pins.filter(pin => (pin.type || pin.category) === 'cctv'), [pins]);
  const pinTraffic = useCameraTraffic(cctvPins, pollingSeconds);
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
  const [showLegend, setShowLegend] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [dispatchedResponders, setDispatchedResponders] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [nearbyCameraIds, setNearbyCameraIds] = useState([]);
  const markerRefs = useRef(new Map());
  const directTraffic = useCameraTraffic(cameras, pollingSeconds);
  const linkedCameras = useMemo(() => cameras.map(camera => {
    const linked = connectCctvToDetec(camera, detecCameras, trafficNodes);
    return directTraffic[camera.id] ? { ...linked, ai_traffic: directTraffic[camera.id] } : linked;
  }), [cameras, detecCameras, trafficNodes, directTraffic]);
  const now = new Date();
  const visibleEvents = useMemo(() => {
    const venueCounts = {};
      return events.map(event => {
        const loc = getVenueLocation(event.venueName) || { lat: event.lat, lng: event.lng };
        const locKey = `${loc.lat},${loc.lng}`;
        venueCounts[locKey] = (venueCounts[locKey] || 0) + 1;
        const count = venueCounts[locKey];
        
        // Deterministic offset based on count to prevent random jumping
        let offsetLat = 0;
        let offsetLng = 0;
        if (count > 1) {
          const radius = 0.0002 + (Math.floor(count / 8) * 0.00015);
          const angle = (count % 8) * (Math.PI / 4);
          offsetLat = Math.sin(angle) * radius;
          offsetLng = Math.cos(angle) * radius;
        }

        return { ...event, lat: loc.lat + offsetLat, lng: loc.lng + offsetLng };
      }).filter(event => {
      const status = getEventStatus(event, now);
      if (status === 'ended' && event.hideWhenEnded) return false;
      return !selectedDate || eventOccursOn(event, selectedDate);
    });
  }, [events, selectedDate, Math.floor(Date.now() / 60000)]);

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
  const linkedPins = useMemo(
    () => filteredPins.map(pin => {
      const type = pin.type || pin.category;
      return type === 'cctv' || type === 'traffic'
        ? { ...connectCctvToDetec(pin, detecCameras, trafficNodes), ...(pinTraffic[pin.id || pin._id] ? { ai_traffic: pinTraffic[pin.id || pin._id] } : {}) }
        : pin;
    }),
    [filteredPins, detecCameras, trafficNodes, pinTraffic]
  );
  const searchableCameras = useMemo(() => [
    ...linkedCameras,
    ...linkedPins.filter(pin => (pin.type || pin.category) === 'cctv').map(pin => ({ ...pin, id: pin.id || pin._id, name: pin.title, location:{ lat:Number(pin.lat), lng:Number(pin.lng) }, _communityPin:true }))
  ], [linkedCameras, linkedPins]);

  const defaultCenter = [13.9126, 100.5530];
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

  const registerMarker = (id, marker) => { if (marker) markerRefs.current.set(String(id), marker); else markerRefs.current.delete(String(id)); };
  const focusResult = result => {
    const item = result.item; const position = result.kind === 'camera' ? [item.location.lat, item.location.lng] : [item.lat, item.lng];
    mapInstance?.flyTo(position, 17, { duration: 0.8 });
    setTimeout(() => markerRefs.current.get(String(item.id))?.openPopup(), 850);
  };
  const showNearbyCameras = event => {
    const nearby = getCamerasNearVenue(event, searchableCameras, 300); setNearbyCameraIds(nearby.map(camera=>camera.id));
    if (!nearby.length) return;
    mapInstance?.fitBounds(L.latLngBounds(nearby.map(camera=>[camera.location.lat,camera.location.lng])), { padding:[60,60], maxZoom:18 });
  };

  return (
    <div style={{ width:'100%', height:'100%', position:'relative', overflow:'hidden', background:'#e8f0ea' }}>
      {selectedCamera && <div className="cctv-map-viewer"><LiveViewer camera={selectedCamera} onClose={() => setSelectedCamera(null)} /></div>}
      <MapExplorerControls cameras={searchableCameras} events={events} pins={linkedPins} onSelect={focusResult} selectedDate={selectedDate} onDate={date=>{setSelectedDate(date);setNearbyCameraIds([]);}} pollingSeconds={pollingSeconds} onPolling={setPollingSeconds} />

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
            cameras={showCameras ? linkedCameras : []}
            trafficNodes={trafficNodes}
            onCameraClick={setSelectedCamera}
            pins={linkedPins}
            userPosition={lat && lng ? [lat, lng] : defaultCenter}
            selectedPosition={selectedPosition}
            limitedBounds={limitedBounds}
            onMapSelect={handleMapSelect}
            onPinClick={setSelectedPin}
            onReady={setMapInstance}
            onUnavailable={() => setShow3D(false)}
          />
        ) : <MapContainer center={defaultCenter} zoom={15} minZoom={3} maxZoom={19}
          style={{width:'100%',height:'100%',zIndex:1}}
          zoomControl={false} attributionControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          <ZoomControl position="bottomleft" />
          <MapController onReady={setMapInstance} bounds={limitedBounds} />
          <MapClickHandler onSelect={handleMapSelect} />
          {flyTo && <FlyToUser position={flyTo} />}
          {showCameras && linkedCameras.map(camera => <CameraPin key={camera.id} camera={camera} onSelect={setSelectedCamera} highlighted={nearbyCameraIds.includes(camera.id)} registerMarker={registerMarker} />)}
          {visibleEvents.map(event => <EventPin key={event.id} event={event} now={now} highlighted={selectedDate ? eventOccursOn(event, selectedDate) : false} nearbyCount={getCamerasNearVenue(event, searchableCameras, 300).length} onNearby={showNearbyCameras} registerMarker={registerMarker} />)}
          
          {/* Building Polygons (Indoor Maps) */}
          {BUILDINGS.map(building => (
            <Polygon 
              key={building.id}
              positions={building.polygon}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 2, dashArray: '5, 5' }}
              eventHandlers={{
                click: () => setSelectedBuilding(building)
              }}
            >
              <Popup autoPan={false}>
                <div style={{ textAlign: 'center', padding: 4 }}>
                  <strong style={{ fontSize: 14 }}>🏢 {building.name}</strong><br/>
                  <span style={{ fontSize: 11, color: '#64748b' }}>คลิกที่พื้นที่อาคารเพื่อดูผังภายใน (Indoor Map)</span>
                </div>
              </Popup>
            </Polygon>
          ))}
          {/* 🚦 AI Traffic Nodes from Detec */}
          {trafficNodes.filter(hasTrafficCoordinates).map((node, index) => {
            const level = getAiTrafficLevel(node);
            const traffic = TRAFFIC_LEVELS[level];
            return <React.Fragment key={`ai-traffic-${trafficNodeId(node, index)}`}>
            <Circle center={[Number(node.lat), Number(node.lng)]} radius={120} interactive={false}
              pathOptions={{
                color: traffic.color, fillColor: traffic.color, fillOpacity: 0.2, weight: 3,
              }} />
            <Marker position={[Number(node.lat), Number(node.lng)]} icon={createTrafficIcon(node)} eventHandlers={{ click: (e) => e.target.openPopup() }}>
              <Popup>
                <div style={{textAlign: 'center', fontFamily: 'Kanit'}}>
                  <strong style={{fontSize:'14px'}}>{node.name || `Camera ${node.camera_id}`}</strong>
                  <div style={{margin: '8px 0', padding: '4px', borderRadius: '4px', background: traffic.background, color: traffic.text}}>
                    <strong>{traffic.emoji} {traffic.label} · Jam Index {Number(node.jam_index || 0)}%</strong>
                  </div>
                  <span>จำนวนรถ: {Number(node.current_vehicles || 0)} คัน</span><br/>
                  {(node.average_speed ?? node.avg_speed) != null && <><span>ความเร็วเฉลี่ย: {Number(node.average_speed ?? node.avg_speed).toFixed(1)} {node.speed_unit || 'px/window'}</span><br/></>}
                  <span style={{fontSize: '10px', color: '#666'}}>{node.active === false ? '⚪ กล้องไม่ได้ประมวลผล' : '🤖 AI วิเคราะห์แบบ Real-time'}</span><br/>
                  <span style={{fontSize: '9px', color: '#b45309', background: '#fffbeb', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block'}}>⚠️ ข้อมูล AI อาจคลาดเคลื่อน — ใช้อ้างอิงเท่านั้น</span>
                </div>
              </Popup>
            </Marker>
            </React.Fragment>;
          })}

          {(lat && lng) ? (
            <Marker position={[lat, lng]} icon={userIcon} />
          ) : (
            <Marker position={defaultCenter} icon={userIcon} />
          )}
          {linkedPins.map(pin => {
            const aiTraffic = pin.ai_traffic ? TRAFFIC_LEVELS[getAiTrafficLevel(pin.ai_traffic)] : null;
            const pinTraffic = aiTraffic || trafficColors[getTrafficLevel(pin)];
            return (
            <React.Fragment key={pin.id}>
              {(pin.type || pin.category) === 'traffic' && (
                <Circle center={[pin.lat, pin.lng]} radius={90}
                  pathOptions={{
                    color: pinTraffic.color,
                    fillColor: pinTraffic.color,
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
                    color: aiTraffic?.color || '#0284c7',
                    fillColor: aiTraffic?.color || '#38bdf8',
                    fillOpacity: nearbyCameraIds.includes(pin.id || pin._id) ? 0.34 : 0.18,
                    weight: nearbyCameraIds.includes(pin.id || pin._id) ? 5 : 2,
                    opacity: 0.9,
                  }} />
              )}
              <Marker ref={node => registerMarker(pin.id || pin._id, node)} position={[pin.lat, pin.lng]}
                icon={createPinIcon(pin.type || pin.category || 'other')}
                eventHandlers={{ click: () => {
                  if ((pin.type || pin.category) === 'cctv') {
                    setSelectedCamera({ id: pin.id || pin._id, location: { lat: pin.lat, lng: pin.lng }, status: 'online', name: pin.title, external_stream_url: pin.external_stream_url, ai_detection_url: pin.ai_detection_url, ai_traffic: pin.ai_traffic });
                  } else {
                    setSelectedPin(pin);
                  }
                } }}>
              {(pin.type || pin.category) !== 'cctv' && (
                <Popup maxWidth={260} minWidth={260} closeButton={true} className="custom-popup" autoPan={true} autoPanPaddingTopLeft={[50, 50]} autoPanPaddingBottomRight={[50, 280]}>
                  <PinInfoWindow pin={pin} onClose={() => setSelectedPin(null)} onSelectCamera={setSelectedCamera} isAdmin={isAdmin} />
                </Popup>
              )}
              </Marker>
            </React.Fragment>
            );
          })}
          {/* Admin/Responder Markers — real-time */}
          {dispatchedResponders.filter(r => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng))).map(responder => (
            <Marker key={`resp-${responder.id || responder._id}`}
              position={[Number(responder.lat), Number(responder.lng)]}
              icon={adminResponderIcon}
              eventHandlers={{ click: (e) => e.target.openPopup() }}>
              <Popup maxWidth={240} minWidth={200} closeButton={true} className="custom-popup">
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
          {isAdmin && (
            <button aria-pressed={showCameras} title={cameraError || 'แสดงกล้อง CCTV'} onClick={() => { setShowCameras(value => !value); setSelectedCamera(null); }} style={{ border:'none',borderRadius:11,padding:'6px 10px',fontSize:11,fontWeight:800,background:showCameras ? '#fce7f3' : '#f1f5f9',color:'#9d174d',display:'flex',alignItems:'center',gap:5,cursor:'pointer' }}>
              <img src="/images/cctv.png" alt="" aria-hidden="true" style={{width:20,height:24,objectFit:'contain'}} />
              CCTV {cameraError ? '· ไม่พร้อมใช้งาน' : cameras.length}
            </button>
          )}
          <div style={{background:'#dcfce7',borderRadius:11,padding:'8px 11px',fontSize:11,fontWeight:800,color:'#15803d',display:'flex',alignItems:'center',gap:6}}>
            <img src="/images/mascot.png" alt="" style={{width:14,height:14,objectFit:'contain'}} />
            {linkedPins.length} หมุด
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
          <button className="map-dimension-button" onClick={() => setShow3D(value => !value)}
            aria-label={show3D ? 'ใช้แผนที่ 2 มิติ' : 'ใช้แผนที่ 3 มิติ'}
            title={show3D ? 'เปลี่ยนเป็นแผนที่ 2 มิติ' : 'เปิดแผนที่ 3 มิติ'}
            style={{background:show3D ? '#dcfce7' : '#e0e7ff',borderRadius:11,padding:'8px 11px',fontSize:11,fontWeight:800,color:show3D ? '#166534' : '#3730a3',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
            {show3D ? '3D' : '2D'}
          </button>
        </div>

        <div className={`traffic-legend ${showLegend ? 'is-open' : ''}`} style={{position:'absolute',top:isMobile ? 74 : 12,right:isMobile ? 'auto' : 12,left:isMobile ? 12 : 'auto',zIndex:800,background:'rgba(255,255,255,0.92)',borderRadius:12,padding:showLegend?'8px 10px':'4px',boxShadow:'0 2px 10px rgba(0,0,0,0.1)',backdropFilter:'blur(8px)',fontSize:10,fontWeight:700,color:'#374151',maxWidth:isMobile ? 'calc(100vw - 24px)' : 'none'}}>
          <button aria-label="คำอธิบายสัญลักษณ์" aria-expanded={showLegend} onClick={()=>setShowLegend(v=>!v)} style={{width:44,height:44,border:0,borderRadius:10,background:'#f1f5f9',fontSize:18,fontWeight:900,cursor:'pointer'}}>?</button>
          {showLegend&&<div style={{display:'flex',gap:8,alignItems:'center',whiteSpace:'nowrap',padding:'6px 4px 2px',overflowX:'auto'}}>
            {Object.entries(TRAFFIC_LEVELS).map(([level, item]) => (
              <span key={level} style={{display:'flex',alignItems:'center',gap:3}}>
                <i style={{width:9,height:9,borderRadius:'50%',background:item.color,display:'inline-block'}} />
                {item.label}
              </span>
            ))}
            <span>🎪 จุดจัดงาน</span>
          </div>}
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
        {linkedPins.length === 0 && linkedCameras.length === 0 && visibleEvents.length === 0 && !showWelcome && (
          <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:800,textAlign:'center',pointerEvents:'none'}}>
            <div style={{background:'rgba(255,255,255,0.90)',borderRadius:24,padding:24,boxShadow:'0 4px 20px rgba(0,0,0,0.08)',maxWidth:220,backdropFilter:'blur(10px)'}}>
              <img src="/images/mascot_ruthan.png" alt="" style={{width:56,height:56,objectFit:'contain',margin:'0 auto 8px',display:'block'}} className="animate-float" />
              <p style={{fontSize:13,fontWeight:700,color:'#374151',margin:'0 0 4px'}}>ยังไม่มีหมุดในพื้นที่นี้</p>
              <p style={{fontSize:10,color:'#9ca3af',margin:0}}>ลองเลื่อนแผนที่ หรือปักหมุดเลย! 🎉</p>
            </div>
          </div>
        )}
      </div>

      {trafficError && (
        <div role="status" style={{position:'absolute',left:12,bottom:74,zIndex:880,background:'rgba(127,29,29,.92)',color:'#fff',padding:'7px 11px',borderRadius:10,fontSize:11,fontWeight:700}}>
          {trafficError}{trafficUpdatedAt ? ` · แสดงข้อมูลล่าสุด ${trafficUpdatedAt.toLocaleTimeString('th-TH')}` : ''}
        </div>
      )}

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
          {/* CCTV — เฉพาะแอดมิน */}
          {isAdmin && (
            <button className="map-action-button" data-tooltip="CCTV: เลือกพื้นที่" onClick={() => startAreaSelection('pin', 'cctv')} aria-label="เลือกพื้นที่ปักหมุดกล้อง CCTV" title="เลือกพื้นที่ปักหมุดกล้อง CCTV"
              style={{display:'flex',flexDirection:'column',gap:0,alignItems:'center',justifyContent:'center',width:'clamp(52px, 6vw, 64px)',height:'clamp(52px, 6vw, 64px)',borderRadius:18,border:'2px solid #ec4899',cursor:'pointer',background:'#fce7f3',color:'#be185d',boxShadow:'0 3px 9px rgba(236,72,153,0.2)',transition:'all 0.2s'}}
              onMouseEnter={(e) => {e.currentTarget.style.transform='scale(1.08)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(236,72,153,0.35)'}}
              onMouseLeave={(e) => {e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 3px 9px rgba(236,72,153,0.2)'}}>
              <img src="/images/cctv.png" alt="CCTV" style={{width:'clamp(32px, 4vw, 42px)',height:'clamp(34px, 4.3vw, 44px)',objectFit:'contain'}} />
              <span className="map-action-label" style={{color:'#be185d',textShadow:'none'}}>CCTV</span>
            </button>
          )}
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
      
      <BuildingModal building={selectedBuilding} onClose={() => setSelectedBuilding(null)} />
    </div>
  );
}
