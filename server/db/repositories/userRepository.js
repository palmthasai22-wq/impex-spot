const { query } = require('../pool');
const bcrypt = require('bcryptjs');

class UserRepository {
  async list({ role, isActive, limit = 50, offset = 0 }) {
    let sql = 'SELECT id, username, display_name, email, role, is_active, created_at, last_login_at FROM users';
    const params = [];
    const conditions = [];

    if (role) {
      conditions.push(`role = $${params.length + 1}`);
      params.push(role);
    }
    if (isActive !== undefined) {
      conditions.push(`is_active = $${params.length + 1}`);
      params.push(isActive);
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
    const sql = 'SELECT id, username, display_name, email, role, is_active, created_at, last_login_at FROM users WHERE id = $1';
    const { rows } = await query(sql, [id]);
    return rows[0] || null;
  }

  async findByUsername(username) {
    const sql = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
    const { rows } = await query(sql, [username]);
    return rows[0] || null;
  }

  async create({ username, password, displayName, email, role = 'moderator' }) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const sql = `
      INSERT INTO users (username, password_hash, display_name, email, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, display_name, email, role, is_active, created_at
    `;
    const { rows } = await query(sql, [username, passwordHash, displayName, email, role]);
    return rows[0];
  }

  async update(id, changes) {
    if (Object.keys(changes).length === 0) return this.findById(id);
    
    const setFields = [];
    const params = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(changes)) {
      if (key === 'password') {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(value, salt);
        setFields.push(`password_hash = $${paramCount}`);
        params.push(hash);
      } else {
        setFields.push(`${key} = $${paramCount}`);
        params.push(value);
      }
      paramCount++;
    }
    params.push(id);
    
    const sql = `UPDATE users SET ${setFields.join(', ')} WHERE id = $${paramCount} RETURNING id, username, display_name, email, role, is_active`;
    const { rows } = await query(sql, params);
    return rows[0] || null;
  }

  async delete(id) {
    return this.update(id, { is_active: false });
  }

  async verifyPassword(user, password) {
    if (!user || !user.password_hash) return false;
    return bcrypt.compare(password, user.password_hash);
  }

  async getPermissions(userId) {
    const user = await this.findById(userId);
    if (!user) return [];
    
    // Simple role-based permissions mapping
    const rolePermissions = {
      admin: ['manage_users', 'manage_settings', 'manage_categories', 'moderate_content', 'view_audit_logs'],
      moderator: ['moderate_content', 'view_reports']
    };
    
    return rolePermissions[user.role] || [];
  }
}

module.exports = new UserRepository();
