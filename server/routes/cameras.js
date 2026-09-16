const express = require('express');
const rateLimit = require('express-rate-limit');
const { randomBytes } = require('node:crypto');
const { isIP } = require('node:net');
const { publicCamera, adminCamera, publishable } = require('../services/cameraDto');
const { decrypt, hashToken, equalSecret } = require('../services/cameraCrypto');
const { UUID, invalid, validateCamera } = require('../services/cameraValidation');
const { reconcileCamera } = require('../services/cameraMedia');

function createCameraRoutes({ repo, media, adminAuth, controlToken = process.env.CCTV_CONTROL_TOKEN, edgeToken = process.env.CCTV_EDGE_TOKEN }) {
  const router = express.Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  const run = fn => async (req, res) => {
    try { return await fn(req, res); }
    catch (error) { res.status(error.status === 400 ? 400 : 503).json({ error: error.status === 400 ? 'Invalid camera input' : 'Camera service unavailable' }); }
  };
  const idParam = (req, res, next, id) => UUID.test(id) ? next() : res.status(400).json({ error: 'Invalid camera ID' });
  router.param('id', idParam);
  const page = req => {
    const limit = req.query.limit === undefined ? 100 : Number(req.query.limit);
    const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(offset) || offset < 0 || offset > 100000) invalid();
    return { limit, offset };
  };
  const getPublic = async (id, res) => {
    const row = await repo.find(id);
    if (!publishable(row)) { res.status(404).json({ error: 'Camera not available' }); return null; }
    return row;
  };
  const sync = async row => {
    await reconcileCamera(row, repo, media);
    return repo.find(row.id);
  };

  router.get('/pins/cctv', run(async (req, res) => res.json((await repo.list({ ...page(req), publicOnly: true })).filter(publishable).map(publicCamera))));
  router.get('/pins/cctv/:id', run(async (req, res) => { const row = await getPublic(req.params.id, res); if (row) res.json(publicCamera(row)); }));
  router.get('/streams/:id', run(async (req, res) => {
    const row = await getPublic(req.params.id, res);
    if (!row) return;
    if (row.status !== 'online') return res.status(409).json({ error: 'Camera offline' });
    res.json({ public_stream_url: publicCamera(row).public_stream_url });
  }));

  // Run this check before EVERY edge response, including cache hits. Never cache authorization.
  router.get('/internal/cctv/playback/:id', run(async (req, res) => {
    const row = await repo.find(req.params.id);
    res.sendStatus(publishable(row) && row.status === 'online' ? 204 : 403);
  }));
  router.post('/internal/cctv/auth', run(async (req, res) => {
    const { action, path, user, password, token, protocol } = req.body;
    if (action === 'api') return res.sendStatus(user === 'control' && equalSecret(password, controlToken) ? 204 : 401);
    if (!UUID.test(path || '')) return res.sendStatus(401);
    const row = await repo.find(path);
    if (!publishable(row)) return res.sendStatus(401);
    if (action === 'read') return res.sendStatus(protocol === 'hls' && equalSecret(token || password, edgeToken) ? 204 : 401);
    if (action === 'publish') return res.sendStatus(protocol === 'rtsp' && user === path && typeof password === 'string' && equalSecret(hashToken(password), row.relay_token_hash) ? 204 : 401);
    res.sendStatus(401);
  }));

  const relayAuth = run(async (req, res) => {
    const token = req.headers.authorization?.match(/^Bearer ([a-f\d]{64})$/)?.[1];
    const row = await repo.find(req.params.id);
    if (!token || !row || !equalSecret(hashToken(token), row.relay_token_hash)) { res.status(401).json({ error: 'Invalid relay identity' }); return; }
    return row;
  });
  // Dedicated machine identity; a login JWT can never access decrypted relay configuration.
  router.get('/relay/cctv/:id/config', run(async (req, res) => {
    const row = await relayAuth(req, res);
    if (!row || res.headersSent) return;
    await repo.heartbeat(row.id);
    res.json({ enabled: publishable(row), discovery_requested: row.discovery_requested,
      ...(publishable(row) ? { camera_ip: decrypt(row.camera_ip, `${row.id}:camera_ip`), rtsp_path: decrypt(row.rtsp_path, `${row.id}:rtsp_path`), credentials: decrypt(row.credentials, `${row.id}:credentials`) } : {}) });
  }));
  router.post('/relay/cctv/:id/discovery', run(async (req, res) => {
    const row = await relayAuth(req, res);
    if (!row || res.headersSent) return;
    if (!Array.isArray(req.body.devices) || req.body.devices.length > 64) invalid();
    const devices = req.body.devices.map(d => {
      if (!d || !isIP(d.camera_ip || '')) invalid();
      return { camera_ip: d.camera_ip }; // Store no raw XML, URLs, credentials or vendor payloads.
    });
    const awaitingAutomaticIp = row.connection_type === 'wifi_local'
      && decrypt(row.camera_ip, `${row.id}:camera_ip`) === ''
      && row.verification_status === 'pending'
      && row.owner_consent !== true;
    if (awaitingAutomaticIp && devices.length === 1) {
      await repo.save(row.id, { camera_ip: devices[0].camera_ip, connection_type: 'wifi_local', owner_consent: false });
    }
    await repo.reportDiscovery(row.id, devices);
    res.sendStatus(204);
  }));

  const admin = express.Router();
  admin.use((req, _res, next) => /^\/(cameras(?:\/|$)|monitor(?:\/|$))/.test(req.path) ? next() : next('router'));
  admin.use(adminAuth);
  admin.use(rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));
  admin.param('id', idParam);
  admin.get('/cameras/discover', run(async (req, res) => {
    if (!UUID.test(req.query.pinId || '')) invalid();
    const row = await repo.find(req.query.pinId);
    if (!row) return res.sendStatus(404);
    if (!row.relay_token_hash) return res.status(409).json({ error: 'Pair and start a local relay first' });
    if (req.query.refresh === 'true') await repo.requestDiscovery(row.id);
    res.json({ devices: repo.discovery(row), pending: req.query.refresh === 'true' || row.discovery_requested, updated_at: row.discovery_updated_at });
  }));
  admin.get('/cameras/:id', run(async (req, res) => { const row = await repo.find(req.params.id); res.status(row ? 200 : 404).json(row ? adminCamera(row) : { error: 'Camera not found' }); }));
  admin.get('/monitor', run(async (req, res) => res.json((await repo.list(page(req))).map(adminCamera))));
  admin.post('/cameras', run(async (req, res) => {
    const row = await repo.save(null, validateCamera(req.body, true), req.user.id);
    res.status(201).json(adminCamera(await sync(row)));
  }));
  admin.put('/cameras/:id', run(async (req, res) => {
    const row = await repo.save(req.params.id, validateCamera(req.body), req.user.id);
    if (!row) return res.sendStatus(404);
    res.json(adminCamera(await sync(row)));
  }));
  admin.delete('/cameras/:id', run(async (req, res) => {
    // Revoke in the DB first. Edge/auth checks deny access even if the media service is down.
    if (!await repo.remove(req.params.id)) return res.sendStatus(404);
    try { await media.remove(req.params.id); } catch { /* orphan path remains inaccessible */ }
    res.sendStatus(204);
  }));
  admin.post('/cameras/:id/health', run(async (req, res) => {
    const row = await repo.find(req.params.id);
    if (!row) return res.sendStatus(404);
    res.json(adminCamera(await sync(row)));
  }));
  admin.post('/cameras/:id/relay-token', run(async (req, res) => {
    const token = randomBytes(32).toString('hex');
    if (!await repo.pair(req.params.id, hashToken(token))) return res.sendStatus(404);
    try { await media.remove(req.params.id); } catch { /* blocked by DB status until reconciliation */ }
    res.json({ pin_id: req.params.id, relay_token: token });
  }));
  router.use('/admin', admin);
  return router;
}
module.exports = { createCameraRoutes };
