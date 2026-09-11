const command = process.argv[2] || 'status';
if (command === 'status') {
  console.log('JSON persistence is active; no PostgreSQL migrations are required.');
} else if (command === 'up') {
  console.log('No database migrations to apply.');
} else {
  console.error(`Unknown migration command: ${command}`);
  process.exitCode = 1;
}
