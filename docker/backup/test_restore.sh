#!/bin/bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
TEST_DATABASE_NAME="${TEST_DATABASE_NAME:-dmz_test}"
DATABASE_HOST="${DATABASE_HOST:-localhost}"
DATABASE_PORT="${DATABASE_PORT:-5432}"
DATABASE_USER="${DATABASE_USER:-dmz}"

LOG_FILE="${BACKUP_DIR}/backup_test.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting backup restoration test..."

LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/backup_*.dump 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    log "ERROR: No backup files found in $BACKUP_DIR"
    exit 1
fi

log "Testing backup: $LATEST_BACKUP"

BACKUP_SIZE=$(stat -f%z "$LATEST_BACKUP" 2>/dev/null || stat -c%s "$LATEST_BACKUP")
if [ "$BACKUP_SIZE" -lt 1024 ]; then
    log "ERROR: Backup file too small (${BACKUP_SIZE} bytes), likely corrupted"
    exit 1
fi

log "Backup file size: $BACKUP_SIZE bytes (appears valid)"

if pg_restore -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$TEST_DATABASE_NAME" --clean --if-exists "$LATEST_BACKUP" 2>&1 | tee -a "$LOG_FILE"; then
    log "Backup restoration test PASSED"
    
    if psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$TEST_DATABASE_NAME" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | grep -qE '^[0-9]+$'; then
        log "Database schema verified"
    fi
    
    log "Backup test completed successfully"
    exit 0
else
    log "ERROR: Backup restoration test FAILED"
    exit 1
fi
