const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const { createCameraRoutes } = require('../routes/cameras');
const { createCameraAuth } = require('../middleware/cameraAuth');
const { encrypt, decrypt, hashToken } = require('../services/cameraCrypto');
const { publicCamera, adminCamera } = require('../services/cameraDto');
const { validateCamera } = require('../services/cameraValidation');
const { createMediaClient, reconcileCamera } = require('../services/cameraMedia');
const { cameraErrorHandler } = require('../services/cameraSetup');

process.env.CCTV_ENCRYPTION_KEY = 'ab'.repeat(32);
const secret = 'test-jwt-secret-'.repeat(4);
const edgeToken = 'edge-test-'.repeat(8);
const relayToken = 'cd'.repeat(32);
const cameraId = randomUUID();
const adminId = randomUUID();
const userId = randomUUID();
const inactiveId = randomUUID();
const tokens = {
  user: jwt.sign({ id: userId, role: 'user' }, secret),
  admin: jwt.sign({ id: adminId, role: 'admin' }, secret),
  forgedRole: jwt.sign({ id: userId, role: 'admin' }, secret),
  inactive: jwt.sign({ id: inactiveId, role: 'admin' }, secret),
  expired: jwt.sign({ id: adminId, role: 'admin' }, secret, { expiresIn: -1 }),
};
function fixture() {
  return { id: cameraId, lat: 13.7, lng: 100.5, coverage_direction: 90, owner_type: 'household', connection_type: 'wifi_local',
    camera_ip: encrypt('192.168.50.2', `${cameraId}:camera_ip`), rtsp_path: encrypt('/private-stream', `${cameraId}:rtsp_path`),
    credentials: encrypt({ username: 'secret-user', password: 'secret-password' }, `${cameraId}:credentials`),
    public_stream_url: 'rtsp://secret-user:secret-password@192.168.50.2/private-stream',
    status: 'online', verification_status: 'verified', owner_consent: true, relay_token_hash: hashToken(relayToken), updated_at: new Date(),
    consent_confirmed_by: adminId, consent_confirmed_at: new Date() };
}
let row, base, server, mediaFailure, mutations;
const repo = {
  find: async id => row && id === row.id ? row : null,
  list: async () => row ? [row] : [],
  save: async (_id, body) => { mutations++; row = { ...row, ...body }; return row; },
  remove: async () => { mutations++; row = null; return true; },
  setHealth: async (_id, status) => { if (row) row.status = row.owner_consent && row.verification_status === 'verified' ? status : 'offline'; },
  pair: async (_id, hash) => { mutations++; row.relay_token_hash = hash; row.status = 'offline'; row.media_reset_required = true; return true; },
  clearMediaReset: async () => { row.media_reset_required = false; },
  heartbeat: async () => {}, requestDiscovery: async () => {}, reportDiscovery: async () => {}, discovery: () => [{ camera_ip: '192.168.50.2' }],
};
const media = {
  sync: async () => { if (mediaFailure) throw new Error('camera_ip credentials secret-password upstream leak'); },
  remove: async () => { if (mediaFailure) throw new Error('secret-password'); },
  status: async () => 'online',
};
before(async () => {
  const app = express();
  app.use(express.json());
  app.use(cameraErrorHandler);
  const adminAuth = createCameraAuth({ secret, getUser: async id => ({ id, role: id === userId ? 'moderator' : 'admin', is_active: id !== inactiveId }) });
  app.use('/api', createCameraRoutes({ repo, media, adminAuth, edgeToken, controlToken: 'control-test' }));
  app.post('/api/admin/login', (_req, res) => res.json({ login: true }));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
beforeEach(() => { row = fixture(); mutations = 0; mediaFailure = false; });
async function request(path, { token, body, method = 'GET' } = {}) {
  const res = await fetch(`${base}${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.text(), headers: res.headers };
}
function safe(body) {
  for (const value of ['camera_ip', 'rtsp_path', 'credentials', '192.168.50.2', 'secret-password', 'secret-user', '/private-stream', relayToken]) assert.ok(!body.includes(value), `Leaked ${value}`);
}

test('public DTO has an exact allowlist and derives a safe stream URL', () => {
  const result = publicCamera(row);
  assert.deepEqual(Object.keys(result).sort(), ['id', 'location', 'coverage_direction', 'owner_type', 'status', 'public_stream_url', 'external_stream_url', 'detec_camera_id'].sort());
  safe(JSON.stringify(result));
  assert.equal(result.public_stream_url, `/streams/${cameraId}/index.m3u8`);
  assert.equal(adminCamera(row).camera_ip, '192.168.50.2');
  assert.ok(!JSON.stringify(adminCamera(row)).includes('secret-password'));
});
test('AES-GCM uses unique nonces and binds ciphertext to field and camera', () => {
  const first = encrypt('secret', 'camera:a');
  assert.notEqual(first, encrypt('secret', 'camera:a'));
  assert.equal(decrypt(first, 'camera:a'), 'secret');
  assert.throws(() => decrypt(first, 'camera:b'));
  const parts = first.split('.');
  parts[2] = Buffer.alloc(16).toString('base64');
  assert.throws(() => decrypt(parts.join('.'), 'camera:a'));
});
test('anonymous and non-admin JWTs receive only safe public list/detail/playback responses', async () => {
  for (const token of [undefined, tokens.user, tokens.forgedRole]) {
    for (const path of ['/pins/cctv?include=credentials&fields=*', `/pins/cctv/${cameraId}`, `/streams/${cameraId}`]) {
      const result = await request(path, { token });
      assert.equal(result.status, 200); safe(result.body);
      assert.equal(result.headers.get('cache-control'), 'no-store');
    }
  }
});
test('all admin endpoints reject regular, forged-role, inactive and expired JWTs before reading or mutating cameras', async () => {
  const routes = [['GET', '/monitor'], ['GET', `/cameras/${cameraId}`], ['GET', `/cameras/discover?pinId=${cameraId}`], ['POST', '/cameras'], ['PUT', `/cameras/${cameraId}`], ['DELETE', `/cameras/${cameraId}`], ['POST', `/cameras/${cameraId}/health`], ['POST', `/cameras/${cameraId}/relay-token`]];
  for (const token of [undefined, tokens.user, tokens.forgedRole, tokens.inactive, tokens.expired]) {
    for (const [method, path] of routes) {
      const result = await request(`/admin${path}`, { token, method });
      assert.ok([401, 403].includes(result.status), `${method} ${path}: ${result.status}`); safe(result.body);
    }
  }
  assert.equal(mutations, 0);
});
test('camera route group does not intercept the existing login endpoint', async () => {
  assert.equal((await request('/admin/login', { method: 'POST', body: {} })).status, 200);
});
test('unverified, rejected and non-consenting cameras cannot be listed, played or published', async () => {
  for (const state of [{ owner_consent: false }, { verification_status: 'pending' }, { verification_status: 'rejected' }]) {
    row = { ...fixture(), ...state };
    assert.equal((await request('/pins/cctv')).body, '[]');
    assert.equal((await request(`/pins/cctv/${cameraId}`)).status, 404);
    assert.equal((await request(`/streams/${cameraId}`)).status, 404);
    assert.equal((await request(`/internal/cctv/playback/${cameraId}`)).status, 403);
    assert.equal((await request('/internal/cctv/auth', { method: 'POST', body: { action: 'publish', path: cameraId, protocol: 'rtsp', user: cameraId, password: relayToken } })).status, 401);
    const relay = await request(`/relay/cctv/${cameraId}/config`, { token: relayToken });
    assert.equal(JSON.parse(relay.body).enabled, false); safe(relay.body);
  }
});
test('offline cameras expose no playback URL', async () => {
  row.status = 'offline';
  assert.equal(JSON.parse((await request(`/pins/cctv/${cameraId}`)).body).public_stream_url, null);
  assert.equal((await request(`/streams/${cameraId}`)).status, 409);
});
test('all JWTs including admins are denied machine relay configuration', async () => {
  for (const token of Object.values(tokens)) {
    for (const [method, suffix] of [['GET', 'config'], ['POST', 'discovery']]) {
      const result = await request(`/relay/cctv/${cameraId}/${suffix}`, { token, method });
      assert.equal(result.status, 401); safe(result.body);
    }
  }
  const result = await request(`/relay/cctv/${cameraId}/config`, { token: relayToken });
  assert.equal(result.status, 200); assert.equal(JSON.parse(result.body).credentials.password, 'secret-password');
});
test('a single camera found by a newly paired Wi-Fi relay saves its IP automatically', async () => {
  row = { ...fixture(), camera_ip: encrypt('', `${cameraId}:camera_ip`), verification_status: 'pending', owner_consent: false };
  const result = await request(`/relay/cctv/${cameraId}/discovery`, {
    token: relayToken,
    method: 'POST',
    body: { devices: [{ camera_ip: '192.168.50.25' }] },
  });
  assert.equal(result.status, 204);
  assert.equal(row.camera_ip, '192.168.50.25');
  assert.equal(row.connection_type, 'wifi_local');
  assert.equal(row.owner_consent, false);
});
test('media authentication denies anonymous ingest, raw RTSP reads and wrong-purpose secrets', async () => {
  const authenticate = body => request('/internal/cctv/auth', { method: 'POST', body: { path: cameraId, ...body } });
  assert.equal((await authenticate({ action: 'publish', protocol: 'rtsp', user: cameraId, password: relayToken })).status, 204);
  assert.equal((await authenticate({ action: 'publish', protocol: 'rtsp' })).status, 401);
  assert.equal((await authenticate({ action: 'publish', protocol: 'rtsp', user: cameraId, password: tokens.admin })).status, 401);
  assert.equal((await authenticate({ action: 'read', protocol: 'hls', token: edgeToken })).status, 204);
  assert.equal((await authenticate({ action: 'read', protocol: 'rtsp', token: edgeToken })).status, 401);
  assert.equal((await authenticate({ action: 'read', protocol: 'hls' })).status, 401);
  assert.equal((await authenticate({ action: 'api', user: 'control', password: 'control-test' })).status, 204);
  assert.equal((await authenticate({ action: 'api', user: 'control', password: tokens.user })).status, 401);
});
test('consent revocation blocks previously working playback even when MediaMTX is unavailable', async () => {
  assert.equal((await request(`/internal/cctv/playback/${cameraId}`)).status, 204);
  mediaFailure = true;
  const result = await request(`/admin/cameras/${cameraId}`, { token: tokens.admin, method: 'PUT', body: { owner_consent: false } });
  assert.equal(result.status, 200);
  assert.equal((await request(`/internal/cctv/playback/${cameraId}`)).status, 403);
  assert.equal((await request(`/streams/${cameraId}`)).status, 404);
});
test('deletion blocks playback even when media cleanup fails', async () => {
  mediaFailure = true;
  assert.equal((await request(`/admin/cameras/${cameraId}`, { token: tokens.admin, method: 'DELETE' })).status, 204);
  assert.equal((await request(`/internal/cctv/playback/${cameraId}`)).status, 403);
});
test('token rotation invalidates old machine credentials and stops old playback until reconciliation', async () => {
  const response = await request(`/admin/cameras/${cameraId}/relay-token`, { token: tokens.admin, method: 'POST' });
  assert.equal(response.status, 200);
  assert.equal((await request(`/relay/cctv/${cameraId}/config`, { token: relayToken })).status, 401);
  assert.equal((await request(`/internal/cctv/playback/${cameraId}`)).status, 403);
  assert.match(JSON.parse(response.body).relay_token, /^[a-f\d]{64}$/);
});
test('unsafe input, invalid coordinates and unknown fields are rejected', () => {
  for (const body of [{ camera_ip: 'http://host/' }, { public_stream_url: 'rtsp://host' }, { owner_consent: 'false' }, { coverage_direction: 360 }, { lat: 91, lng: 100 }, { lat: 13 }, { rtsp_path: '//other-host' }, { credentials: { username: 'u', password: 'p', port: 0 } }]) assert.throws(() => validateCamera(body));
  assert.doesNotThrow(() => validateCamera({ camera_ip: '192.168.1.2', credentials: { username: 'u', password: '<raw>&secret' } }));
  assert.doesNotThrow(() => validateCamera({ detec_camera_id: 12 }));
  assert.throws(() => validateCamera({ detec_camera_id: 0 }));
  assert.throws(() => validateCamera({ detec_camera_id: 1.5 }));
  assert.doesNotThrow(() => validateCamera({
    lat: 13.7563, lng: 100.5018,
    owner_type: 'agency', connection_type: 'wifi_local',
    camera_ip: '', rtsp_path: '/stream1',
    verification_status: 'pending', owner_consent: false,
  }, true));
  assert.throws(() => validateCamera({ connection_type: 'lan_ip', camera_ip: '' }));
  assert.throws(() => validateCamera({ connection_type: 'wifi_local', camera_ip: '', verification_status: 'verified' }));
  assert.throws(() => validateCamera({ connection_type: 'wifi_local', camera_ip: '', owner_consent: true }));
});
test('malformed IDs and storage failures do not leak sensitive fields or stack traces', async () => {
  const invalid = await request('/pins/cctv/not-a-uuid'); assert.equal(invalid.status, 400); safe(invalid.body);
  const original = repo.find;
  repo.find = async () => { throw new Error('camera_ip credentials secret-password'); };
  try {
    const response = await request(`/pins/cctv/${cameraId}`); assert.equal(response.status, 503); safe(response.body); assert.ok(!response.body.includes('stack'));
  } finally { repo.find = original; }
});
test('malformed JSON cannot echo camera passwords through the global parser error', async () => {
  const response = await fetch(`${base}/admin/cameras`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"credentials":"secret-password" BROKEN' });
  assert.equal(response.status, 400);
  safe(await response.text());
});
test('media registration only creates publisher paths, never camera pull URLs', async () => {
  const calls = [];
  const client = createMediaClient({ base: 'http://media.test', token: 'control', request: async (url, options) => {
    calls.push({ url, ...options });
    return { status: url.includes('/get/') ? 404 : 200, ok: !url.includes('/get/'), json: async () => ({}) };
  } });
  await client.sync(row);
  assert.equal(calls.length, 2);
  assert.deepEqual(JSON.parse(calls[1].body), { source: 'publisher', overridePublisher: false });
  safe(JSON.stringify(calls));
});
test('failed publisher reset cannot mark the old stream online', async () => {
  row.media_reset_required = true; mediaFailure = true;
  await reconcileCamera(row, repo, media);
  assert.equal(row.status, 'error'); assert.equal(row.media_reset_required, true);
  mediaFailure = false;
  await reconcileCamera(row, repo, media);
  assert.equal(row.status, 'online'); assert.equal(row.media_reset_required, false);
});
