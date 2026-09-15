const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

// Opt in with a DISPOSABLE PostGIS test database. No production connection fallback.
test('CCTV migration enforces encryption envelopes and verified owner consent in PostgreSQL', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    const schema = `cctv_test_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}, public`);
    await client.query('CREATE TABLE users (id uuid PRIMARY KEY)');
    await client.query(fs.readFileSync(path.join(__dirname, '../db/migrations/004_cctv_pins.sql'), 'utf8'));
    const id = randomUUID();
    await client.query(`INSERT INTO cctv_pins (id,location,owner_type,connection_type,camera_ip,rtsp_path,credentials)
      VALUES ($1,ST_SetSRID(ST_MakePoint(100.5,13.7),4326)::geography,'household','wifi_local','v1.encrypted','v1.encrypted','v1.encrypted')`, [id]);
    assert.equal((await client.query('SELECT owner_consent FROM cctv_pins')).rows[0].owner_consent, false);
    for (const sql of ["UPDATE cctv_pins SET status='online'", 'UPDATE cctv_pins SET owner_consent=TRUE', "UPDATE cctv_pins SET camera_ip='192.168.1.2'", 'UPDATE cctv_pins SET coverage_direction=360']) {
      await client.query('SAVEPOINT validation');
      await assert.rejects(client.query(sql), { code: '23514' });
      await client.query('ROLLBACK TO SAVEPOINT validation');
    }
  } finally { await client.query('ROLLBACK'); await client.end(); }
});
