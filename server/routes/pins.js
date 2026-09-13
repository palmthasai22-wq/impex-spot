const express = require('express');
const pinStore = require('../services/pinStore');
const socketService = require('../services/socketService');

const router = express.Router();

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
