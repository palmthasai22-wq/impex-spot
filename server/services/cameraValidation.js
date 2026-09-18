const { isIP } = require('node:net');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function invalid() { const error = new Error('Invalid camera input'); error.status = 400; throw error; }
const allowed = new Set(['name', 'camera_category', 'ai_detection_url', 'lat', 'lng', 'coverage_direction', 'owner_type', 'connection_type', 'camera_ip', 'rtsp_path', 'credentials', 'verification_status', 'owner_consent', 'external_stream_url', 'detec_camera_id']);

function validateCamera(body, creating = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !allowed.has(k))) invalid();
  // ถ้ามี external_stream_url ให้ camera_ip ไม่บังคับตอนสร้าง
  const hasExternalUrl = body.external_stream_url && body.external_stream_url.trim() !== '';
  const requiredForCreate = hasExternalUrl
    ? ['lat', 'lng', 'owner_type', 'connection_type', 'rtsp_path']
    : ['lat', 'lng', 'owner_type', 'connection_type', 'camera_ip', 'rtsp_path'];
  if (creating && requiredForCreate.some(k => !(k in body))) invalid();
  if (('lat' in body) !== ('lng' in body)) invalid();
  for (const [key, min, max] of [['lat', -90, 90], ['lng', -180, 180], ['coverage_direction', 0, 359]]) {
    if (key in body && (typeof body[key] !== 'number' || !Number.isFinite(body[key]) || body[key] < min || body[key] > max)) invalid();
  }
  if ('coverage_direction' in body && !Number.isInteger(body.coverage_direction)) invalid();
  for (const [key, values] of Object.entries({ owner_type: ['government', 'business', 'household', 'agency'], connection_type: ['lan_ip', 'wifi_local', 'onvif'], verification_status: ['pending', 'verified', 'rejected'] })) {
    if (key in body && !values.includes(body[key])) invalid();
  }
  if ('owner_consent' in body && typeof body.owner_consent !== 'boolean') invalid();
  if ('name' in body && (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 160)) invalid();
  if ('camera_category' in body && (typeof body.camera_category !== 'string' || body.camera_category.length > 80)) invalid();
  if ('ai_detection_url' in body && body.ai_detection_url !== '' && body.ai_detection_url !== null) {
    if (typeof body.ai_detection_url !== 'string' || body.ai_detection_url.length > 2048 || !/^(https?:\/\/|mock:)/i.test(body.ai_detection_url)) invalid();
  }
  // ตรวจสอบ external_stream_url
  if ('external_stream_url' in body) {
    if (body.external_stream_url !== '' && body.external_stream_url !== null) {
      if (typeof body.external_stream_url !== 'string' || body.external_stream_url.length > 4096) invalid();
      // ไม่ใช้ new URL() เพื่อให้รับ <iframe> embed code หรือลิงก์ที่ไม่มี http ได้
    }
  }
  if ('detec_camera_id' in body && body.detec_camera_id !== null && body.detec_camera_id !== '') {
    const detecId = Number(body.detec_camera_id);
    if (!Number.isInteger(detecId) || detecId < 1) invalid();
    body.detec_camera_id = detecId;
  }
  // A pending Wi-Fi record may start without an IP. The paired relay discovers it
  // on the local network; every usable camera record still requires a bare IP.
  const isPendingWifiDiscovery = body.connection_type === 'wifi_local'
    && body.camera_ip === ''
    && (body.verification_status === undefined || body.verification_status === 'pending')
    && body.owner_consent !== true;
  if ('camera_ip' in body && (typeof body.camera_ip !== 'string' || (!isIP(body.camera_ip) && !isPendingWifiDiscovery && !hasExternalUrl))) invalid();
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
