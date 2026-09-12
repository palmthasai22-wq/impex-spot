const express = require('express');
const notificationRepository = require('../db/repositories/notificationRepository');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const notifications = await notificationRepository.listForUser(req.user.id, req.query);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

router.get('/unread-count', async (req, res, next) => {
  try {
    const count = await notificationRepository.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/read', async (req, res, next) => {
  try {
    await notificationRepository.markAsRead(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.put('/read-all', async (req, res, next) => {
  try {
    await notificationRepository.markAllAsRead(req.user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
