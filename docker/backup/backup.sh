#!/bin/bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
S3_BUCKET="${S3_BUCKET:-}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATABASE_HOST="${DATABASE_HOST:-localhost}"
DATABASE_PORT="${DATABASE_PORT:-5432}"
DATABASE_NAME="${DATABASE_NAME:-dmz_dev}"
DATABASE_USER="${DATABASE_USER:-dmz}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

LOG_FILE="${BACKUP_DIR}/backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting PostgreSQL backup..."

mkdir -p "$BACKUP_DIR"

if pg_dump -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -Fc -f "${BACKUP_PATH}.dump" "$DATABASE_NAME"; then
    log "Backup created successfully: ${BACKUP_PATH}.dump"
    
    BACKUP_SIZE=$(du -h "${BACKUP_PATH}.dump" | cut -f1)
    log "Backup size: $BACKUP_SIZE"
    
    if [ -n "$S3_BUCKET" ]; then
        log "Uploading backup to S3: s3://${S3_BUCKET}/backups/${BACKUP_NAME}.dump"
        if aws s3 cp "${BACKUP_PATH}.dump" "s3://${S3_BUCKET}/backups/${BACKUP_NAME}.dump"; then
            log "Backup uploaded to S3 successfully"
        else
            log "ERROR: Failed to upload backup to S3"
            exit 1
        fi
    fi
    
    log "Backup completed successfully"
    exit 0
else
    log "ERROR: Backup failed"
    exit 1
fi
