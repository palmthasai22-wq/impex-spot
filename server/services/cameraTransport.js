const net = require('node:net');
const http = require('node:http');
const { WebSocketServer, createWebSocketStream } = require('ws');
const { hashToken, equalSecret } = require('./cameraCrypto');
const { publishable } = require('./cameraDto');
const { UUID } = require('./cameraValidation');

// Same public HTTPS origin as the API; the HLS cache remains on the private network.
function cameraStreamProxy(edgeUrl) {
  const base = new URL(edgeUrl);
  if (base.protocol !== 'http:') throw new Error('CCTV edge must use the private HTTP network');
  return (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method) || !/^\/[0-9a-f-]{36}\/[a-zA-Z0-9_.-]+\.(m3u8|mp4|m4s|ts)$/.test(req.path)) return res.sendStatus(404);
    const target = new URL(`/streams${req.url}`, base);
    const upstream = http.request(target, { method: req.method, headers: { 'X-Real-IP': req.ip, ...(req.headers.range ? { Range: req.headers.range } : {}) }, timeout: 20000 }, response => {
      res.status(response.statusCode);
      for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges']) if (response.headers[name]) res.set(name, response.headers[name]);
      response.on('error', () => res.destroy());
      response.pipe(res);
    });
    upstream.on('timeout', () => upstream.destroy());
    upstream.on('error', () => { if (!res.headersSent) res.status(503).json({ error: 'Stream unavailable' }); else res.destroy(); });
    res.on('close', () => upstream.destroy());
    upstream.end();
  };
}

function attachCameraTunnel(server, { repo, host, port = 8554 }) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024, perMessageDeflate: false });
  const sessions = new Map();
  let pending = 0;
  const handler = async (req, socket, head) => {
    if (!req.url.startsWith('/api/relay/cctv/')) return;
    const match = /^\/api\/relay\/cctv\/([^/]+)\/rtsp$/.exec(req.url);
    const token = req.headers.authorization?.match(/^Bearer ([a-f\d]{64})$/)?.[1];
    const reject = () => { if (!socket.destroyed) socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'); };
    if (!match || !UUID.test(match[1]) || !token || req.headers.origin || pending >= 32) return reject();
    pending++;
    socket.on('error', () => {});
    try {
      const id = match[1];
      const row = await repo.find(id);
      if (!publishable(row) || !equalSecret(hashToken(token), row.relay_token_hash) || socket.destroyed) return reject();
      wss.handleUpgrade(req, socket, head, ws => {
        sessions.get(id)?.terminate();
        sessions.set(id, ws);
        const tcp = net.connect({ host, port }); // Fixed media server destination, never a user-supplied host.
        const stream = createWebSocketStream(ws);
        const close = () => { tcp.destroy(); stream.destroy(); ws.terminate(); };
        tcp.setTimeout(45000, close);
        tcp.on('error', close); stream.on('error', close); ws.on('error', close);
        tcp.on('connect', () => { stream.pipe(tcp); tcp.pipe(stream); });
        tcp.on('close', () => ws.terminate());
        let checking = false;
        const timer = setInterval(async () => {
          if (checking) return;
          checking = true;
          try { const current = await repo.find(id); if (!publishable(current) || current.revision !== row.revision || !equalSecret(hashToken(token), current.relay_token_hash)) close(); }
          catch { close(); }
          finally { checking = false; }
        }, 5000);
        timer.unref();
        ws.on('close', () => { clearInterval(timer); tcp.destroy(); stream.destroy(); if (sessions.get(id) === ws) sessions.delete(id); });
      });
    } catch { reject(); }
    finally { pending--; }
  };
  server.on('upgrade', handler);
  return () => { server.off('upgrade', handler); for (const ws of sessions.values()) ws.terminate(); wss.close(); };
}
module.exports = { attachCameraTunnel, cameraStreamProxy };
