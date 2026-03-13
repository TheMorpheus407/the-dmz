#!/bin/bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
S3_BUCKET="${S3_BUCKET:-}"

OUTPUT_FILE="${BACKUP_DIR}/backup_status.json"

log_backup_status() {
    local latest_backup age_hours backup_count wal_count status="success"
    
    latest_backup=$(ls -t "${BACKUP_DIR}"/backup_*.dump 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        echo "{\"status\": \"no_backup\", \"latest_backup_age_hours\": -1, \"backup_count\": 0, \"wal_count\": 0}"
        return
    fi
    
    backup_count=$(ls -1 "${BACKUP_DIR}"/backup_*.dump 2>/dev/null | wc -l)
    wal_count=$(ls -1 "${BACKUP_DIR}"/wal/ 2>/dev/null | wc -l)
    
    local now
    now=$(date +%s)
    local backup_epoch
    backup_epoch=$(stat -c%Y "$latest_backup" 2>/dev/null || stat -f%m "$latest_backup")
    local age_seconds=$((now - backup_epoch))
    age_hours=$((age_seconds / 3600))
    
    if [ "$age_hours" -gt 25 ]; then
        status="warning"
    fi
    
    if [ "$age_hours" -gt 48 ]; then
        status="error"
    fi
    
    echo "{\"status\": \"${status}\", \"latest_backup\": \"$(basename "$latest_backup")\", \"latest_backup_age_hours\": ${age_hours}, \"backup_count\": ${backup_count}, \"wal_count\": ${wal_count}}"
}

log_backup_status > "$OUTPUT_FILE"

cat "$OUTPUT_FILE"
