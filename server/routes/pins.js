const express = require('express');
const placeRepository = require('../db/repositories/placeRepository');
const incidentRepository = require('../db/repositories/incidentRepository');
const reviewRepository = require('../db/repositories/reviewRepository');
const { getIo } = require('../socket');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const places = await placeRepository.list(req.query);
    const incidents = await incidentRepository.list(req.query);
    
    // Merge and format response for backward compatibility if necessary
    res.json([...places, ...incidents]);
  } catch (error) {
    next(error);
  }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const { category, type } = req.body;
    let pin;
    
    if (type === 'incident' || category === 'incident') {
      pin = await incidentRepository.create({ ...req.body, reporterId: req.user.id });
    } else {
      pin = await placeRepository.create({ ...req.body, creatorId: req.user.id });
    }
    
    getIo().emit('pin_created', pin);
    res.status(201).json(pin);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/verify', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    let result;
    
    const place = await placeRepository.findById(id);
    if (place) {
      result = await placeRepository.verify(id, req.user.id);
    } else {
      const incident = await incidentRepository.findById(id);
      if (incident) {
        result = await incidentRepository.verify(id, req.user.id);
      } else {
        return res.status(404).json({ error: 'Pin not found' });
      }
    }
    
    getIo().emit('pin_verified', { id, verifierId: req.user.id });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/review', auth, async (req, res, next) => {
  try {
    const review = await reviewRepository.create({
      targetId: req.params.id,
      userId: req.user.id,
      ...req.body
    });
    
    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
