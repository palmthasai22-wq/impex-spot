const express = require('express');
const auth = require('../middleware/auth');
const responderStore = require('../services/responderStore');

const router = express.Router();
router.use(auth);
router.get('/', (req, res) => res.json(responderStore.list()));
router.put('/:id', (req, res) => {
  const responder = responderStore.update(req.params.id, req.body);
  if (!responder) return res.status(404).json({ error: 'Responder not found' });
  res.json(responder);
});
module.exports = router;
