const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dataPath = path.join(__dirname, '../data/pins.json');
let pins = [];
let socketService = null;

try {
  pins = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  if (!Array.isArray(pins)) pins = [];
} catch (error) {
  pins = [];
}

const persist = () => {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(pins, null, 2));
};

const emit = (event, payload) => socketService?.emit(event, payload);

const normalize = (pin) => {
  const normalized = {
    verifications: [],
    reviews: [],
    averageRating: 0,
    reportCount: 0,
    confidence: 40,
    status: 'active',
    ...pin,
    id: pin.id || uuidv4(),
  };
  if (!pin.is_indoor) {
    normalized.lat = Number(pin.lat);
    normalized.lng = Number(pin.lng);
  } else {
    normalized.indoor_x = Number(pin.indoor_x);
    normalized.indoor_y = Number(pin.indoor_y);
  }
  return normalized;
};

const pinStore = {
  setSocketService(service) { socketService = service; },
  list({ includeInactive = false, query = {} } = {}) {
    let result = includeInactive ? [...pins] : pins.filter(pin => pin.status === 'active');
    if (query.type) result = result.filter(pin => (pin.type || pin.category) === query.type);
    if (query.verified === 'true') result = result.filter(pin => Number(pin.confidence || 0) >= 60);
    if (query.south !== undefined) {
      const south = Number(query.south); const north = Number(query.north);
      const west = Number(query.west); const east = Number(query.east);
      result = result.filter(pin => pin.lat >= south && pin.lat <= north && pin.lng >= west && pin.lng <= east);
    }
    return result;
  },
  get(id) { return pins.find(pin => pin.id === id); },
  create(input) {
    const pin = normalize(input);
    pins.push(pin);
    persist();
    emit('pin:new', pin);
    return pin;
  },
  update(id, changes) {
    const index = pins.findIndex(pin => pin.id === id);
    if (index === -1) return null;
    pins[index] = normalize({ ...pins[index], ...changes, id });
    persist();
    emit('pin:update', pins[index]);
    return pins[index];
  },
  remove(id) {
    const pin = this.get(id);
    if (!pin) return null;
    pins = pins.map(item => item.id === id ? { ...item, status: 'deleted' } : item);
    persist();
    emit('pin:deleted', { id });
    return pins.find(item => item.id === id);
  },
  expire(id) {
    const pin = this.update(id, { status: 'expired' });
    if (pin) emit('pin:expired', { id });
    return pin;
  },
  persist,
};

module.exports = pinStore;
