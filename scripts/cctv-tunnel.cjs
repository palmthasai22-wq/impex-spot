const net = require('node:net');
// Relay shares the server's explicitly declared ws dependency; run npm ci in server first.
const { WebSocket, createWebSocketStream } = require('../server/node_modules/ws');

async function createTunnel({ backend, pinId, token }) {
  const url = new URL(`/api/relay/cctv/${pinId}/rtsp`, backend);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const sockets = new Set();
  const listener = net.createServer(socket => {
    socket.pause();
    sockets.add(socket);
    const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${token}` }, handshakeTimeout: 10000, maxPayload: 1024 * 1024, perMessageDeflate: false, followRedirects: false });
    const close = () => { socket.destroy(); ws.terminate(); };
    socket.on('error', close); ws.on('error', close);
    socket.on('close', () => { sockets.delete(socket); ws.terminate(); });
    ws.on('close', () => socket.destroy());
    ws.on('open', () => { const stream = createWebSocketStream(ws); stream.on('error', close); socket.pipe(stream); stream.pipe(socket); socket.resume(); });
  });
  await new Promise((resolve, reject) => { listener.once('error', reject); listener.listen(0, '127.0.0.1', resolve); });
  return { url: `rtsp://127.0.0.1:${listener.address().port}`, close: () => { for (const socket of sockets) socket.destroy(); listener.close(); } };
}
module.exports = { createTunnel };
