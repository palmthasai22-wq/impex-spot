const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dataPath = path.join(__dirname, '../data/planShopPins.json');
let shopPins = [];

try {
  shopPins = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  if (!Array.isArray(shopPins)) shopPins = [];
} catch (error) {
  shopPins = [];
}

const persist = () => {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(shopPins, null, 2));
};

module.exports = {
  getByPlanId(planId) {
    return shopPins.filter(sp => sp.planId === planId);
  },

  get(id) {
    return shopPins.find(sp => sp.id === id) || null;
  },

  create(data) {
    const pin = {
      id: uuidv4(),
      planId: data.planId,
      xPercent: Number(data.xPercent),
      yPercent: Number(data.yPercent),
      name: data.name || '',
      description: data.description || '',
      imageUrl: data.imageUrl || '',
      createdBy: data.createdBy || 'anonymous',
      createdAt: new Date().toISOString(),
    };
    shopPins.push(pin);
    persist();
    return pin;
  },

  remove(id) {
    const idx = shopPins.findIndex(sp => sp.id === id);
    if (idx === -1) return false;
    shopPins.splice(idx, 1);
    persist();
    return true;
  },

  removeByPlanId(planId) {
    const before = shopPins.length;
    shopPins = shopPins.filter(sp => sp.planId !== planId);
    if (shopPins.length !== before) persist();
    return before - shopPins.length;
  },
};
