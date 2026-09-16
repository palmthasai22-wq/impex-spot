const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const db = require('../pool');
const { encrypt, decrypt } = require('../../services/cameraCrypto');
const { invalid } = require('../../services/cameraValidation');
const select = 'SELECT *, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng FROM cctv_pins';
const secretFields = ['camera_ip', 'rtsp_path', 'credentials'];

const dataFile = path.join(__dirname, '../../data/cameras.json');
function readCamerasFile() {
  if (process.env.CCTV_REQUIRE_DATABASE === 'true') throw new Error('CCTV requires its database');
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8')) || [];
  } catch {
    return [];
  }
}
function writeCamerasFile(cameras) {
  if (process.env.CCTV_REQUIRE_DATABASE === 'true') throw new Error('CCTV requires its database');
  try {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(cameras, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write cameras.json:', e);
  }
}

module.exports = {
  async list({ publicOnly = false, limit = 100, offset = 0 } = {}) {
    try {
      return (await db.query(`${select} ${publicOnly ? "WHERE owner_consent AND verification_status = 'verified'" : ''} ORDER BY created_at, id LIMIT $1 OFFSET $2`, [limit, offset])).rows;
    } catch {
      let cameras = readCamerasFile();
      if (publicOnly) {
        cameras = cameras.filter(c => c.owner_consent === true && c.verification_status === 'verified');
      }
      return cameras.slice(offset, offset + limit);
    }
  },
  async find(id) {
    try {
      return (await db.query(`${select} WHERE id = $1`, [id])).rows[0];
    } catch {
      return readCamerasFile().find(c => c.id === id);
    }
  },
  async save(id, body, adminId) {
    try {
      const client = await db.getClient();
      try {
        await client.query('BEGIN');
        let row;
        if (id) {
          row = (await client.query(`${select} WHERE id = $1 FOR UPDATE`, [id])).rows[0];
          if (!row) { await client.query('ROLLBACK'); return null; }
        } else {
          id = randomUUID();
          row = { coverage_direction: 0, verification_status: 'pending', owner_consent: false };
        }
        const next = { ...row, ...body };
        if (['camera_ip', 'rtsp_path', 'credentials', 'connection_type', 'owner_type'].some(k => k in body) && body.owner_consent !== true) next.owner_consent = false;
        if (next.verification_status !== 'verified') {
          if (body.owner_consent === true) invalid();
          next.owner_consent = false;
        }
        next.consent_confirmed_by = next.owner_consent ? (body.owner_consent === true ? adminId : row.consent_confirmed_by) : null;
        next.consent_confirmed_at = next.owner_consent ? (body.owner_consent === true ? new Date() : row.consent_confirmed_at) : null;
        for (const field of secretFields) {
          next[field] = field in body ? encrypt(body[field], `${id}:${field}`) : row[field];
        }
        if (!next.credentials) next.credentials = encrypt({ username: '', password: '', port: 554 }, `${id}:credentials`);
        const values = [id, next.lng, next.lat, next.coverage_direction, next.owner_type, next.connection_type, next.camera_ip, next.rtsp_path, next.credentials, next.verification_status, next.owner_consent, next.consent_confirmed_by, next.consent_confirmed_at];
        await client.query(`INSERT INTO cctv_pins (id, location, coverage_direction, owner_type, connection_type, camera_ip, rtsp_path, credentials, verification_status, owner_consent, consent_confirmed_by, consent_confirmed_at)
          VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3),4326)::geography, $4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
          ON CONFLICT (id) DO UPDATE SET location = EXCLUDED.location, coverage_direction = EXCLUDED.coverage_direction,
          owner_type = EXCLUDED.owner_type, connection_type = EXCLUDED.connection_type, camera_ip = EXCLUDED.camera_ip,
          rtsp_path = EXCLUDED.rtsp_path, credentials = EXCLUDED.credentials, verification_status = EXCLUDED.verification_status,
          owner_consent = EXCLUDED.owner_consent, consent_confirmed_by = EXCLUDED.consent_confirmed_by,
          consent_confirmed_at = EXCLUDED.consent_confirmed_at, status = 'offline', media_reset_required = TRUE, revision = cctv_pins.revision + 1, updated_at = NOW()`, values);
        const result = (await client.query(`${select} WHERE id = $1`, [id])).rows[0];
        await client.query('COMMIT');
        return result;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    } catch {
      // ── File storage fallback ──
      let cameras = readCamerasFile();
      let row;
      if (id) {
        row = cameras.find(c => c.id === id);
        if (!row) return null;
      } else {
        id = randomUUID();
        row = { coverage_direction: 0, verification_status: 'pending', owner_consent: false, status: 'offline', revision: 1, created_at: new Date().toISOString() };
      }
      const next = { ...row, ...body, id, lat: Number(body.lat ?? row.lat), lng: Number(body.lng ?? row.lng) };
      if (['camera_ip', 'rtsp_path', 'credentials', 'connection_type', 'owner_type'].some(k => k in body) && body.owner_consent !== true) next.owner_consent = false;
      if (next.verification_status !== 'verified') {
        if (body.owner_consent === true) invalid();
        next.owner_consent = false;
      }
      next.consent_confirmed_by = next.owner_consent ? (body.owner_consent === true ? adminId : row.consent_confirmed_by) : null;
      next.consent_confirmed_at = next.owner_consent ? (body.owner_consent === true ? new Date().toISOString() : row.consent_confirmed_at) : null;
      for (const field of secretFields) {
        next[field] = field in body ? encrypt(body[field], `${id}:${field}`) : row[field];
      }
      if (!next.credentials) next.credentials = encrypt({ username: '', password: '', port: 554 }, `${id}:credentials`);
      next.status = 'offline';
      next.media_reset_required = true;
      next.revision = (row.revision || 1) + 1;
      next.updated_at = new Date().toISOString();

      const idx = cameras.findIndex(c => c.id === id);
      if (idx >= 0) cameras[idx] = next;
      else cameras.push(next);
      writeCamerasFile(cameras);
      return next;
    }
  },
  async remove(id) {
    try {
      return (await db.query('DELETE FROM cctv_pins WHERE id = $1 RETURNING id', [id])).rowCount > 0;
    } catch {
      let cameras = readCamerasFile();
      const before = cameras.length;
      cameras = cameras.filter(c => c.id !== id);
      if (cameras.length === before) return false;
      writeCamerasFile(cameras);
      return true;
    }
  },
  async setHealth(id, status, version) {
    try {
      await db.query(`UPDATE cctv_pins SET status = CASE WHEN owner_consent AND verification_status = 'verified' THEN $2::cctv_status ELSE 'offline'::cctv_status END, last_health_check_at = NOW() WHERE id = $1 AND revision = $3`, [id, status, version]);
    } catch {
      let cameras = readCamerasFile();
      const c = cameras.find(x => x.id === id);
      if (c && c.revision === version) {
        c.status = (c.owner_consent && c.verification_status === 'verified') ? status : 'offline';
        c.last_health_check_at = new Date().toISOString();
        writeCamerasFile(cameras);
      }
    }
  },
  async clearMediaReset(id, version) {
    try {
      await db.query('UPDATE cctv_pins SET media_reset_required=FALSE WHERE id=$1 AND revision=$2', [id, version]);
    } catch {
      let cameras = readCamerasFile();
      const c = cameras.find(x => x.id === id);
      if (c && c.revision === version) {
        c.media_reset_required = false;
        writeCamerasFile(cameras);
      }
    }
  },
  async pair(id, hash) {
    try {
      return (await db.query("UPDATE cctv_pins SET relay_token_hash=$2, status='offline', discovery_requested=TRUE, media_reset_required=TRUE, revision=revision+1, updated_at=NOW() WHERE id=$1 RETURNING id", [id, hash])).rowCount > 0;
    } catch {
      let cameras = readCamerasFile();
      const c = cameras.find(x => x.id === id);
      if (!c) return false;
      c.relay_token_hash = hash;
      c.status = 'offline';
      c.discovery_requested = true;
      c.media_reset_required = true;
      c.revision = (c.revision || 1) + 1;
      c.updated_at = new Date().toISOString();
      writeCamerasFile(cameras);
      return true;
    }
  },
  async heartbeat(id) {
    try {
      await db.query('UPDATE cctv_pins SET relay_last_seen_at=NOW() WHERE id=$1', [id]);
    } catch {
      let cameras = readCamerasFile();
      const c = cameras.find(x => x.id === id);
      if (c) {
        c.relay_last_seen_at = new Date().toISOString();
        writeCamerasFile(cameras);
      }
    }
  },
  async requestDiscovery(id) {
    try {
      await db.query('UPDATE cctv_pins SET discovery_requested=TRUE WHERE id=$1', [id]);
    } catch {
      let cameras = readCamerasFile();
      const c = cameras.find(x => x.id === id);
      if (c) {
        c.discovery_requested = true;
        writeCamerasFile(cameras);
      }
    }
  },
  async reportDiscovery(id, devices) {
    try {
      await db.query('UPDATE cctv_pins SET discovery_devices=$2, discovery_requested=FALSE, discovery_updated_at=NOW() WHERE id=$1', [id, encrypt(devices, `${id}:discovery`)]);
    } catch {
      let cameras = readCamerasFile();
      const c = cameras.find(x => x.id === id);
      if (c) {
        c.discovery_devices = encrypt(devices, `${id}:discovery`);
        c.discovery_requested = false;
        c.discovery_updated_at = new Date().toISOString();
        writeCamerasFile(cameras);
      }
    }
  },
  discovery(row) { return row.discovery_devices ? decrypt(row.discovery_devices, `${row.id}:discovery`) : []; },
};
