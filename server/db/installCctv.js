// Additive, transactional production installation. Never resets existing tables/users.
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

async function install() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('impex-cctv-install'))");
    const prerequisite = await client.query("SELECT to_regclass('public.users') AS users, EXISTS(SELECT 1 FROM pg_extension WHERE extname='postgis') AS postgis");
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(version VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW())');
    if (!prerequisite.rows[0].users) {
      const partial = await client.query("SELECT to_regclass('public.places') AS places, to_regclass('public.incidents') AS incidents, to_regclass('public.roles') AS roles");
      if (Object.values(partial.rows[0]).some(Boolean)) throw new Error('Partial application schema requires review');
      for (const file of ['001_initial_schema.sql', '002_seed_roles.sql', '003_indexes.sql']) {
        await client.query(fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf8'));
        await client.query('INSERT INTO schema_migrations(version) VALUES($1) ON CONFLICT DO NOTHING', [file]);
      }
      console.log('Base application schema initialized in empty database');
    } else if (!prerequisite.rows[0].postgis) {
      await client.query('CREATE EXTENSION IF NOT EXISTS postgis');
    }
    // UserRepository reads this field, but older base schemas did not include it.
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ');
    const existing = await client.query("SELECT to_regclass('public.cctv_pins') AS cameras");
    if (!existing.rows[0].cameras) {
      await client.query(fs.readFileSync(path.join(__dirname, 'migrations/004_cctv_pins.sql'), 'utf8'));
      console.log('CCTV migration applied');
    } else {
      // A previously scaffolded table may predate stream revision tracking.
      await client.query('ALTER TABLE cctv_pins ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1');
      await client.query('ALTER TABLE cctv_pins ADD COLUMN IF NOT EXISTS media_reset_required BOOLEAN NOT NULL DEFAULT TRUE');
      console.log('CCTV migration already present');
    }
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(version VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW())');
    await client.query("INSERT INTO schema_migrations(version) VALUES ('004_cctv_pins.sql') ON CONFLICT DO NOTHING");
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;
    if (!username || !password) throw new Error('Existing admin environment credentials are required');
    const user = (await client.query('SELECT id,role,is_active FROM users WHERE username=$1', [username])).rows[0];
    if (!user) {
      await client.query("INSERT INTO users(username,password_hash,display_name,role,is_active) VALUES($1,$2,'Administrator','admin',true)", [username, await bcrypt.hash(password, 12)]);
      console.log('Existing environment admin provisioned as a database account');
    } else if (user.role !== 'admin' || user.is_active !== true) {
      throw new Error('Existing account is not an active database administrator');
    }
    // Also prove the migration supports a repository query before switching deployments.
    await client.query('SELECT id,revision,owner_consent,ST_X(location::geometry) FROM cctv_pins LIMIT 0');
    await client.query('COMMIT');
    console.log('CCTV database installation ready');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`CCTV installation stopped (${error.code || 'validation'}). Existing data was not reset.`);
    process.exitCode = 1;
  } finally { client.release(); await pool.end(); }
}
install().catch(() => { console.error('CCTV database is unreachable'); process.exitCode = 1; pool.end(); });
