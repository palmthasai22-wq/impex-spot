const express = require('express');
const incidentRepository = require('../db/repositories/incidentRepository');
const socket = require('../services/socketService');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, async (req, res, next) => {
  try {
    const incident = await incidentRepository.create({
      ...req.body,
      isEmergency: true,
      reporterId: req.user.id
    });
    
    getIo().emit('emergency_declared', incident);
    res.status(201).json(incident);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
