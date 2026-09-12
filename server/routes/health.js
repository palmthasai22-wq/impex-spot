const express = require('express');
const { pool } = require('../db');

const router = express.Router();

router.get('/live', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

router.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', db: 'disconnected', details: error.message });
  }
});

module.exports = router;
