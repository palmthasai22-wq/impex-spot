const { query } = require('../pool');

class AnonymousSessionRepository {
  async findOrCreate(sessionId, { ipAddress, userAgent }) {
    const sql = `
      INSERT INTO anonymous_sessions (session_id, ip_address, user_agent, last_seen_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (session_id) DO UPDATE 
      SET last_seen_at = NOW(),
          ip_address = EXCLUDED.ip_address,
          user_agent = EXCLUDED.user_agent
      RETURNING *
    `;
    const { rows } = await query(sql, [sessionId, ipAddress, userAgent]);
    return rows[0];
  }
}

module.exports = new AnonymousSessionRepository();
