const { pool } = require('./pool');
const { execSync } = require('child_process');
const path = require('path');

const isConfirm = process.argv.includes('--confirm');

if (!isConfirm) {
  console.error('\x1b[31m%s\x1b[0m', 'ERROR: This action will DROP ALL TABLES.');
  console.error('To proceed, run this script with the --confirm flag:');
  console.error('node reset.js --confirm');
  process.exit(1);
}

async function resetDb() {
  const client = await pool.connect();
  try {
    console.log('Resetting database...');
    
    // Drop all tables
    const { rows } = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `);
    
    if (rows.length > 0) {
      await client.query('BEGIN');
      try {
        for (const row of rows) {
          console.log(`Dropping table ${row.tablename}...`);
          await client.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
        }
        await client.query('COMMIT');
        console.log('All tables dropped successfully.');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    } else {
      console.log('No tables to drop.');
    }
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', 'Database reset failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
  
  try {
    // Run migrations and seeds
    console.log('Running migrations...');
    execSync('node ' + path.join(__dirname, 'migrate.js'), { stdio: 'inherit' });
    
    console.log('Running seed...');
    execSync('node ' + path.join(__dirname, 'seed.js'), { stdio: 'inherit' });
    
    console.log('\x1b[32m%s\x1b[0m', 'Database reset completed successfully.');
  } catch(err) {
    console.error('Error running migrations or seeds:', err);
  }
}

resetDb();
