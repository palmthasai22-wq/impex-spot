const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dataPath = path.join(__dirname, '../data/responders.json');
let responders = [];
try { responders = JSON.parse(fs.readFileSync(dataPath, 'utf8')) || []; } catch (error) { responders = []; }
const persist = () => fs.writeFileSync(dataPath, JSON.stringify(responders, null, 2));

module.exports = {
  list() { return [...responders]; },
  create(data) {
    const responder = { id: uuidv4(), name: data.name, team: data.team, phone: data.phone, status: 'available', createdAt: new Date().toISOString() };
    responders.push(responder); persist(); return responder;
  },
  update(id, data) {
    const index = responders.findIndex(item => item.id === id);
    if (index < 0) return null;
    responders[index] = { ...responders[index], ...data, id };
    persist(); return responders[index];
  },
  remove(id) {
    const before = responders.length;
    responders = responders.filter(item => item.id !== id);
    if (responders.length === before) return false;
    persist(); return true;
  },
};
