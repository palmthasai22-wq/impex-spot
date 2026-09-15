// Run with Node 20+ and FFmpeg installed, on the camera's LAN.
// All control and media connections originate here; no inbound relay port exists.
const { spawn } = require('node:child_process');
const dgram = require('node:dgram');
const { randomUUID } = require('node:crypto');
const { isIP } = require('node:net');

function discover() {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    const id = randomUUID();
    const found = new Set();
    let done = false;
    const finish = error => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.close();
      if (error) reject(new Error('Local discovery unavailable'));
      else resolve([...found].map(camera_ip => ({ camera_ip })));
    };
    const timer = setTimeout(() => finish(), 3000);
    socket.on('error', finish);
    socket.on('message', (buffer, info) => {
      if (buffer.length > 65536 || found.size >= 64) return;
      const xml = buffer.toString('utf8');
      // No XML entity expansion and no connections to untrusted advertised URLs.
      if (xml.includes(id) && /<(?:[\w-]+:)?ProbeMatch[\s>]/.test(xml) && isIP(info.address)) found.add(info.address);
    });
    socket.bind(0, () => {
      const message = Buffer.from(`<?xml version="1.0"?><s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:dn="http://www.onvif.org/ver10/network/wsdl"><s:Header><a:MessageID>uuid:${id}</a:MessageID><a:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</a:To><a:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</a:Action></s:Header><s:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></s:Body></s:Envelope>`);
      socket.setMulticastTTL(1);
      socket.send(message, 3702, '239.255.255.250', error => { if (error) finish(error); });
    });
  });
}

async function main() {
  const pinId = process.env.CCTV_PIN_ID;
  const token = process.env.CCTV_RELAY_TOKEN;
  if (!/^[a-f\d-]{36}$/.test(pinId || '') || !/^[a-f\d]{64}$/.test(token || '')) throw new Error('Set CCTV_PIN_ID and CCTV_RELAY_TOKEN');
  const backend = new URL(process.env.CCTV_BACKEND_URL);
  if (backend.protocol !== 'https:' && !(backend.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(backend.hostname))) throw new Error('Relay control requires HTTPS (HTTP is allowed on loopback for development)');
  const output = new URL(process.env.CCTV_INGEST_URL);
  if (!['rtsp:', 'rtsps:'].includes(output.protocol)) throw new Error('Set an RTSP(S) ingest URL over a private VPN');
  output.username = pinId;
  output.password = token;
  output.pathname = `/${pinId}`;
  output.search = '';
  let child, previous, stopped = false;
  function stopVideo() { if (child) child.kill('SIGTERM'); child = undefined; previous = undefined; }
  for (const event of ['SIGTERM', 'SIGINT']) process.once(event, () => { stopped = true; stopVideo(); });
  async function request(suffix, body) {
    const response = await fetch(new URL(`/api/relay/cctv/${pinId}/${suffix}`, backend), {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined, redirect: 'error', signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Relay control unavailable');
    return response.status === 204 ? null : response.json();
  }
  while (!stopped) {
    try {
      const config = await request('config');
      if (config.discovery_requested) {
        try { await request('discovery', { devices: await discover() }); }
        catch { console.warn('ONVIF discovery unavailable; will retry'); }
      }
      if (!config.enabled || stopped) stopVideo();
      else {
        const signature = JSON.stringify(config);
        if (signature !== previous || !child) {
          stopVideo();
          if (!isIP(config.camera_ip)) throw new Error('Invalid camera address');
          const credentials = config.credentials;
          const host = isIP(config.camera_ip) === 6 ? `[${config.camera_ip}]` : config.camera_ip;
          const input = new URL(`rtsp://${host}:${credentials.port || 554}${config.rtsp_path}`);
          input.username = credentials.username;
          input.password = credentials.password;
          // Transcode to browser-compatible H.264/AAC. Never execute connection input in a shell.
          const processHandle = spawn(process.env.FFMPEG_BIN || 'ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'quiet', '-rtsp_transport', 'tcp', '-i', input.href,
            '-map', '0:v:0', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-r', '15', '-g', '30', '-c:a', 'aac', '-f', 'rtsp', '-rtsp_transport', 'tcp', output.href], { stdio: 'ignore', windowsHide: true });
          child = processHandle;
          previous = signature;
          const clear = () => { if (child === processHandle) { child = undefined; previous = undefined; } };
          processHandle.once('error', clear);
          processHandle.once('exit', clear);
        }
      }
    } catch { stopVideo(); console.warn('Relay paused: check pairing, consent, and backend availability'); }
    if (!stopped) await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
if (require.main === module) main().catch(() => { console.error('Relay configuration invalid; check the CCTV setup guide'); process.exitCode = 1; });
module.exports = { discover };
