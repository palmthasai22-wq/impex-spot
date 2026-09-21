const express = require('express');
const jwt = require('jsonwebtoken');
const planStore = require('../services/planStore');
const shopPinStore = require('../services/planShopPinStore');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// ── Middleware: verify admin JWT ──
const requireAdmin = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'ต้องเข้าสู่ระบบ Admin' });
  }
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    req.adminUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ' });
  }
};

// ══════════════════════════════════════════════════════════════
// PLAN CRUD
// ══════════════════════════════════════════════════════════════

// GET /api/plans — ดึงแผนผังทั้งหมด (public)
router.get('/', (req, res) => {
  res.json(planStore.getAll());
});

// GET /api/plans/:pinId — ดึงแผนผังทั้งหมดของหมุด (public)
router.get('/:pinId', (req, res) => {
  const plans = planStore.getByPinId(req.params.pinId);
  res.json(plans);
});

// POST /api/plans — สร้างแผนผังใหม่ (admin only)
router.post('/', requireAdmin, (req, res) => {
  const { linkedPinId, locationName, floorName, floorLevel, floorOrder, zoneName, description, planImageUrl } = req.body;
  
  if (!String(locationName || '').trim()) return res.status(400).json({ error: 'ต้องระบุอาคารหรือสถานที่' });
  if (!String(floorName || '').trim()) return res.status(400).json({ error: 'ต้องระบุชั้น' });
  if (!planImageUrl) return res.status(400).json({ error: 'ต้องระบุ planImageUrl' });

  const finalLinkedPinId = linkedPinId || 'unlinked';

  const duplicate = planStore.getAll().some(plan =>
    plan.linkedPinId === finalLinkedPinId &&
    String(plan.locationName || '').trim().toLocaleLowerCase('th-TH') === String(locationName).trim().toLocaleLowerCase('th-TH') &&
    String(plan.floorName || '').trim().toLocaleLowerCase('th-TH') === String(floorName).trim().toLocaleLowerCase('th-TH') &&
    String(plan.zoneName || '').trim().toLocaleLowerCase('th-TH') === String(zoneName || '').trim().toLocaleLowerCase('th-TH')
  );
  if (duplicate) return res.status(409).json({ error: 'อาคาร ชั้น และโซนนี้มีแผนผังอยู่แล้ว' });

  const plan = planStore.create({
    linkedPinId: finalLinkedPinId,
    locationName: String(locationName).trim(),
    floorName: String(floorName).trim(),
    floorLevel,
    floorOrder,
    zoneName: String(zoneName || '').trim(),
    description: String(description || '').trim(),
    planImageUrl,
  });
  res.status(201).json(plan);
});

// PUT /api/plans/:id — แก้ไขแผนผัง (admin only)
router.put('/:id', requireAdmin, (req, res) => {
  const updated = planStore.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'ไม่พบแผนผัง' });
  res.json(updated);
});

// DELETE /api/plans/:id — ลบแผนผัง + shop pins ทั้งหมด (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  const plan = planStore.get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'ไม่พบแผนผัง' });

  // ลบหมุดร้านค้าทั้งหมดในแผนผังนี้
  const removedCount = shopPinStore.removeByPlanId(req.params.id);
  planStore.remove(req.params.id);

  res.json({ success: true, removedShopPins: removedCount });
});

// ══════════════════════════════════════════════════════════════
// SHOP PIN CRUD
// ══════════════════════════════════════════════════════════════

// GET /api/plans/:planId/shops — ดึงหมุดร้านค้าทั้งหมดในแผนผัง (public)
router.get('/:planId/shops', (req, res) => {
  const shops = shopPinStore.getByPlanId(req.params.planId);
  res.json(shops);
});

// POST /api/plans/:planId/shops — ปักหมุดร้านค้าใหม่ (public, crowd-sourced)
router.post('/:planId/shops', (req, res) => {
  const plan = planStore.get(req.params.planId);
  if (!plan) return res.status(404).json({ error: 'ไม่พบแผนผัง' });

  const { xPercent, yPercent, name, description, imageUrl } = req.body;
  if (xPercent == null || yPercent == null) {
    return res.status(400).json({ error: 'ต้องระบุตำแหน่ง xPercent และ yPercent' });
  }
  if (!name) {
    return res.status(400).json({ error: 'ต้องระบุชื่อร้าน' });
  }

  const sessionId = req.sessionId || req.headers['x-session-id'] || 'anonymous';
  const shopPin = shopPinStore.create({
    planId: req.params.planId,
    xPercent,
    yPercent,
    name,
    description,
    imageUrl,
    createdBy: sessionId,
  });

  res.status(201).json(shopPin);
});

// DELETE /api/plans/shops/:shopId — ลบหมุดร้านค้า (admin only)
router.delete('/shops/:shopId', requireAdmin, (req, res) => {
  const removed = shopPinStore.remove(req.params.shopId);
  if (!removed) return res.status(404).json({ error: 'ไม่พบหมุดร้านค้า' });
  res.json({ success: true });
});

module.exports = router;
