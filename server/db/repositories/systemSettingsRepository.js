const { query } = require('../pool');

class SystemSettingsRepository {
  async get(key) {
    const { rows } = await query('SELECT value FROM system_settings WHERE key = $1', [key]);
    return rows[0] ? rows[0].value : null;
  }

  async set(key, value, { description = '', updatedBy }) {
    const sql = `
      INSERT INTO system_settings (key, value, description, updated_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (key) DO UPDATE 
      SET value = EXCLUDED.value,
          description = EXCLUDED.description,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      RETURNING *
    `;
    const { rows } = await query(sql, [key, value, description, updatedBy]);
    return rows[0];
  }

  async list() {
    const { rows } = await query('SELECT * FROM system_settings ORDER BY key ASC');
    return rows;
  }

  async delete(key) {
    const { rows } = await query('DELETE FROM system_settings WHERE key = $1 RETURNING *', [key]);
    return rows[0] || null;
  }
}

module.exports = new SystemSettingsRepository();
