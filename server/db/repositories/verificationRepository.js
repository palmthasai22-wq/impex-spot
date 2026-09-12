const { query } = require('../pool');

class VerificationRepository {
  async create({ targetType, targetId, sessionId }) {
    try {
      const sql = `
        INSERT INTO verifications (target_type, target_id, session_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (target_type, target_id, session_id) DO NOTHING
        RETURNING *
      `;
      const { rows } = await query(sql, [targetType, targetId, sessionId]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async countByTarget(targetType, targetId) {
    const sql = 'SELECT COUNT(*) FROM verifications WHERE target_type = $1 AND target_id = $2';
    const { rows } = await query(sql, [targetType, targetId]);
    return parseInt(rows[0].count, 10);
  }

  async hasVerified(targetType, targetId, sessionId) {
    const sql = 'SELECT 1 FROM verifications WHERE target_type = $1 AND target_id = $2 AND session_id = $3';
    const { rows } = await query(sql, [targetType, targetId, sessionId]);
    return rows.length > 0;
  }
}

module.exports = new VerificationRepository();
