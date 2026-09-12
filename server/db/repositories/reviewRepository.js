const { query, getClient } = require('../pool');

class ReviewRepository {
  async list({ placeId, limit = 50, offset = 0 }) {
    const sql = `
      SELECT * FROM reviews 
      WHERE place_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const { rows } = await query(sql, [placeId, limit, offset]);
    return rows;
  }

  async findById(id) {
    const { rows } = await query('SELECT * FROM reviews WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async create({ placeId, title, rating, comment, sessionId }) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      const insertSql = `
        INSERT INTO reviews (place_id, title, rating, comment, session_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const { rows } = await client.query(insertSql, [placeId, title, rating, comment, sessionId]);
      const newReview = rows[0];

      // Update place average rating
      const avgSql = `
        UPDATE places 
        SET average_rating = (SELECT AVG(rating)::numeric(3,2) FROM reviews WHERE place_id = $1)
        WHERE id = $1
      `;
      await client.query(avgSql, [placeId]);

      await client.query('COMMIT');
      return newReview;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id) {
    const { rows: reviewRows } = await query('SELECT place_id FROM reviews WHERE id = $1', [id]);
    if (reviewRows.length === 0) return false;
    
    const placeId = reviewRows[0].place_id;
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM reviews WHERE id = $1', [id]);
      
      const avgSql = `
        UPDATE places 
        SET average_rating = COALESCE((SELECT AVG(rating)::numeric(3,2) FROM reviews WHERE place_id = $1), 0)
        WHERE id = $1
      `;
      await client.query(avgSql, [placeId]);
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAverageRating(placeId) {
    const sql = 'SELECT AVG(rating) as avg_rating FROM reviews WHERE place_id = $1';
    const { rows } = await query(sql, [placeId]);
    return rows[0] ? parseFloat(rows[0].avg_rating) : 0;
  }
}

module.exports = new ReviewRepository();
