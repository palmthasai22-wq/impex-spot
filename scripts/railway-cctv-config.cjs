const { execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const cli = process.env.RAILWAY_CLI_PATH;
if (!cli) throw new Error('RAILWAY_CLI_PATH is required');
function vars(service) { return JSON.parse(execFileSync(cli, ['variable', 'list', '--service', service, '--json'], { encoding: 'utf8', windowsHide: true })); }
function set(service, key, value) {
  // Values travel on stdin and are never printed or written to disk.
  execFileSync(cli, ['variable', 'set', key, '--stdin', '--skip-deploys', '--service', service], { input: value, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  console.log(`${service}: ${key} configured`);
}
try {
  const current = vars('impex-spot-api');
  const edge = vars('cctv-edge');
  if (process.argv.includes('--edge-only')) {
    set('cctv-edge', 'CCTV_EDGE_TOKEN', current.CCTV_EDGE_TOKEN || edge.CCTV_EDGE_TOKEN || randomBytes(32).toString('hex'));
    set('cctv-edge', 'CCTV_BACKEND_HOST', `${current.RAILWAY_PRIVATE_DOMAIN}:${current.PORT || '3001'}`);
    set('cctv-edge', 'CCTV_MEDIA_HOST', `${vars('cctv-media').RAILWAY_PRIVATE_DOMAIN}:8888`);
    console.log('New edge service configured; existing API unchanged');
    process.exit(0);
  }
  for (const key of ['CCTV_ENCRYPTION_KEY', 'CCTV_CONTROL_TOKEN', 'CCTV_EDGE_TOKEN']) {
    if (!(key in current)) { current[key] = (key === 'CCTV_EDGE_TOKEN' && edge.CCTV_EDGE_TOKEN) || randomBytes(32).toString('hex'); set('impex-spot-api', key, current[key]); }
    if (!current[key]) throw new Error('Existing secret is sealed; do not replace');
  }
  set('cctv-edge', 'CCTV_EDGE_TOKEN', current.CCTV_EDGE_TOKEN);
  const apiHost = current.RAILWAY_PRIVATE_DOMAIN;
  const port = current.PORT || '3001';
  const mediaHost = vars('cctv-media').RAILWAY_PRIVATE_DOMAIN;
  const edgeHost = vars('cctv-edge').RAILWAY_PRIVATE_DOMAIN;
  if (!apiHost || !mediaHost || !edgeHost) throw new Error('Private domains are not ready');
  set('cctv-media', 'MTX_AUTHHTTPADDRESS', `http://${apiHost}:${port}/api/internal/cctv/auth`);
  set('cctv-edge', 'CCTV_BACKEND_HOST', `${apiHost}:${port}`);
  set('cctv-edge', 'CCTV_MEDIA_HOST', `${mediaHost}:8888`);
  for (const [key, value] of Object.entries({ CCTV_ENABLED: 'true', CCTV_REQUIRE_DATABASE: 'true', MEDIAMTX_API_URL: `http://${mediaHost}:9997`, CCTV_EDGE_URL: `http://${edgeHost}:8080`, CCTV_TUNNEL_HOST: mediaHost })) set('impex-spot-api', key, value);
  console.log('CCTV variables ready; deployments have not been triggered by this script');
} catch { console.error('CCTV configuration incomplete; secret values suppressed'); process.exitCode = 1; }
