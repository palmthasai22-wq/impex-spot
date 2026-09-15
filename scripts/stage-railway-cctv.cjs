const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const stage = path.join(root, '.local/cctv-deploy');
const skip = new Set(['node_modules', '.git', 'dist', '.env', '.local', '.venv']);
function copy(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip.has(entry.name) || entry.name.startsWith('.env.') || entry.name.endsWith('.log')) continue;
    if (from === path.join(root, 'server') && entry.name === 'data') continue;
    if (entry.isDirectory()) copy(path.join(from, entry.name), path.join(to, entry.name));
    else if (entry.isFile()) fs.copyFileSync(path.join(from, entry.name), path.join(to, entry.name));
  }
}
for (const dir of ['server', 'client']) copy(path.join(root, dir), path.join(stage, dir));
for (const file of ['Dockerfile', 'railway.json', '.dockerignore']) fs.copyFileSync(path.join(root, file), path.join(stage, file));
fs.mkdirSync(path.join(stage, 'server/data'), { recursive: true });
for (const file of ['pins.json', 'responders.json']) {
  const backup = path.join(root, '.local/cctv-backup', file);
  const records = JSON.parse(fs.readFileSync(backup, 'utf8').replace(/^\uFEFF/, ''));
  if (!Array.isArray(records)) throw new Error('Backup must contain an array');
  fs.writeFileSync(path.join(stage, 'server/data', file), JSON.stringify(records));
}
console.log('Deployment staged with verified backup records; environment files and dependencies excluded');
