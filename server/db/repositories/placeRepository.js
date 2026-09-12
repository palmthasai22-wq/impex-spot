const { query, getClient } = require('../pool');

class PlaceRepository {
  /**
   * List places with filters and pagination
   */
  async list({ bounds, category, status = 'active', verified, search, limit = 50, offset = 0 }) {
    let sql = 'SELECT * FROM places WHERE status = $1';
    const params = [status];
    let paramCount = 1;

    if (category) {
      paramCount++;
      sql += ` AND category = $${paramCount}`;
      params.push(category);
    }
    
    if (verified !== undefined) {
      paramCount++;
      sql += ` AND is_verified = $${paramCount}`;
      params.push(verified);
    }

    if (search) {
      paramCount++;
      sql += ` AND title ILIKE $${paramCount}`;
      params.push(`%${search}%`);
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
    const sql = `
      SELECT p.*, 
        (SELECT COUNT(*) FROM reviews WHERE place_id = p.id) as review_count,
        (SELECT COUNT(*) FROM verifications WHERE target_id = p.id AND target_type = 'place') as verification_count
      FROM places p
      WHERE p.id = $1
    `;
    const { rows } = await query(sql, [id]);
    return rows[0] || null;
  }

  async create(data) {
    const { title, description, category, lng, lat, createdBy, expiresAt } = data;
    const sql = `
      INSERT INTO places (title, description, category, location, created_by, expires_at)
      VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6, $7)
      RETURNING *
    `;
    const params = [title, description, category, lng, lat, createdBy, expiresAt];
    const { rows } = await query(sql, params);
    return rows[0];
  }

  async update(id, changes) {
    const setFields = [];
    const params = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(changes)) {
      setFields.push(`${key} = $${paramCount}`);
      params.push(value);
      paramCount++;
    }
    params.push(id);
    
    const sql = `UPDATE places SET ${setFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const { rows } = await query(sql, params);
    return rows[0] || null;
  }

  async remove(id) {
    return this.update(id, { status: 'deleted' });
  }

  async expire(id) {
    return this.update(id, { status: 'expired' });
  }

  async verify(id, sessionId) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      const checkSql = 'SELECT 1 FROM verifications WHERE target_type = $1 AND target_id = $2 AND session_id = $3';
      const { rowCount } = await client.query(checkSql, ['place', id, sessionId]);
      
      if (rowCount === 0) {
        await client.query(
          'INSERT INTO verifications (target_type, target_id, session_id) VALUES ($1, $2, $3)',
          ['place', id, sessionId]
        );
        
        await client.query(
          'UPDATE places SET confidence_score = confidence_score + 1 WHERE id = $1',
          [id]
        );
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

  async findExpired() {
    const sql = 'SELECT * FROM places WHERE expires_at < NOW() AND status = $1';
    const { rows } = await query(sql, ['active']);
    return rows;
  }

  async countByCategory() {
    const sql = 'SELECT category, COUNT(*) as count FROM places WHERE status = $1 GROUP BY category';
    const { rows } = await query(sql, ['active']);
    return rows;
  }

  async nearby(lat, lng, radiusMeters, limit = 50) {
    const sql = `
      SELECT *, ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance
      FROM places
      WHERE status = 'active' AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
      ORDER BY distance
      LIMIT $4
    `;
    const { rows } = await query(sql, [lng, lat, radiusMeters, limit]);
    return rows;
  }
}

module.exports = new PlaceRepository();
