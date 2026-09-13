const express = require('express');
const jwt = require('jsonwebtoken');
const responderStore = require('../services/responderStore');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

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
