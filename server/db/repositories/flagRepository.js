const { query } = require('../pool');

class FlagRepository {
  async list({ status = 'pending', limit = 50, offset = 0 }) {
    const sql = 'SELECT * FROM flags WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    const { rows } = await query(sql, [status, limit, offset]);
    return rows;
  }

  async findById(id) {
    const { rows } = await query('SELECT * FROM flags WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async create({ targetType, targetId, reason, details, sessionId }) {
    const sql = `
      INSERT INTO flags (target_type, target_id, reason, details, session_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const { rows } = await query(sql, [targetType, targetId, reason, details, sessionId]);
    return rows[0];
  }

  async resolve(id, { status, reviewedBy }) {
    const sql = `
      UPDATE flags 
      SET status = $1, reviewed_by = $2, resolved_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const { rows } = await query(sql, [status, reviewedBy, id]);
    return rows[0] || null;
  }

  async countPending() {
    const sql = "SELECT COUNT(*) FROM flags WHERE status = 'pending'";
    const { rows } = await query(sql);
    return parseInt(rows[0].count, 10);
  }
}

module.exports = new FlagRepository();
