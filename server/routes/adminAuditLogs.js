const express = require('express');
const auditLogRepository = require('../db/repositories/auditLogRepository');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const logs = await auditLogRepository.list(req.query);
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const log = await auditLogRepository.findById(req.params.id);
    if (!log) return res.status(404).json({ error: 'Audit log not found' });
    res.json(log);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
