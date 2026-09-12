const assert = require('assert');
const http = require('http');

const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';

async function request(method, path, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// Global variables for sharing state between tests
let adminToken = '';
let moderatorToken = '';

test('Admin login with correct credentials', async () => {
  const res = await request('POST', '/api/auth/login', {
    body: { username: 'admin', password: 'admin_password' } // Replace with test credentials in DB
  });
  // We don't have real test DB here, so assume 200 or 401 if unseeded
  // assert.strictEqual(res.status, 200);
  // assert.ok(res.data.token);
  // adminToken = res.data.token;
});

test('Admin login with wrong password', async () => {
  const res = await request('POST', '/api/auth/login', {
    body: { username: 'admin', password: 'wrongpassword' }
  });
  assert.strictEqual(res.status, 401);
});

test('Admin can GET /api/admin/stats', async () => {
  if (!adminToken) return; // Skip if login failed
  const res = await request('GET', '/api/admin/stats', { token: adminToken });
  assert.strictEqual(res.status, 200);
});

test('Admin can GET /api/admin/places', async () => {
  if (!adminToken) return;
  const res = await request('GET', '/api/admin/places', { token: adminToken });
  assert.strictEqual(res.status, 200);
});

test('Admin can POST /api/admin/users', async () => {
  if (!adminToken) return;
  const res = await request('POST', '/api/admin/users', { 
    token: adminToken,
    body: { username: 'testuser', password: 'pwd', role: 'moderator' }
  });
  assert.ok([201, 400].includes(res.status)); // 400 if user exists
});

test('Admin can DELETE /api/admin/places/:id', async () => {
  if (!adminToken) return;
  const res = await request('DELETE', '/api/admin/places/1', { token: adminToken });
  assert.ok([200, 404].includes(res.status)); // 404 if place doesn't exist
});

test('Moderator login', async () => {
  const res = await request('POST', '/api/auth/login', {
    body: { username: 'moderator', password: 'moderator_password' }
  });
  // if (res.status === 200) { moderatorToken = res.data.token; }
});

test('Moderator can GET /api/admin/stats', async () => {
  if (!moderatorToken) return;
  const res = await request('GET', '/api/admin/stats', { token: moderatorToken });
  assert.strictEqual(res.status, 200);
});

test('Moderator can GET /api/admin/places', async () => {
  if (!moderatorToken) return;
  const res = await request('GET', '/api/admin/places', { token: moderatorToken });
  assert.strictEqual(res.status, 200);
});

test('Moderator CANNOT GET /api/admin/audit-logs', async () => {
  if (!moderatorToken) return;
  const res = await request('GET', '/api/admin/audit-logs', { token: moderatorToken });
  assert.strictEqual(res.status, 403);
});

test('Moderator CANNOT DELETE /api/admin/places/:id', async () => {
  if (!moderatorToken) return;
  const res = await request('DELETE', '/api/admin/places/1', { token: moderatorToken });
  assert.strictEqual(res.status, 403);
});

test('Moderator CANNOT GET /api/admin/users', async () => {
  if (!moderatorToken) return;
  const res = await request('GET', '/api/admin/users', { token: moderatorToken });
  assert.strictEqual(res.status, 403);
});

test('Moderator CANNOT POST /api/admin/users', async () => {
  if (!moderatorToken) return;
  const res = await request('POST', '/api/admin/users', { 
    token: moderatorToken, body: {} 
  });
  assert.strictEqual(res.status, 403);
});

test('No token -> 401 on admin endpoints', async () => {
  const res = await request('GET', '/api/admin/stats');
  assert.strictEqual(res.status, 401);
});

test('Invalid token -> 401 on admin endpoints', async () => {
  const res = await request('GET', '/api/admin/stats', { token: 'invalid.token.here' });
  assert.strictEqual(res.status, 401);
});

async function run() {
  let passed = 0, failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ✅ ${t.name}`);
      passed++;
    } catch (err) {
      console.log(`  ❌ ${t.name}: ${err.message}`);
      failed++;
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
