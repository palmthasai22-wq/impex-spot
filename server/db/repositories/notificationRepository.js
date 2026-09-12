const { query } = require('../pool');

class NotificationRepository {
  async create({ userId, sessionId, type, title, body, data }) {
    const sql = `
      INSERT INTO notifications (user_id, session_id, type, title, body, data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const { rows } = await query(sql, [userId, sessionId, type, title, body, data]);
    return rows[0];
  }

  async list({ userId, sessionId, isRead, limit = 50, offset = 0 }) {
    let sql = 'SELECT * FROM notifications WHERE 1=1';
    const params = [];

    if (userId) {
      params.push(userId);
      sql += ` AND user_id = $${params.length}`;
    } else if (sessionId) {
      params.push(sessionId);
      sql += ` AND session_id = $${params.length}`;
    }

    if (isRead !== undefined) {
      params.push(isRead);
      sql += ` AND is_read = $${params.length}`;
    }

    params.push(limit);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    
    params.push(offset);
    sql += ` OFFSET $${params.length}`;

    const { rows } = await query(sql, params);
    return rows;
  }

  async markRead(id) {
    const sql = 'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *';
    const { rows } = await query(sql, [id]);
    return rows[0] || null;
  }

  async markAllRead(userId) {
    const sql = 'UPDATE notifications SET is_read = true WHERE user_id = $1 RETURNING *';
    const { rows } = await query(sql, [userId]);
    return rows;
  }

  async countUnread(userId) {
    const sql = 'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false';
    const { rows } = await query(sql, [userId]);
    return parseInt(rows[0].count, 10);
  }

  async delete(id) {
    const sql = 'DELETE FROM notifications WHERE id = $1 RETURNING *';
    const { rows } = await query(sql, [id]);
    return rows[0] || null;
  }
}

module.exports = new NotificationRepository();
