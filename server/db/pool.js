const { Pool } = require('pg');
require('dotenv').config();

// Determine connection settings
const config = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

if (process.env.DATABASE_URL) {
  config.connectionString = process.env.DATABASE_URL;
} else {
  config.host = process.env.DB_HOST || 'localhost';
  config.port = parseInt(process.env.DB_PORT || '5432', 10);
  config.database = process.env.DB_NAME || 'ruthan_db';
  config.user = process.env.DB_USER || 'postgres';
  config.password = process.env.DB_PASSWORD || 'postgres';
}

if (process.env.DB_SSL === 'true') {
  config.ssl = {
    rejectUnauthorized: false
  };
}

const pool = new Pool(config);

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  pool,
  /**
   * Helper function to execute a query
   * @param {string} text - SQL query text
   * @param {Array} params - Array of parameter values
   * @returns {Promise<import('pg').QueryResult>} Query result
   */
  query: (text, params) => pool.query(text, params),
  
  /**
   * Get a client for transaction blocks
   * @returns {Promise<import('pg').PoolClient>} A database client
   */
  getClient: () => pool.connect(),
  
  /**
   * Runs a health check on the database
   * @returns {Promise<boolean>} true if database is healthy
   */
  healthCheck: async () => {
    try {
      const res = await pool.query('SELECT 1');
      return res.rowCount === 1;
    } catch (err) {
      console.error('Database health check failed:', err);
      return false;
    }
  }
};
