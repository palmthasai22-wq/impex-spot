const { query, getClient } = require('../pool');

class IncidentRepository {
  async list({ bounds, status = 'active', type, dispatchStatus, limit = 50, offset = 0 }) {
    let sql = 'SELECT * FROM incidents WHERE status = $1';
    const params = [status];
    let paramCount = 1;

    if (type) {
      paramCount++;
      sql += ` AND type = $${paramCount}`;
      params.push(type);
    }

    if (dispatchStatus) {
      paramCount++;
      sql += ` AND dispatch_status = $${paramCount}`;
      params.push(dispatchStatus);
    }

    if (bounds) {
      const { minLng, minLat, maxLng, maxLat } = bounds;
      paramCount++;
      const paramStart = paramCount;
      paramCount += 3;
      sql += ` AND location && ST_MakeEnvelope($${paramStart}, $${paramStart + 1}, $${paramStart + 2}, $${paramStart + 3}, 4326)`;
      params.push(minLng, minLat, maxLng, maxLat);
    }

    paramCount++;
    sql += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(offset);

    const { rows } = await query(sql, params);
    return rows;
  }

  async findById(id) {
    const { rows } = await query('SELECT * FROM incidents WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async create(data) {
    const { type, title, description, lng, lat, createdBy, expiresAt } = data;
    const sql = `
      INSERT INTO incidents (type, title, description, location, created_by, expires_at)
      VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6, $7)
      RETURNING *
    `;
    const params = [type, title, description, lng, lat, createdBy, expiresAt];
    const { rows } = await query(sql, params);
    return rows[0];
  }

  async update(id, changes) {
    if (Object.keys(changes).length === 0) return this.findById(id);
    const setFields = [];
    const params = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(changes)) {
      setFields.push(`${key} = $${paramCount}`);
      params.push(value);
      paramCount++;
    }
    params.push(id);
    
    const sql = `UPDATE incidents SET ${setFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const { rows } = await query(sql, params);
    return rows[0] || null;
  }

  async updateDispatch(id, { dispatchStatus, responderId }) {
    return this.update(id, { dispatch_status: dispatchStatus, responder_id: responderId });
  }

  async updateTraffic(id, { trafficStatus, trafficNote }) {
    return this.update(id, { traffic_status: trafficStatus, traffic_note: trafficNote });
  }

  async remove(id) {
    return this.update(id, { status: 'deleted' });
  }

  async expire(id) {
    return this.update(id, { status: 'expired' });
  }

  async findExpired() {
    const sql = 'SELECT * FROM incidents WHERE expires_at < NOW() AND status = $1';
    const { rows } = await query(sql, ['active']);
    return rows;
  }

  async verify(id, sessionId) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const checkSql = 'SELECT 1 FROM verifications WHERE target_type = $1 AND target_id = $2 AND session_id = $3';
      const { rowCount } = await client.query(checkSql, ['incident', id, sessionId]);
      
      if (rowCount === 0) {
        await client.query('INSERT INTO verifications (target_type, target_id, session_id) VALUES ($1, $2, $3)', ['incident', id, sessionId]);
        await client.query('UPDATE incidents SET confidence_score = confidence_score + 1 WHERE id = $1', [id]);
      }
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listEmergencies({ active = true }) {
    const status = active ? 'active' : 'resolved';
    const sql = "SELECT * FROM incidents WHERE type = 'emergency' AND status = $1 ORDER BY created_at DESC";
    const { rows } = await query(sql, [status]);
    return rows;
  }

  async listTraffic({ active = true }) {
    const status = active ? 'active' : 'resolved';
    const sql = "SELECT * FROM incidents WHERE type = 'traffic' AND status = $1 ORDER BY created_at DESC";
    const { rows } = await query(sql, [status]);
    return rows;
  }
}

module.exports = new IncidentRepository();
