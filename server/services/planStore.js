const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dataPath = path.join(__dirname, '../data/plans.json');
let plans = [];

try {
  plans = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  if (!Array.isArray(plans)) plans = [];
} catch (error) {
  plans = [];
}

const persist = () => {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(plans, null, 2));
};

module.exports = {
  getAll() {
    return plans;
  },

  getByPinId(pinId) {
    return plans
      .filter(p => p.linkedPinId === pinId)
      .sort((a, b) => (Number(a.floorOrder) || 999) - (Number(b.floorOrder) || 999) || String(a.createdAt).localeCompare(String(b.createdAt)));
  },

  get(id) {
    return plans.find(p => p.id === id) || null;
  },

  create(data) {
    const plan = {
      id: uuidv4(),
      linkedPinId: data.linkedPinId,
      locationName: data.locationName || '',
      floorName: data.floorName || 'ชั้น 1',
      floorLevel: data.floorLevel == null ? '' : String(data.floorLevel),
      floorOrder: Number(data.floorOrder) || 1,
      zoneName: data.zoneName || '',
      description: data.description || '',
      planImageUrl: data.planImageUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    plans.push(plan);
    persist();
    return plan;
  },

  update(id, data) {
    const idx = plans.findIndex(p => p.id === id);
    if (idx === -1) return null;
    plans[idx] = {
      ...plans[idx],
      ...data,
      id: plans[idx].id, // preserve id
      linkedPinId: plans[idx].linkedPinId, // preserve FK
      updatedAt: new Date().toISOString(),
    };
    persist();
    return plans[idx];
  },

  remove(id) {
    const idx = plans.findIndex(p => p.id === id);
    if (idx === -1) return false;
    plans.splice(idx, 1);
    persist();
    return true;
  },
};
