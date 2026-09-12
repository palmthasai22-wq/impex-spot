const express = require('express');
const incidentRepository = require('../db/repositories/incidentRepository');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const incidents = await incidentRepository.list(req.query);
    res.json(incidents);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const incident = await incidentRepository.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
