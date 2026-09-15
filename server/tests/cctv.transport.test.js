const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const express = require('express');
const { WebSocket } = require('ws');
const { randomUUID } = require('node:crypto');
const { attachCameraTunnel, cameraStreamProxy } = require('../services/cameraTransport');
const { hashToken } = require('../services/cameraCrypto');
const { createTunnel } = require('../../scripts/cctv-tunnel.cjs');
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

test('relay tunnel rejects logins and non-consenting cameras, then transfers binary data through loopback', async () => {
  const id = randomUUID();
  const token = 'ab'.repeat(32);
  const row = { id, owner_consent: true, verification_status: 'verified', relay_token_hash: hashToken(token), revision: 1 };
  const media = net.createServer(socket => socket.pipe(socket));
  await listen(media);
  const server = http.createServer();
  const stop = attachCameraTunnel(server, { repo: { find: async () => row }, host: '127.0.0.1', port: media.address().port });
  await listen(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  const rejected = auth => new Promise((resolve, reject) => {
    const ws = new WebSocket(`${base.replace('http:', 'ws:')}/api/relay/cctv/${id}/rtsp`, { headers: { Authorization: `Bearer ${auth}` } });
    ws.on('open', () => { ws.terminate(); reject(new Error('Unexpected authorization')); });
    ws.on('error', () => resolve());
  });
  let tunnel;
  try {
    await rejected('login.jwt.token');
    row.owner_consent = false;
    await rejected(token);
    row.owner_consent = true;
    tunnel = await createTunnel({ backend: base, pinId: id, token });
    const url = new URL(tunnel.url);
    await new Promise((resolve, reject) => {
      const socket = net.connect({ host: url.hostname, port: Number(url.port) });
      socket.setTimeout(5000, () => { socket.destroy(); reject(new Error('Tunnel timeout')); });
      socket.once('error', reject);
      const payload = Buffer.from([0, 1, 255, 128, 64]);
      socket.once('connect', () => socket.write(payload));
      socket.once('data', data => { assert.deepEqual(data, payload); socket.destroy(); resolve(); });
    });
  } finally { tunnel?.close(); stop(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await new Promise(resolve => media.close(resolve)); }
});

test('stream proxy permits media files only and never forwards browser credentials to the edge', async () => {
  let received;
  const edge = http.createServer((req, res) => { received = req; res.setHeader('Content-Type', 'application/vnd.apple.mpegurl'); res.end('#EXTM3U'); });
  await listen(edge);
  const app = express();
  app.use('/streams', cameraStreamProxy(`http://127.0.0.1:${edge.address().port}`));
  const server = http.createServer(app);
  await listen(server);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const id = randomUUID();
    const response = await fetch(`${base}/streams/${id}/index.m3u8`, { headers: { Authorization: 'Bearer browser-secret', Cookie: 'secret=cookie' } });
    assert.equal(response.status, 200); assert.equal(await response.text(), '#EXTM3U');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(received.url, `/streams/${id}/index.m3u8`);
    assert.equal(received.headers.authorization, undefined); assert.equal(received.headers.cookie, undefined);
    assert.equal((await fetch(`${base}/streams/${id}/config.json`)).status, 404);
  } finally { server.closeAllConnections(); edge.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await new Promise(resolve => edge.close(resolve)); }
});
