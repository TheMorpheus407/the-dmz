#!/bin/bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
S3_BUCKET="${S3_BUCKET:-}"
DATABASE_HOST="${DATABASE_HOST:-localhost}"
DATABASE_PORT="${DATABASE_PORT:-5432}"
DATABASE_NAME="${DATABASE_NAME:-dmz_dev}"
DATABASE_USER="${DATABASE_USER:-dmz}"
DROP_BEFORE_RESTORE="${DROP_BEFORE_RESTORE:-false}"

LOG_FILE="${BACKUP_DIR}/restore.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

usage() {
    echo "Usage: $0 <backup_file> [--drop-before-restore]"
    echo ""
    echo "Arguments:"
    echo "  backup_file          Path to the backup file (local or S3 URL)"
    echo "  --drop-before-restore  Drop all objects before restore (optional)"
    echo ""
    echo "Environment variables:"
    echo "  BACKUP_DIR           Local backup directory (default: /backups)"
    echo "  S3_BUCKET            S3 bucket for backups"
    echo "  DATABASE_HOST        Database host (default: localhost)"
    echo "  DATABASE_PORT        Database port (default: 5432)"
    echo "  DATABASE_NAME        Database name (default: dmz_dev)"
    echo "  DATABASE_USER        Database user (default: dmz)"
    exit 1
}

if [ $# -lt 1 ]; then
    usage
fi

BACKUP_FILE="$1"
shift

while [ $# -gt 0 ]; do
    case "$1" in
        --drop-before-restore)
            DROP_BEFORE_RESTORE="true"
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
    shift
done

log "Starting PostgreSQL restore..."

TEMP_FILE=""
if [[ "$BACKUP_FILE" == s3://* ]]; then
    if [ -z "$S3_BUCKET" ]; then
        log "ERROR: S3_BUCKET not set for S3 backup restore"
        exit 1
    fi
    
    log "Downloading backup from S3: $BACKUP_FILE"
    TEMP_FILE=$(mktemp "${BACKUP_DIR}/restore_XXXXXX.dump")
    if ! aws s3 cp "$BACKUP_FILE" "$TEMP_FILE"; then
        log "ERROR: Failed to download backup from S3"
        rm -f "$TEMP_FILE"
        exit 1
    fi
    BACKUP_FILE="$TEMP_FILE"
elif [ ! -f "$BACKUP_FILE" ]; then
    log "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

if [ "$DROP_BEFORE_RESTORE" = "true" ]; then
    log "Dropping all objects before restore..."
    psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>/dev/null || true
fi

log "Restoring database from: $BACKUP_FILE"

if pg_restore -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" --clean --if-exists "$BACKUP_FILE"; then
    log "Database restored successfully"
else
    log "ERROR: Restore failed"
    [ -n "$TEMP_FILE" ] && rm -f "$TEMP_FILE"
    exit 1
fi

[ -n "$TEMP_FILE" ] && rm -f "$TEMP_FILE"

log "Restore completed successfully"
exit 0
