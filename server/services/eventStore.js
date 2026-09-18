const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const file = path.join(__dirname, '../data/events.json');
const TYPES = new Set(['concert', 'exhibition_public', 'exhibition_trade', 'meeting_seminar']);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function read() {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

function write(events) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(events, null, 2), 'utf8');
}

function validate(body) {
  const text = key => typeof body[key] === 'string' ? body[key].trim() : '';
  const event = {
    eventName: text('eventName'), eventType: text('eventType'),
    startDate: text('startDate'), endDate: text('endDate'),
    startTime: text('startTime') || '00:00', endTime: text('endTime') || '23:59',
    venueName: text('venueName'), lat: Number(body.lat), lng: Number(body.lng),
    organizer: text('organizer'), sourceUrl: text('sourceUrl'), posterUrl: text('posterUrl'), hideWhenEnded: body.hideWhenEnded === true,
  };
  if (!event.eventName || event.eventName.length > 180 || !TYPES.has(event.eventType)) throw new Error('Invalid event');
  if (!DATE.test(event.startDate) || !DATE.test(event.endDate) || event.endDate < event.startDate) throw new Error('Invalid event date');
  if (!TIME.test(event.startTime) || !TIME.test(event.endTime) || !event.venueName) throw new Error('Invalid event time or venue');
  if (!Number.isFinite(event.lat) || event.lat < -90 || event.lat > 90 || !Number.isFinite(event.lng) || event.lng < -180 || event.lng > 180) throw new Error('Invalid event location');
  if (event.sourceUrl && !/^https?:\/\//i.test(event.sourceUrl)) throw new Error('Invalid source URL');
  if (event.posterUrl && !/^(https?:\/\/|\/)/i.test(event.posterUrl)) throw new Error('Invalid poster URL');
  return event;
}

module.exports = {
  list: () => read(),
  create(body) { const events = read(); const event = { id: randomUUID(), ...validate(body) }; events.push(event); write(events); return event; },
  update(id, body) { const events = read(); const index = events.findIndex(event => event.id === id); if (index < 0) return null; events[index] = { id, ...validate(body) }; write(events); return events[index]; },
  remove(id) { const events = read(); const event = events.find(item => item.id === id); if (!event) return null; write(events.filter(item => item.id !== id)); return event; },
};
