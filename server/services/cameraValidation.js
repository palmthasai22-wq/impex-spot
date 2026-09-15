const { isIP } = require('node:net');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function invalid() { const error = new Error('Invalid camera input'); error.status = 400; throw error; }
const allowed = new Set(['lat', 'lng', 'coverage_direction', 'owner_type', 'connection_type', 'camera_ip', 'rtsp_path', 'credentials', 'verification_status', 'owner_consent']);

function validateCamera(body, creating = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !allowed.has(k))) invalid();
  if (creating && ['lat', 'lng', 'owner_type', 'connection_type', 'camera_ip', 'rtsp_path'].some(k => !(k in body))) invalid();
  if (('lat' in body) !== ('lng' in body)) invalid();
  for (const [key, min, max] of [['lat', -90, 90], ['lng', -180, 180], ['coverage_direction', 0, 359]]) {
    if (key in body && (typeof body[key] !== 'number' || !Number.isFinite(body[key]) || body[key] < min || body[key] > max)) invalid();
  }
  if ('coverage_direction' in body && !Number.isInteger(body.coverage_direction)) invalid();
  for (const [key, values] of Object.entries({ owner_type: ['government', 'business', 'household', 'agency'], connection_type: ['lan_ip', 'wifi_local', 'onvif'], verification_status: ['pending', 'verified', 'rejected'] })) {
    if (key in body && !values.includes(body[key])) invalid();
  }
  if ('owner_consent' in body && typeof body.owner_consent !== 'boolean') invalid();
  // Bare IP only: the relay constructs the URL, never the public API or media server.
  if ('camera_ip' in body && (typeof body.camera_ip !== 'string' || !isIP(body.camera_ip))) invalid();
  if ('rtsp_path' in body && (typeof body.rtsp_path !== 'string' || !body.rtsp_path.startsWith('/') || body.rtsp_path.startsWith('//') || body.rtsp_path.length > 1024 || /[\s#\\]/.test(body.rtsp_path))) invalid();
  if ('credentials' in body) {
    const c = body.credentials;
    if (!c || typeof c !== 'object' || Array.isArray(c) || Object.keys(c).some(k => !['username', 'password', 'port'].includes(k))) invalid();
    if (typeof c.username !== 'string' || typeof c.password !== 'string' || c.username.length > 256 || c.password.length > 1024) invalid();
    if (c.port !== undefined && (!Number.isInteger(c.port) || c.port < 1 || c.port > 65535)) invalid();
  }
  return body;
}
module.exports = { UUID, invalid, validateCamera };
