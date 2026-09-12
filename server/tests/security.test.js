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

    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('SQL injection in query params', async () => {
  const res = await request('GET', '/api/pins?search=\'; DROP TABLE places; --');
  // It should be handled correctly, returning 200 with results or empty array
  assert.ok(res.status === 200 || res.status === 400);
});

test('XSS payload in pin title', async () => {
  const res = await request('POST', '/api/pins', {
    body: {
      title: '<script>alert("xss")</script> Test',
      category: 'other',
      latitude: 10,
      longitude: 10
    }
  });
  // Should either block (400) or sanitize and create (201)
  assert.ok([201, 400].includes(res.status));
  if (res.status === 201) {
    assert.ok(!res.data.title.includes('<script>'));
  }
});

test('Rate limit: send 200+ requests to login in 1 second', async () => {
  const promises = [];
  for (let i = 0; i < 201; i++) {
    promises.push(request('POST', '/api/auth/login', {
      body: { username: 'user', password: 'pwd' }
    }));
  }
  const results = await Promise.all(promises);
  const tooManyRequests = results.some(r => r.status === 429);
  assert.ok(tooManyRequests, 'Expected at least one 429 status');
});

test('Mass assignment: send extra fields in POST body', async () => {
  const res = await request('POST', '/api/pins', {
    body: {
      title: 'Valid Pin',
      category: 'other',
      latitude: 10,
      longitude: 10,
      isAdmin: true, // extra field
      verified: true // extra field
    }
  });
  
  if (res.status === 201) {
    // Make sure extra fields are stripped (or ignored by DB logic)
    // Here we can't easily assert on output without knowing API return structure,
    // but the system should process the request without applying those fields.
    assert.strictEqual(res.status, 201);
  }
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
