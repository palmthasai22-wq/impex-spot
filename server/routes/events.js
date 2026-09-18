const express = require('express');
const eventStore = require('../services/eventStore');
const router = express.Router();

router.get('/', (_req, res) => res.json(eventStore.list()));

module.exports = router;
