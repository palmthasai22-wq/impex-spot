const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pinStore = require('../services/pinStore');
const responderStore = require('../services/responderStore');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// ─── POST /login — ล็อกอิน admin ───
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // ─── ลองหาจาก DB ก่อน ───
    let user = null;
    try {
      const userRepository = require('../db/repositories/userRepository');
      user = await userRepository.findByUsername(username);
      if (user) {
        const passwordField = user.password_hash || user.passwordHash;
        if (!passwordField || !(await bcrypt.compare(password, passwordField))) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
      }
    } catch (dbErr) {
      // DB ยังไม่พร้อม — ใช้ env fallback
      user = null;
    }

    // ─── Fallback: ใช้ env credentials ───
    if (!user) {
      const envUser = process.env.ADMIN_USERNAME || 'admin';
      const envPass = process.env.ADMIN_PASSWORD || '123456';

      if (username !== envUser || password !== envPass) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      user = {
        id: 'env-admin',
        username: envUser,
        role: 'admin',
        display_name: 'Administrator',
      };
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role || 'admin' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role || 'admin',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Auth middleware สำหรับ admin routes ───
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role || 'admin',
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// ─── ทุก route หลัง login ต้องมี token ───
router.use(authMiddleware);

// ─── GET /stats ─── ภาพรวม
router.get('/stats', (req, res) => {
  const allPins = pinStore.list({ includeInactive: true });
  const emergencies = allPins.filter(p => p.type === 'emergency' || p.category === 'emergency');
  const verified = allPins.filter(p => (p.confidence || 0) >= 60);
  const expired = allPins.filter(p => p.status === 'expired');

  res.json({
    total: allPins.length,
    emergencies: emergencies.length,
    verified: verified.length,
    expired: expired.length,
  });
});

// ─── GET /pins ─── ดูหมุดทั้งหมด
router.get('/pins', (req, res) => {
  const pins = pinStore.list({ includeInactive: true });
  res.json(pins);
});

// ─── PUT /pins/:id ─── แก้ไขหมุด
router.put('/pins/:id', (req, res) => {
  const { title, type, customType, description, status } = req.body;
  const pin = pinStore.update(req.params.id, { title, type, customType, description, status });
  if (!pin) return res.status(404).json({ error: 'Pin not found' });
  res.json(pin);
});

// ─── PUT /pins/:id/status ─── เปลี่ยนสถานะ (อนุมัติ/ปฏิเสธ/ซ่อน)
router.put('/pins/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['active', 'pending', 'deleted', 'hidden', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const pin = pinStore.update(req.params.id, { status });
  if (!pin) return res.status(404).json({ error: 'Pin not found' });
  res.json(pin);
});

// ─── DELETE /pins/:id ─── ลบหมุด
router.delete('/pins/:id', (req, res) => {
  const pin = pinStore.remove(req.params.id);
  if (!pin) return res.status(404).json({ error: 'Pin not found' });
  res.json({ message: 'Deleted', pin });
});

// ─── Emergency Dispatch ───
router.put('/emergencies/:id/dispatch', (req, res) => {
  const { dispatchStatus, responderId } = req.body;
  const pin = pinStore.update(req.params.id, {
    dispatchStatus,
    assignedResponderId: responderId,
  });
  if (!pin) return res.status(404).json({ error: 'Emergency not found' });

  // อัปเดต responder: ใส่พิกัดจุดเกิดเหตุ + เปลี่ยน status ให้แสดงหมุดบนแผนที่
  if (responderId && pin.lat && pin.lng) {
    const newStatus = dispatchStatus === 'resolved' ? 'available' : (dispatchStatus || 'dispatched');
    const locationUpdate = dispatchStatus === 'resolved'
      ? { status: newStatus, lat: null, lng: null }
      : { status: newStatus, lat: pin.lat, lng: pin.lng };
    const responder = responderStore.update(responderId, locationUpdate);
    if (responder) {
      pin.assignedResponderName = responder.name;
    }
  }

  res.json(pin);
});

// ─── Traffic Management ───
router.put('/traffic/:id', (req, res) => {
  const { trafficStatus, trafficNote } = req.body;
  const pin = pinStore.update(req.params.id, { trafficStatus, trafficNote });
  if (!pin) return res.status(404).json({ error: 'Traffic pin not found' });
  res.json(pin);
});

// ─── Responder Management ───
router.get('/responders', (req, res) => {
  res.json(responderStore.list());
});

router.post('/responders', (req, res) => {
  const responder = responderStore.create(req.body);
  res.status(201).json(responder);
});

router.put('/responders/:id', (req, res) => {
  const responder = responderStore.update(req.params.id, req.body);
  if (!responder) return res.status(404).json({ error: 'Responder not found' });
  res.json(responder);
});

router.delete('/responders/:id', (req, res) => {
  const responder = responderStore.remove(req.params.id);
  if (!responder) return res.status(404).json({ error: 'Responder not found' });
  res.json({ message: 'Deleted' });
});

module.exports = router;