const express = require('express');
const pinStore = require('../services/pinStore');

const router = express.Router();

// ─── Public: แจ้งเหตุฉุกเฉิน (ไม่ต้อง login) ───
router.post('/', (req, res) => {
  try {
    const { title, emergencyType, lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Location (lat, lng) is required' });
    }

    const sessionId = req.sessionId || req.headers['x-session-id'];

    const pin = pinStore.create({
      ...req.body,
      title: title || 'เหตุฉุกเฉิน',
      type: 'emergency',
      category: 'emergency',
      status: 'active',
      sessionId,
      isEmergency: true,
      dispatchStatus: 'pending',
    });

    res.status(201).json(pin);
  } catch (error) {
    console.error('Error creating emergency:', error);
    res.status(500).json({ error: 'Failed to create emergency report' });
  }
});

module.exports = router;
