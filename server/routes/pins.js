const express = require('express');
const pinStore = require('../services/pinStore');
const socketService = require('../services/socketService');
const jwt = require('jsonwebtoken');

const router = express.Router();

// ─── ประเภทที่เฉพาะแอดมินเท่านั้น ───
const ADMIN_ONLY_CATEGORIES = ['cctv', 'admin_help'];

function isAdminToken(req) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return false;
    // ใช้ secret เดียวกับ /api/admin/login เพื่อให้สิทธิ์แอดมินทำงานตรงกันในโหมด fallback
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    return decoded && decoded.role === 'admin';
  } catch {
    return false;
  }
}

// ─── Public: ดึงหมุดทั้งหมด (ไม่ต้อง login) ───
router.get('/', (req, res) => {
  try {
    const pins = pinStore.list({ query: req.query });
    res.json(pins);
  } catch (error) {
    console.error('Error fetching pins:', error);
    res.status(500).json({ error: 'Failed to fetch pins' });
  }
});

// ─── Public: ปักหมุดใหม่ (ไม่ต้อง login) ───
router.post('/', (req, res) => {
  try {
    const { title, category, type, lat, lng } = req.body;
    if (!title || (!category && !type)) {
      return res.status(400).json({ error: 'Title and category are required' });
    }
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Location (lat, lng) is required' });
    }

    // ── ตรวจสอบประเภทที่เฉพาะแอดมิน ──
    const resolvedCategory = type || category;
    if (ADMIN_ONLY_CATEGORIES.includes(resolvedCategory) && !isAdminToken(req)) {
      return res.status(403).json({ error: 'เฉพาะแอดมินเท่านั้นที่สามารถปักหมุดประเภทนี้ได้' });
    }

    const pin = pinStore.create({
      ...req.body,
      sessionId: req.sessionId || req.headers['x-session-id'],
      type: type || category,
    });

    res.status(201).json(pin);
  } catch (error) {
    console.error('Error creating pin:', error);
    res.status(500).json({ error: 'Failed to create pin' });
  }
});

// ─── Public: ยืนยันหมุด (ไม่ต้อง login) ───
router.put('/:id/verify', (req, res) => {
  try {
    const pin = pinStore.get(req.params.id);
    if (!pin) return res.status(404).json({ error: 'Pin not found' });

    const sessionId = req.sessionId || req.headers['x-session-id'] || 'anonymous';

    // ตรวจว่ายืนยันซ้ำหรือยัง
    if (!pin.verifications) pin.verifications = [];
    if (pin.verifications.includes(sessionId)) {
      return res.status(400).json({ error: 'Already verified by this session' });
    }

    pin.verifications.push(sessionId);

    // คำนวณ confidence ใหม่
    const base = 40;
    const verifyBonus = pin.verifications.length * 10;
    pin.confidence = Math.min(100, base + verifyBonus);

    const updated = pinStore.update(pin.id, {
      verifications: pin.verifications,
      confidence: pin.confidence,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error verifying pin:', error);
    res.status(500).json({ error: 'Failed to verify pin' });
  }
});

// ─── Public: เพิ่มรีวิว (ไม่ต้อง login) ───
router.put('/:id/review', (req, res) => {
  try {
    const pin = pinStore.get(req.params.id);
    if (!pin) return res.status(404).json({ error: 'Pin not found' });

    const { rating, comment } = req.body;
    const sessionId = req.sessionId || req.headers['x-session-id'] || 'anonymous';

    if (!pin.reviews) pin.reviews = [];
    pin.reviews.push({
      sessionId,
      rating: Number(rating) || 3,
      comment: comment || '',
      createdAt: new Date().toISOString(),
    });

    // คำนวณ average rating
    const totalRating = pin.reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    pin.averageRating = totalRating / pin.reviews.length;
    pin.reviewRating = pin.averageRating;

    const updated = pinStore.update(pin.id, {
      reviews: pin.reviews,
      averageRating: pin.averageRating,
      reviewRating: pin.averageRating,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error reviewing pin:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

module.exports = router;
