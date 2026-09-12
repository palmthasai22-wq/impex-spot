const { query } = require('../pool');

class ResponderRepository {
  async list() {
    const sql = 'SELECT * FROM responders ORDER BY name ASC';
    const { rows } = await query(sql);
    return rows;
  }

  async findById(id) {
    const { rows } = await query('SELECT * FROM responders WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async create({ name, team, phone }) {
    const sql = `
      INSERT INTO responders (name, team, phone)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const { rows } = await query(sql, [name, team, phone]);
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
    
    const sql = `UPDATE responders SET ${setFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const { rows } = await query(sql, params);
    return rows[0] || null;
  }

  async updateLocation(id, { lat, lng }) {
    const sql = `
      UPDATE responders 
      SET last_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, last_location_updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const { rows } = await query(sql, [lng, lat, id]);
    return rows[0] || null;
  }

  async delete(id) {
    const { rows } = await query('DELETE FROM responders WHERE id = $1 RETURNING *', [id]);
    return rows[0] || null;
  }
}

module.exports = new ResponderRepository();
