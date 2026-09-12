const { query } = require('../pool');

class CategoryRepository {
  async list({ groupName, activeOnly = true }) {
    let sql = 'SELECT * FROM categories';
    const params = [];
    const conditions = [];

    if (activeOnly) {
      conditions.push('is_active = true');
    }
    if (groupName) {
      conditions.push(`group_name = $${params.length + 1}`);
      params.push(groupName);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY sort_order ASC, name ASC';

    const { rows } = await query(sql, params);
    return rows;
  }

  async findById(id) {
    const { rows } = await query('SELECT * FROM categories WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async create(data) {
    const { name, groupName, icon, color, sortOrder } = data;
    const sql = `
      INSERT INTO categories (name, group_name, icon, color, sort_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const { rows } = await query(sql, [name, groupName, icon, color, sortOrder]);
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
    
    const sql = `UPDATE categories SET ${setFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const { rows } = await query(sql, params);
    return rows[0] || null;
  }

  async delete(id) {
    return this.update(id, { is_active: false });
  }
}

module.exports = new CategoryRepository();
