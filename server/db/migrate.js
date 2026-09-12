const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function runMigrations() {
  const client = await pool.connect();
  try {
    // Create migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Get applied migrations
    const { rows } = await client.query('SELECT version FROM schema_migrations ORDER BY version ASC');
    const appliedMigrations = rows.map(r => r.version);

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // ensures chronological order assuming prefixes like 001_, 002_

    console.log('Running migrations...');

    let appliedCount = 0;
    for (const file of files) {
      if (!appliedMigrations.includes(file)) {
        console.log(`Applying migration: ${file}`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        // Execute in transaction
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`Successfully applied ${file}`);
          appliedCount++;
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`Error applying migration ${file}:`, error);
          throw error;
        }
      }
    }

    if (appliedCount === 0) {
      console.log('Database is already up to date.');
    } else {
      console.log(`Successfully applied ${appliedCount} migration(s).`);
    }

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

const command = process.argv[2];

if (command === 'status') {
  // Logic for status can be added here
  console.log('Status command not fully implemented in this script. Running up instead if no command is specified.');
  pool.end();
} else {
  runMigrations();
}
