const express = require('express');
const pinStore = require('../services/pinStore');
const expiryService = require('../services/expiryService');

const router = express.Router();

router.post('/', (req, res) => {
  const { lat, lng, emergencyType } = req.body;
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || !emergencyType) {
    return res.status(400).json({ error: 'emergencyType, lat and lng are required' });
  }
  const createdAt = new Date();
  const pin = pinStore.create({
    ...req.body,
    type: 'emergency',
    category: 'emergency',
    isEmergency: true,
    lat: Number(lat),
    lng: Number(lng),
    sessionId: req.sessionId,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + expiryService.getExpiry('emergency')).toISOString(),
    dispatchStatus: 'pending',
    images: Array.isArray(req.body.images) ? req.body.images : [],
  });
  res.status(201).json(pin);
});

module.exports = router;
