const express = require('express');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const pinStore = require('../services/pinStore');
const responderStore = require('../services/responderStore');

const router = express.Router();

router.post('/login', (req, res) => {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || '123456';
  if (req.body.username !== username || req.body.password !== password) {
    return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }
  const token = jwt.sign({ username, role: 'admin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '12h' });
  res.json({ token, user: { username, role: 'admin' } });
});

router.use(auth);
router.get('/pins', (req, res) => res.json(pinStore.list({ includeInactive: true })));

router.delete('/pins/:id', (req, res) => {
  if (!pinStore.get(req.params.id)) return res.status(404).json({ error: 'Pin not found' });
  pinStore.remove(req.params.id);
  res.json({ success: true });
});

router.put('/pins/:id', (req, res) => {
  const pin = pinStore.update(req.params.id, {
    title: req.body.title,
    type: req.body.type,
    category: req.body.type,
    customType: req.body.customType,
    description: req.body.description,
  });
  if (!pin) return res.status(404).json({ error: 'Pin not found' });
  res.json(pin);
});

router.put('/pins/:id/status', (req, res) => {
  const allowed = ['active', 'rejected', 'deleted', 'expired'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
  const pin = pinStore.update(req.params.id, { status: req.body.status });
  if (!pin) return res.status(404).json({ error: 'Pin not found' });
  res.json(pin);
});

router.put('/emergencies/:id/dispatch', (req, res) => {
  const allowed = ['pending', 'coordinating', 'dispatched', 'acknowledged', 'on_scene', 'resolved'];
  if (!allowed.includes(req.body.dispatchStatus)) return res.status(400).json({ error: 'Invalid dispatch status' });
  const pin = pinStore.update(req.params.id, {
    dispatchStatus: req.body.dispatchStatus,
    assignedResponderId: req.body.responderId || undefined,
  });
  if (!pin) return res.status(404).json({ error: 'Pin not found' });
  res.json(pin);
});

router.put('/traffic/:id', (req, res) => {
  const allowed = ['monitoring', 'responding', 'cleared'];
  if (!allowed.includes(req.body.trafficStatus)) return res.status(400).json({ error: 'Invalid traffic status' });
  const pin = pinStore.update(req.params.id, { trafficStatus: req.body.trafficStatus, trafficNote: req.body.trafficNote || '' });
  if (!pin) return res.status(404).json({ error: 'Pin not found' });
  res.json(pin);
});

router.get('/responders', (req, res) => res.json(responderStore.list()));
router.post('/responders', (req, res) => {
  if (!req.body.name || !req.body.team || !req.body.phone) return res.status(400).json({ error: 'name, team and phone are required' });
  res.status(201).json(responderStore.create(req.body));
});
router.put('/responders/:id', (req, res) => {
  if (!['available', 'busy', 'offline'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid responder status' });
  const responder = responderStore.update(req.params.id, { status: req.body.status });
  if (!responder) return res.status(404).json({ error: 'Responder not found' });
  res.json(responder);
});
router.delete('/responders/:id', (req, res) => {
  if (!responderStore.remove(req.params.id)) return res.status(404).json({ error: 'Responder not found' });
  res.json({ success: true });
});

module.exports = router;
