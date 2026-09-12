const express = require('express');
const responderRepository = require('../db/repositories/responderRepository');
const socket = require('../services/socketService');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const responders = await responderRepository.list(req.query);
    res.json(responders);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const responder = await responderRepository.update(req.params.id, req.body);
    res.json(responder);
  } catch (error) {
    next(error);
  }
});

router.post('/location', auth, async (req, res, next) => {
  try {
    // Permission check for responder location update should ideally be done against the user's responder profile.
    const { lat, lng, responderId } = req.body;
    if (!responderId || !lat || !lng) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const responder = await responderRepository.updateLocation(responderId, { lat, lng });
    getIo().emit('responder_location_updated', { id: responderId, lat, lng });
    res.json(responder);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
