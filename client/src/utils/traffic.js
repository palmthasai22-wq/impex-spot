export const TRAFFIC_LEVELS = {
  green: { color: '#22c55e', background: '#dcfce7', text: '#166534', emoji: '🟢', label: 'คล่องตัว' },
  yellow: { color: '#eab308', background: '#fef9c3', text: '#854d0e', emoji: '🟡', label: 'ชะลอตัว' },
  red: { color: '#ef4444', background: '#fee2e2', text: '#991b1b', emoji: '🔴', label: 'ติดขัด' },
  blue: { color: '#3b82f6', background: '#dbeafe', text: '#1e40af', emoji: '🔵', label: 'รอสัญญาณไฟ' },
  gray: { color: '#64748b', background: '#f1f5f9', text: '#334155', emoji: '⚪', label: 'ไม่ทราบสถานะ' },
};

const aliases = {
  low: 'green', light: 'green', free: 'green', flowing: 'green', clear: 'green',
  medium: 'yellow', moderate: 'yellow', slow: 'yellow',
  high: 'red', heavy: 'red', congested: 'red', jammed: 'red',
  waiting: 'blue', stopped: 'blue', signal: 'blue', traffic_light: 'blue', signal_wait: 'blue', red_light: 'blue',
  flow: 'green', slow: 'yellow', jam: 'red', unknown: 'gray', unavailable: 'gray', offline: 'gray',
};

export function getTrafficLevel(node = {}) {
  const raw = String(node.density_level ?? node.traffic_level ?? node.status ?? 'green').toLowerCase().trim();
  return TRAFFIC_LEVELS[raw] ? raw : aliases[raw] || 'gray';
}

export function hasTrafficCoordinates(node = {}) {
  return Number.isFinite(Number(node.lat)) && Number.isFinite(Number(node.lng));
}

export function trafficNodeId(node = {}, index = 0) {
  return node.camera_id ?? node.id ?? `${node.lat}-${node.lng}-${index}`;
}

function distanceMeters(a, b) {
  const lat1 = Number(a?.location?.lat ?? a?.lat);
  const lng1 = Number(a?.location?.lng ?? a?.lng);
  const lat2 = Number(b?.lat);
  const lng2 = Number(b?.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Infinity;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function connectCctvToDetec(camera, detecCameras = [], trafficNodes = []) {
  const explicitId = Number(camera.detec_camera_id);
  let detecCamera = Number.isInteger(explicitId) && explicitId > 0
    ? detecCameras.find(item => Number(item.id) === explicitId)
    : null;

  if (!detecCamera) {
    detecCamera = detecCameras
      .map(item => ({ item, distance: distanceMeters(camera, item) }))
      .filter(match => match.distance <= 150)
      .sort((a, b) => a.distance - b.distance)[0]?.item || null;
  }

  const detecId = detecCamera?.id ?? (Number.isInteger(explicitId) && explicitId > 0 ? explicitId : null);
  const aiTraffic = detecId == null ? null : trafficNodes.find(item => Number(item.camera_id) === Number(detecId)) || null;
  return { ...camera, detec_camera: detecCamera, ai_traffic: aiTraffic, detec_camera_id: detecId };
}
