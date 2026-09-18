export const EVENT_TYPES = {
  concert: { label: 'คอนเสิร์ต', emoji: '🎵', color: '#7c3aed' },
  exhibition_public: { label: 'นิทรรศการทั่วไป', emoji: '🎪', color: '#db2777' },
  exhibition_trade: { label: 'งานแสดงสินค้า', emoji: '🏢', color: '#0369a1' },
  meeting_seminar: { label: 'ประชุม/สัมมนา', emoji: '🗣️', color: '#0f766e' },
};

// พิกัดศูนย์กลางของอาคาร/ฮอลล์จริง ใช้ร่วมกันทั้งฟอร์มแอดมินและหมุดบนแผนที่
export const VENUE_LOCATIONS = {
  'Challenger Hall 1': { lat: 13.9119432, lng: 100.5461693 },
  'Challenger Hall 2': { lat: 13.9130753, lng: 100.5465568 },
  'Challenger Hall 3': { lat: 13.9141292, lng: 100.5469934 },
  'Challenger Hall 2-3': { lat: 13.91360225, lng: 100.5467751 },
  'IMPACT Arena': { lat: 13.911465, lng: 100.5483697 },
  'Exhibition Center Hall 5': { lat: 13.9122509, lng: 100.54815 },
  'Exhibition Center Hall 6': { lat: 13.9128676, lng: 100.54849 },
  'Exhibition Center Hall 5-6': { lat: 13.91255925, lng: 100.54832 },
  'Exhibition Center Hall 7': { lat: 13.9134843, lng: 100.54883 },
  'Exhibition Center Hall 8': { lat: 13.914101, lng: 100.54916 },
  'IMPACT Forum Hall 4': { lat: 13.9161526, lng: 100.5471676 },
};

export function getVenueLocation(venueName) {
  const normalized = String(venueName || '').trim().toLowerCase();
  const entry = Object.entries(VENUE_LOCATIONS).find(([name]) => name.toLowerCase() === normalized);
  return entry?.[1] || null;
}

const eventDate = (date, time, fallback) => new Date(`${date}T${time || fallback}:00+07:00`);

export function getEventStatus(event, now = new Date()) {
  const start = eventDate(event.startDate, event.startTime, '00:00');
  const end = eventDate(event.endDate, event.endTime, '23:59');
  if (now > end) return 'ended';
  if (now >= start) return 'live';
  if (start.getTime() - now.getTime() <= 24 * 60 * 60 * 1000) return 'soon';
  return 'upcoming';
}

export function eventOccursOn(event, isoDate) {
  return Boolean(isoDate && event.startDate <= isoDate && event.endDate >= isoDate);
}

export function distanceMeters(a, b) {
  const lat1 = Number(a?.location?.lat ?? a?.lat); const lng1 = Number(a?.location?.lng ?? a?.lng);
  const lat2 = Number(b?.location?.lat ?? b?.lat); const lng2 = Number(b?.location?.lng ?? b?.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Infinity;
  const rad = Math.PI / 180; const dLat = (lat2 - lat1) * rad; const dLng = (lng2 - lng1) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function getCamerasNearVenue(event, cameras, radiusMeters = 300) {
  return cameras.filter(camera => distanceMeters(event, camera) <= radiusMeters);
}

export function formatEventRange(event) {
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  const start = new Date(`${event.startDate}T00:00:00+07:00`).toLocaleDateString('th-TH', options);
  const end = new Date(`${event.endDate}T00:00:00+07:00`).toLocaleDateString('th-TH', options);
  return `${start}${event.startDate === event.endDate ? '' : ` – ${end}`} · ${event.startTime || '00:00'}–${event.endTime || '23:59'} น.`;
}
