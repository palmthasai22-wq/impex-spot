const express = require('express');
const jwt = require('jsonwebtoken');
const responderStore = require('../services/responderStore');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// ─── GET /active ─── ผู้ใช้ทั่วไปดู responder ที่ถูก dispatch แล้ว (public, no auth)
router.get('/active', (req, res) => {
  const all = responderStore.list();
  const active = all
    .filter(r => ['dispatched', 'on_scene', 'coordinating', 'acknowledged'].includes(r.status))
    .map(r => ({
      id: r.id,
      name: r.name,
      role: r.team || 'ทีมช่วยเหลือ',
      status: r.status,
      lat: r.lat || null,
      lng: r.lng || null,
      phone: r.phone || null,
    }));
  res.json(active);
});

// Simple auth for responder routes
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ─── GET / ─── ดูรายชื่อ responder (ต้อง login)
router.get('/', authMiddleware, (req, res) => {
  res.json(responderStore.list());
});

// ─── PUT /:id ─── อัปเดตสถานะ responder
router.put('/:id', authMiddleware, (req, res) => {
  const responder = responderStore.update(req.params.id, req.body);
  if (!responder) return res.status(404).json({ error: 'Responder not found' });
  res.json(responder);
});

module.exports = router;

