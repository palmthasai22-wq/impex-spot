#!/bin/bash
# Usage: ./scripts/backup.sh
set -euo pipefail
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_DIR}/impex_spot_${TIMESTAMP}.sql.gz"
echo "Backup created: ${BACKUP_DIR}/impex_spot_${TIMESTAMP}.sql.gz"
# Keep only last 7 backups
ls -tp "${BACKUP_DIR}"/*.sql.gz | tail -n +8 | xargs -r rm --
echo "Old backups cleaned up."
