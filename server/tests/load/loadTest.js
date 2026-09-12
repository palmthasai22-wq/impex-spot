const http = require('http');

const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';

function request(method, path) {
  return new Promise((resolve) => {
    const url = new URL(path, API_URL);
    const start = Date.now();
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
    };

    const req = http.request(options, (res) => {
      res.on('data', () => {}); // consume
      res.on('end', () => {
        resolve({ status: res.statusCode, duration: Date.now() - start });
      });
    });

    req.on('error', () => {
      resolve({ status: 0, duration: Date.now() - start, error: true });
    });
    req.end();
  });
}

async function loadTest({ name, path, method, concurrency, totalRequests, targetAvgMs }) {
  console.log(`\n--- Load Test: ${name} ---`);
  console.log(`Path: ${method} ${path} | Concurrency: ${concurrency} | Total: ${totalRequests}`);
  
  let completed = 0;
  const durations = [];
  let errors = 0;

  const startTest = Date.now();
  
  await new Promise(resolve => {
    let dispatched = 0;
    
    function next() {
      if (dispatched >= totalRequests) return;
      dispatched++;
      request(method, path).then(res => {
        if (res.error || res.status >= 500) errors++;
        else durations.push(res.duration);
        completed++;
        if (completed === totalRequests) resolve();
        else next();
      });
    }

    for (let i = 0; i < concurrency; i++) {
      next();
    }
  });

  const endTest = Date.now();
  const totalTime = (endTest - startTest) / 1000;
  const rps = (totalRequests / totalTime).toFixed(2);
  
  durations.sort((a, b) => a - b);
  const avg = durations.length > 0 ? (durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const p95 = durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0;
  const p99 = durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0;

  console.log(`Total Requests : ${totalRequests}`);
  console.log(`Total Time     : ${totalTime}s`);
  console.log(`RPS            : ${rps}`);
  console.log(`Errors         : ${errors}`);
  console.log(`Avg Latency    : ${avg.toFixed(2)}ms ${avg <= targetAvgMs ? '✅' : '❌'}`);
  console.log(`P95 Latency    : ${p95}ms`);
  console.log(`P99 Latency    : ${p99}ms`);
}

async function runAll() {
  await loadTest({
    name: 'GET Pins (Map Load)',
    method: 'GET',
    path: '/api/pins',
    concurrency: 100,
    totalRequests: 1000,
    targetAvgMs: 200
  });

  await loadTest({
    name: 'Health Check',
    method: 'GET',
    path: '/health/live',
    concurrency: 50,
    totalRequests: 500,
    targetAvgMs: 50
  });
}

runAll();
