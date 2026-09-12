const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

async function seedAdmin() {
  const client = await pool.connect();
  try {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || '123456';
    
    // Check if user already exists
    const checkRes = await client.query('SELECT id FROM users WHERE username = $1', [adminUsername]);
    
    if (checkRes.rows.length === 0) {
      console.log(`Creating default admin user: ${adminUsername}`);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      
      await client.query(
        `INSERT INTO users (username, password_hash, display_name, role) 
         VALUES ($1, $2, $3, 'admin')`,
        [adminUsername, hashedPassword, 'System Administrator']
      );
      
      console.log('Admin user created successfully.');
    } else {
      console.log(`Admin user '${adminUsername}' already exists. Skipping.`);
    }
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seedAdmin();
