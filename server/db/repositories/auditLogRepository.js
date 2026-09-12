const { query } = require('../pool');

class AuditLogRepository {
  async create({ actorId, actorUsername, action, targetType, targetId, beforeData, afterData, requestId, ipAddress, userAgent }) {
    const sql = `
      INSERT INTO audit_logs (actor_id, actor_username, action, target_type, target_id, before_data, after_data, request_id, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const params = [actorId, actorUsername, action, targetType, targetId, beforeData, afterData, requestId, ipAddress, userAgent];
    const { rows } = await query(sql, params);
    return rows[0];
  }

  async list({ actorId, action, targetType, dateFrom, dateTo, limit = 50, offset = 0 }) {
    let sql = 'SELECT * FROM audit_logs';
    const params = [];
    const conditions = [];

    if (actorId) {
      conditions.push(`actor_id = $${params.length + 1}`);
      params.push(actorId);
    }
    if (action) {
      conditions.push(`action = $${params.length + 1}`);
      params.push(action);
    }
    if (targetType) {
      conditions.push(`target_type = $${params.length + 1}`);
      params.push(targetType);
    }
    if (dateFrom) {
      conditions.push(`created_at >= $${params.length + 1}`);
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push(`created_at <= $${params.length + 1}`);
      params.push(dateTo);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);
    return rows;
  }

  async findById(id) {
    const { rows } = await query('SELECT * FROM audit_logs WHERE id = $1', [id]);
    return rows[0] || null;
  }
}

module.exports = new AuditLogRepository();
