// Read-only inventory and backup. Secrets stay in memory and are never logged.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const cli = process.env.RAILWAY_CLI_PATH;
if (!cli) throw new Error('RAILWAY_CLI_PATH is required');
const variables = JSON.parse(execFileSync(cli, ['variable', 'list', '--service', 'impex-spot-api', '--json'], { encoding: 'utf8', windowsHide: true }));
async function main() {
  const base = 'https://impex-spot-api-production.up.railway.app';
  const login = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: variables.ADMIN_USERNAME, password: variables.ADMIN_PASSWORD }) });
  console.log(`Existing login endpoint HTTP ${login.status}`);
  if (!login.ok) throw new Error('Existing admin login unavailable');
  const { token, user } = await login.json();
  console.log(JSON.stringify({ adminDatabaseAccount: user.id !== 'env-admin', role: user.role }));
  const folder = path.join(__dirname, '../.local/cctv-backup');
  fs.mkdirSync(folder, { recursive: true });
  for (const item of ['pins', 'responders']) {
    const response = await fetch(`${base}/api/admin/${item}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Backup endpoint unavailable');
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Unexpected backup shape');
    fs.writeFileSync(path.join(folder, `${item}.json`), JSON.stringify(data, null, 2));
    console.log(`${item}: backed up ${data.length} records`);
  }
  console.log(JSON.stringify({ privateApiHost: variables.RAILWAY_PRIVATE_DOMAIN, port: variables.PORT, frontendOrigin: variables.CORS_ORIGIN }));
}
main().catch(error => { console.error(`Preflight failed (${error.cause?.code || error.code || error.message}); existing deployment unchanged`); process.exitCode = 1; });
