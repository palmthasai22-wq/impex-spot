const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { requireRole, requirePermission } = require('../middleware/rbac');
const { auditLog } = require('../middleware/auditLog');
const { validate, validateParams, validateQuery } = require('../middleware/inputValidator');
const { loginLimiter, adminApiLimiter } = require('../middleware/rateLimiter');
const userRepository = require('../db/repositories/userRepository');
const placeRepository = require('../db/repositories/placeRepository');
const incidentRepository = require('../db/repositories/incidentRepository');
const reviewRepository = require('../db/repositories/reviewRepository');
const flagRepository = require('../db/repositories/flagRepository');
const verificationRepository = require('../db/repositories/verificationRepository');
const responderRepository = require('../db/repositories/responderRepository');
const auditService = require('../services/auditService');

// Sub-routers
const adminUsers = require('./adminUsers');
const adminAuditLogs = require('./adminAuditLogs');

const router = express.Router();

// POST /login - authenticate admin/moderator users
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await userRepository.findByUsername(username);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.role !== 'admin' && user.role !== 'moderator') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '12h' }
    );

    await auditService.logSystemEvent('auth.login', user.id, 'user', user.id, { username });

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    next(error);
  }
});

router.use(auth);
router.use(adminApiLimiter);

// Mount sub-routers
router.use('/users', requireRole('admin'), adminUsers);
router.use('/audit-logs', requireRole('admin'), adminAuditLogs);

// GET /stats - dashboard statistics
router.get('/stats', requireRole('admin', 'moderator'), async (req, res, next) => {
  try {
    const [
      placesCount,
      incidentsCount,
      reviewsCount,
      flagsCount,
      usersCount,
      activeEmergencies,
      verifiedPlaces
    ] = await Promise.all([
      placeRepository.count(),
      incidentRepository.count(),
      reviewRepository.count(),
      flagRepository.count(),
      userRepository.count(),
      incidentRepository.count({ isEmergency: true, status: 'active' }),
      placeRepository.count({ isVerified: true })
    ]);

    res.json({
      places: placesCount,
      incidents: incidentsCount,
      reviews: reviewsCount,
      flags: flagsCount,
      users: usersCount,
      activeEmergencies,
      verifiedPlaces
    });
  } catch (error) {
    next(error);
  }
});

// --- Places Management ---
router.get('/places', requireRole('admin', 'moderator'), async (req, res, next) => {
  try {
    const places = await placeRepository.list(req.query);
    res.json(places);
  } catch (error) {
    next(error);
  }
});

router.get('/places/:id', requireRole('admin', 'moderator'), async (req, res, next) => {
  try {
    const place = await placeRepository.findById(req.params.id);
    if (!place) return res.status(404).json({ error: 'Place not found' });
    res.json(place);
  } catch (error) {
    next(error);
  }
});

router.put('/places/:id', requireRole('admin', 'moderator'), requirePermission('places:update'), auditLog('place.update'), async (req, res, next) => {
  try {
    const place = await placeRepository.update(req.params.id, req.body);
    res.json(place);
  } catch (error) {
    next(error);
  }
});

router.put('/places/:id/status', requireRole('admin', 'moderator'), auditLog('place.updateStatus'), async (req, res, next) => {
  try {
    const place = await placeRepository.updateStatus(req.params.id, req.body.status);
    res.json(place);
  } catch (error) {
    next(error);
  }
});

router.delete('/places/:id', requireRole('admin'), requirePermission('places:delete'), auditLog('place.delete'), async (req, res, next) => {
  try {
    await placeRepository.delete(req.params.id);
    res.json({ message: 'Place deleted' });
  } catch (error) {
    next(error);
  }
});

// --- Incidents Management ---
router.get('/incidents', requireRole('admin', 'moderator'), async (req, res, next) => {
  try {
    const incidents = await incidentRepository.list(req.query);
    res.json(incidents);
  } catch (error) {
    next(error);
  }
});

router.put('/incidents/:id', requireRole('admin', 'moderator'), auditLog('incident.update'), async (req, res, next) => {
  try {
    const incident = await incidentRepository.update(req.params.id, req.body);
    res.json(incident);
  } catch (error) {
    next(error);
  }
});

router.put('/incidents/:id/dispatch', requireRole('admin', 'moderator'), auditLog('incident.dispatch'), async (req, res, next) => {
  try {
    const incident = await incidentRepository.updateDispatch(req.params.id, req.body);
    res.json(incident);
  } catch (error) {
    next(error);
  }
});

router.put('/incidents/:id/traffic', requireRole('admin', 'moderator'), auditLog('incident.traffic'), async (req, res, next) => {
  try {
    const incident = await incidentRepository.updateTraffic(req.params.id, req.body);
    res.json(incident);
  } catch (error) {
    next(error);
  }
});

router.delete('/incidents/:id', requireRole('admin'), auditLog('incident.delete'), async (req, res, next) => {
  try {
    await incidentRepository.delete(req.params.id);
    res.json({ message: 'Incident deleted' });
  } catch (error) {
    next(error);
  }
});

// --- Reviews Management ---
router.get('/reviews', requireRole('admin', 'moderator'), async (req, res, next) => {
  try {
    const reviews = await reviewRepository.list(req.query);
    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

router.delete('/reviews/:id', requireRole('admin'), auditLog('review.delete'), async (req, res, next) => {
  try {
    await reviewRepository.delete(req.params.id);
    res.json({ message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
});

// --- Flags Management ---
router.get('/flags', requireRole('admin', 'moderator'), async (req, res, next) => {
  try {
    const flags = await flagRepository.list(req.query);
    res.json(flags);
  } catch (error) {
    next(error);
  }
});

router.put('/flags/:id', requireRole('admin', 'moderator'), auditLog('flag.resolve'), async (req, res, next) => {
  try {
    const flag = await flagRepository.resolve(req.params.id, req.body);
    res.json(flag);
  } catch (error) {
    next(error);
  }
});

// --- Verification ---
router.get('/verification', requireRole('admin', 'moderator'), async (req, res, next) => {
  try {
    const verifications = await verificationRepository.listPending(req.query);
    res.json(verifications);
  } catch (error) {
    next(error);
  }
});

// --- Responders Management ---
router.get('/responders', requireRole('admin', 'moderator'), async (req, res, next) => {
  try {
    const responders = await responderRepository.list(req.query);
    res.json(responders);
  } catch (error) {
    next(error);
  }
});

router.post('/responders', requireRole('admin'), auditLog('responder.create'), async (req, res, next) => {
  try {
    const responder = await responderRepository.create(req.body);
    res.status(201).json(responder);
  } catch (error) {
    next(error);
  }
});

router.put('/responders/:id', requireRole('admin', 'moderator'), auditLog('responder.update'), async (req, res, next) => {
  try {
    const responder = await responderRepository.update(req.params.id, req.body);
    res.json(responder);
  } catch (error) {
    next(error);
  }
});

router.delete('/responders/:id', requireRole('admin'), auditLog('responder.delete'), async (req, res, next) => {
  try {
    await responderRepository.delete(req.params.id);
    res.json({ message: 'Responder deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
