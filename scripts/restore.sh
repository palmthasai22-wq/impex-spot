#!/bin/bash
# Usage: ./scripts/restore.sh <backup_file.sql.gz>
set -euo pipefail
if [ -z "${1:-}" ]; then echo "Usage: $0 <backup_file.sql.gz>"; exit 1; fi
echo "Restoring from: $1"
gunzip -c "$1" | psql "${DATABASE_URL}"
echo "Restore complete."
