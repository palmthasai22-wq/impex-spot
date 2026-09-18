import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { EVENT_TYPES, formatEventRange, getEventStatus } from '../utils/events';

export default function EventPin({ event, now, highlighted, nearbyCount, onNearby, registerMarker }) {
  const status = getEventStatus(event, now); const type = EVENT_TYPES[event.eventType] || EVENT_TYPES.exhibition_public;
  const badge = status === 'live' ? 'LIVE' : status === 'soon' ? 'เร็วๆ นี้' : '';
  const icon = L.divIcon({ className:'event-marker-wrap', iconSize:[54,66], iconAnchor:[27,62], popupAnchor:[0,-58], html:`<div class="event-marker ${status} ${highlighted?'highlighted':''}" style="--event-color:${type.color}"><span>${type.emoji}</span>${badge?`<b>${badge}</b>`:''}</div>` });
  return <Marker ref={node=>registerMarker?.(event.id,node)} position={[event.lat,event.lng]} icon={icon} opacity={status==='ended'?0.45:1}>
    <Popup minWidth={270} className="event-popup"><div className="event-popup-card">
      <div className={`event-status ${status}`}>{status==='live'?'🔴 LIVE กำลังจัดอยู่':status==='soon'?'🟡 เริ่มภายใน 24 ชม.':status==='ended'?'จบงานแล้ว':'งานที่กำลังจะมาถึง'}</div>
      <h3>{event.eventName}</h3><p>{type.emoji} {type.label}</p><p>🗓️ {formatEventRange(event)}</p><p>📍 {event.venueName}</p>{event.organizer&&<p>ผู้จัด: {event.organizer}</p>}
      <button onClick={()=>onNearby(event)}>📹 ดูกล้องใกล้จุดนี้ ({nearbyCount})</button>
      {event.sourceUrl&&<a href={event.sourceUrl} target="_blank" rel="noreferrer">ดูแหล่งข้อมูลทางการ ↗</a>}
    </div></Popup>
  </Marker>;
}
