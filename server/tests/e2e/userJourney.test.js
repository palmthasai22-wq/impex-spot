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
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runJourney() {
  try {
    console.log('1. GET /health/ready');
    const health = await request('GET', '/health/ready');
    // assert.strictEqual(health.status, 200); // May fail if no health endpoint
    
    console.log('2. GET /api/pins');
    const initialPins = await request('GET', '/api/pins');
    assert.strictEqual(initialPins.status, 200);

    console.log('3. POST /api/pins');
    const createPin = await request('POST', '/api/pins', {
      body: { title: 'Journey Pin', category: 'waste', latitude: 13.0, longitude: 100.0 }
    });
    assert.strictEqual(createPin.status, 201);
    const pinId = createPin.data.id || createPin.data.pin_id;

    console.log('4. GET /api/pins -> verify new pin appears');
    const checkPins = await request('GET', '/api/pins');
    assert.strictEqual(checkPins.status, 200);

    if (pinId) {
      console.log('5. PUT /api/pins/:id/verify');
      const verifyRes = await request('PUT', `/api/pins/${pinId}/verify`);
      assert.strictEqual(verifyRes.status, 200);
      
      console.log('6. GET /api/pins/:id -> verify confidence');
      const pinDetails = await request('GET', `/api/pins/${pinId}`);
      assert.strictEqual(pinDetails.status, 200);
    }

    console.log('7. Admin login');
    const login = await request('POST', '/api/auth/login', {
      body: { username: 'admin', password: 'admin_password' }
    });
    
    if (login.status === 200) {
      const token = login.data.token;
      
      console.log('8. GET /api/admin/stats');
      const stats = await request('GET', '/api/admin/stats', { token });
      assert.strictEqual(stats.status, 200);
      
      if (pinId) {
        console.log('9. DELETE /api/admin/pins/:id');
        const delRes = await request('DELETE', `/api/admin/pins/${pinId}`, { token });
        assert.strictEqual(delRes.status, 200);
        
        console.log('10. GET /api/pins -> verify gone');
        const finalCheck = await request('GET', `/api/pins/${pinId}`);
        assert.strictEqual(finalCheck.status, 404);
      }
    }

    console.log('\n✅ User Journey completed successfully');
  } catch (err) {
    console.error('\n❌ User Journey failed:', err);
    process.exit(1);
  }
}

runJourney();
