const rateLimit = require('express-rate-limit');
const { validateKey } = require('./cameraCrypto');
const { createCameraAuth } = require('../middleware/cameraAuth');
const { createCameraRoutes } = require('../routes/cameras');
const { createMediaClient, startCameraHealth } = require('./cameraMedia');
const { cameraStreamProxy, attachCameraTunnel } = require('./cameraTransport');

const cameraPaths = /^\/(pins\/cctv(?:\/|$)|streams(?:\/|$)|admin\/(cameras|monitor)(?:\/|$)|internal\/cctv(?:\/|$)|relay\/cctv(?:\/|$))/;
function cameraErrorHandler(error, req, res, next) {
  if (!cameraPaths.test(req.path.replace(/^\/api/, ''))) return next(error);
  // JSON parser errors can quote request bodies, including passwords. Never echo them.
  const status = error.status === 413 ? 413 : error.status === 400 ? 400 : 503;
  res.set('Cache-Control', 'no-store').status(status).json({ error: status === 413 ? 'Camera request too large' : status === 400 ? 'Invalid camera request' : 'Camera service unavailable' });
}

function mountCameras(app, server) {
  const matches = cameraPaths;
  app.use(cameraErrorHandler);
  const enabled = process.env.CCTV_ENABLED === 'true';
  if (!enabled) {
    app.use('/api', (req, res, next) => matches.test(req.path) ? res.status(503).json({ error: 'CCTV is not configured' }) : next());
    return;
  }
  validateKey();
  for (const name of ['JWT_SECRET', 'CCTV_CONTROL_TOKEN', 'CCTV_EDGE_TOKEN']) {
    if (!process.env[name] || process.env[name].length < 32) throw new Error(`${name} must be configured with at least 32 characters for CCTV`);
  }
  const repo = require('../db/repositories/cameraRepository');
  const userRepo = require('../db/repositories/userRepository');
  
  // Auto-migrate database column if using PostgreSQL
  try {
    const { pool } = require('../db/pool');
    if (pool) {
      pool.query('ALTER TABLE cctv_pins ADD COLUMN IF NOT EXISTS external_stream_url TEXT').catch(() => {});
      pool.query('ALTER TABLE cctv_pins ADD COLUMN IF NOT EXISTS detec_camera_id INTEGER').catch(() => {});
    }
  } catch (e) { /* ignore if pool not available */ }

  const media = createMediaClient();
  if (process.env.CCTV_EDGE_URL) app.use('/streams', cameraStreamProxy(process.env.CCTV_EDGE_URL));
  if (process.env.CCTV_TUNNEL_HOST && server) attachCameraTunnel(server, { repo, host: process.env.CCTV_TUNNEL_HOST });
  const routes = createCameraRoutes({ repo, media, adminAuth: createCameraAuth({ getUser: id => userRepo.findById(id) }) });
  const limit = rateLimit({ windowMs: 60000, limit: 240, standardHeaders: 'draft-7', legacyHeaders: false });
  app.use('/api', (req, res, next) => {
    if (!matches.test(req.path)) return next();
    // Internal media auth is called per segment and is limited at the private edge.
    if (req.path.startsWith('/internal/cctv/')) return routes(req, res, next);
    limit(req, res, () => routes(req, res, next));
  });
  const stop = startCameraHealth(repo, media);
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
}
module.exports = { mountCameras, cameraErrorHandler };
