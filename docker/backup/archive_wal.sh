#!/bin/bash
set -euo pipefail

WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/backups/wal}"
S3_BUCKET="${S3_BUCKET:-}"
REMOTE_WAL_PATH="${REMOTE_WAL_PATH:-wal}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WAL archive: $1"
}

log "Archive command called with: $1 (WAL file path)"

WAL_FILE="$1"

mkdir -p "$WAL_ARCHIVE_DIR"

if cp "$WAL_FILE" "${WAL_ARCHIVE_DIR}/$(basename "$WAL_FILE")"; then
    log "WAL file archived locally: $(basename "$WAL_FILE")"
    
    if [ -n "$S3_BUCKET" ]; then
        if aws s3 cp "$WAL_FILE" "s3://${S3_BUCKET}/${REMOTE_WAL_PATH}/$(basename "$WAL_FILE")"; then
            log "WAL file uploaded to S3: $(basename "$WAL_FILE")"
        else
            log "WARNING: Failed to upload WAL to S3, but local copy exists"
        fi
    fi
    
    exit 0
else
    log "ERROR: Failed to archive WAL file"
    exit 1
fi
