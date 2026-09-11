const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pinStore = require('../services/pinStore');
const expiryService = require('../services/expiryService');

const router = express.Router();
const permanentTypes = new Set(['restaurant', 'market', 'shop', 'landmark', 'review']);

router.get('/', (req, res) => res.json(pinStore.list({ query: req.query })));

router.post('/', (req, res) => {
  const { title, lat, lng, type, category, reviewRating } = req.body;
  if (!title || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return res.status(400).json({ error: 'title, lat and lng are required' });
  }
  const pinType = type || category || 'other';
  const numericReviewRating = Number(reviewRating);
  const createdAt = new Date();
  const pin = pinStore.create({
    ...req.body,
    id: uuidv4(),
    type: pinType,
    category: pinType,
    lat: Number(lat),
    lng: Number(lng),
    sessionId: req.sessionId,
    createdAt: createdAt.toISOString(),
    expiresAt: permanentTypes.has(pinType) ? null : new Date(createdAt.getTime() + expiryService.getExpiry(pinType)).toISOString(),
    images: Array.isArray(req.body.images) ? req.body.images : [],
    averageRating: Number.isFinite(numericReviewRating) && numericReviewRating >= 2 && numericReviewRating <= 5
      ? Number(numericReviewRating.toFixed(2))
      : 0,
    reviews: Number.isFinite(numericReviewRating) && numericReviewRating >= 2 && numericReviewRating <= 5
      ? [{ rating: Number(numericReviewRating), comment: req.body.reviewNote || '', sessionId: req.sessionId, createdAt: createdAt.toISOString() }]
      : [],
  });
  res.status(201).json(pin);
});

router.put('/:id/verify', (req, res) => {
  const pin = pinStore.get(req.params.id);
  if (!pin || pin.status !== 'active') return res.status(404).json({ error: 'Pin not found' });
  const verifier = req.sessionId;
  if ((pin.verifications || []).includes(verifier)) return res.status(409).json({ error: 'Already verified' });
  const verifications = [...(pin.verifications || []), verifier];
  const confidence = Math.min(100, 40 + verifications.length * 20);
  res.json(pinStore.update(pin.id, { verifications, confidence }));
});

router.put('/:id/review', (req, res) => {
  const pin = pinStore.get(req.params.id);
  const rating = Number(req.body.rating);
  if (!pin || !Number.isFinite(rating) || rating < 2 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 2 and 5' });
  }
  const reviews = [...(pin.reviews || []), {
    rating,
    title: req.body.title || '',
    comment: req.body.comment || '',
    sessionId: req.sessionId,
    createdAt: new Date().toISOString(),
  }];
  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  res.json(pinStore.update(pin.id, { reviews, averageRating: Number(averageRating.toFixed(2)) }));
});

module.exports = router;
