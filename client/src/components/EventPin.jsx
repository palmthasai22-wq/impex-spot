import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { EVENT_TYPES, formatEventRange, getEventStatus } from '../utils/events';

/**
 * สร้าง Google Calendar URL สำหรับเพิ่ม event เข้า Google Calendar
 * ใช้ URL scheme — ไม่ต้อง OAuth / API Key
 */
function buildGoogleCalendarUrl(event) {
  // Google Calendar ต้องการรูปแบบ: YYYYMMDDTHHmmSS
  const formatGCalDate = (date, time, fallbackTime) => {
    const t = (time || fallbackTime).replace(':', '');
    return `${date.replace(/-/g, '')}T${t}00`;
  };

  const startDt = formatGCalDate(event.startDate, event.startTime, '0000');
  const endDt = formatGCalDate(event.endDate, event.endTime, '2359');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.eventName || 'Event',
    dates: `${startDt}/${endDt}`,
    ctz: 'Asia/Bangkok',
    location: event.venueName || 'IMPACT Muang Thong Thani',
    details: [
      event.organizer ? `ผู้จัด: ${event.organizer}` : '',
      event.sourceUrl ? `ข้อมูลเพิ่มเติม: ${event.sourceUrl}` : '',
      'จาก ImpEx Spot — แผนที่สถานการณ์ชุมชน',
    ].filter(Boolean).join('\n'),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function EventPin({ event, now, highlighted, nearbyCount, onNearby, registerMarker, onNavigate }) {
  const status = getEventStatus(event, now);
  const type = EVENT_TYPES[event.eventType] || EVENT_TYPES.exhibition_public;
  const badge = status === 'live' ? 'LIVE' : status === 'soon' ? 'เร็วๆ นี้' : '';
  const icon = L.divIcon({
    className: 'event-marker-wrap',
    iconSize: [54, 66],
    iconAnchor: [27, 62],
    popupAnchor: [0, -58],
    html: `<div class="event-marker ${status} ${highlighted ? 'highlighted' : ''}" style="--event-color:${type.color}"><span>${type.emoji}</span>${badge ? `<b>${badge}</b>` : ''}</div>`,
  });

  const handleSaveToCalendar = () => {
    window.open(buildGoogleCalendarUrl(event), '_blank', 'noopener');
  };

  return (
    <Marker
      ref={node => registerMarker?.(event.id, node)}
      position={[event.lat, event.lng]}
      icon={icon}
      opacity={status === 'ended' ? 0.45 : 1}
      eventHandlers={{
        click: (e) => {
          e.target.openPopup();
        }
      }}
    >
      <Popup minWidth={270} maxWidth={320} className="event-popup" closeButton={true}>
        <div className="event-popup-card">
          <div className={`event-status ${status}`}>
            {status === 'live' ? '🔴 LIVE กำลังจัดอยู่'
              : status === 'soon' ? '🟡 เริ่มภายใน 24 ชม.'
              : status === 'ended' ? 'จบงานแล้ว'
              : 'งานที่กำลังจะมาถึง'}
          </div>

          {event.posterUrl && (
            <img src={event.posterUrl} alt={event.eventName} className="event-poster" />
          )}

          <h3>{event.eventName}</h3>
          <p>{type.emoji} {type.label}</p>
          <p>🗓️ {formatEventRange(event)}</p>
          <p>📍 {event.venueName}</p>
          {event.organizer && <p>ผู้จัด: {event.organizer}</p>}

          {/* ปุ่ม Save to Google Calendar */}
          <button
            className="save-calendar-btn"
            onClick={handleSaveToCalendar}
          >
            📅 Save to Calendar
          </button>

          <button onClick={() => {
            if (onNavigate) {
              onNavigate(event.lat, event.lng);
            } else {
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`, '_blank');
            }
          }}>
            🗺️ นำทางไปที่จัดงาน
          </button>

          {event.sourceUrl && (
            <a href={event.sourceUrl} target="_blank" rel="noreferrer">
              ดูแหล่งข้อมูลทางการ ↗
            </a>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
