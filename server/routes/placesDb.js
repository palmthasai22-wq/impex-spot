const express = require('express');
const placeRepository = require('../db/repositories/placeRepository');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const places = await placeRepository.list(req.query);
    res.json(places);
  } catch (error) {
    next(error);
  }
});

router.get('/nearby', async (req, res, next) => {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });
    
    const places = await placeRepository.nearby(parseFloat(lat), parseFloat(lng), parseFloat(radius) || 5000);
    res.json(places);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const place = await placeRepository.findById(req.params.id);
    if (!place) return res.status(404).json({ error: 'Place not found' });
    res.json(place);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
