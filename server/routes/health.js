const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running normally' 
  });
});

router.get('/live', (req, res) => {
  res.status(200).json({ status: 'ok', check: 'live' });
});

router.get('/ready', (req, res) => {
  res.status(200).json({ status: 'ok', check: 'ready' });
});

module.exports = router;
