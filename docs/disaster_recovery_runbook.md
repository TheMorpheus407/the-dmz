# Disaster Recovery Runbook

> **Issue:** #186 — M5-08: Disaster Recovery with PostgreSQL Backups, PITR, and Backup Testing
> **Last Updated:** 2026-03-13
> **Maintainer:** Platform Team

---

## Table of Contents

1. [Overview](#overview)
2. [Recovery Objectives](#recovery-objectives)
3. [Backup Strategy](#backup-strategy)
4. [Recovery Procedures](#recovery-procedures)
5. [Point-in-Time Recovery (PITR)](#point-in-time-recovery-pitr)
6. [Testing Procedures](#testing-procedures)
7. [Alert Response](#alert-response)
8. [Emergency Contacts](#emergency-contacts)

---

## Overview

This runbook documents disaster recovery procedures for The DMZ: Archive Gate platform, specifically covering PostgreSQL database backup and recovery operations.

### Scope

- PostgreSQL 16 database backups
- Write-Ahead Log (WAL) archiving for Point-in-Time Recovery
- Backup verification and testing procedures

### Out of Scope

- Application-level recovery (covered in separate runbooks)
- Infrastructure provisioning (covered in Terraform/IaC)
- Network-level disasters

---

## Recovery Objectives

### Recovery Time Objective (RTO)

**Target:** < 4 hours

This is the maximum acceptable time to restore service after a disaster.

### Recovery Point Objective (RPO)

**Target:** < 24 hours

This is the maximum acceptable data loss measured in time:

- Daily full backups: Up to 24 hours of data loss
- WAL archiving: Potential for sub-minute RPO when properly configured

---

## Backup Strategy

### Backup Types

| Type           | Frequency          | Retention | Purpose                         |
| -------------- | ------------------ | --------- | ------------------------------- |
| Full (pg_dump) | Daily at 02:00 UTC | 30 days   | Primary backup for full restore |
| WAL Archives   | Continuous         | 7 days    | Point-in-Time Recovery          |

### Backup Storage

- **Local:** `./docker/backup/backups` (development)
- **Remote:** S3 bucket `s3://${S3_BUCKET}/backups/` (production)

### Backup Scripts

| Script             | Purpose                                       |
| ------------------ | --------------------------------------------- |
| `backup.sh`        | Creates PostgreSQL full backups using pg_dump |
| `restore.sh`       | Restores database from backup file            |
| `test_restore.sh`  | Validates backup integrity                    |
| `backup_status.sh` | Reports backup status for monitoring          |

### Environment Variables

```bash
# Database connection
DATABASE_HOST=localhost        # PostgreSQL host
DATABASE_PORT=5432             # PostgreSQL port
DATABASE_NAME=dmz_dev          # Database name
DATABASE_USER=dmz              # Database user
DATABASE_PASSWORD=dmz_dev      # Database password

# Backup configuration
BACKUP_DIR=/backups            # Local backup directory
S3_BUCKET=                     # S3 bucket name (empty = local only)
RETENTION_DAYS=30              # Backup retention period
```

---

## Recovery Procedures

### Full Database Restore

Use this procedure when the database is corrupted or needs a complete restore.

```bash
# 1. Stop the application
docker compose stop api

# 2. List available backups
ls -la docker/backup/backups/

# 3. Restore from backup
docker compose run --rm backup \
  ./restore.sh /backups/backup_20260313_020000.dump

# 4. Verify the restore
docker compose exec postgres psql -U dmz -d dmz_dev -c "SELECT COUNT(*) FROM information_schema.tables;"

# 5. Restart the application
docker compose up -d api
```

### Restoring from S3

```bash
# Restore directly from S3
docker compose run --rm -e S3_BUCKET=my-backup-bucket backup \
  ./restore.sh s3://my-backup-bucket/backups/backup_20260313_020000.dump
```

### Drop and Restore

Use this when you need a completely clean database:

```bash
# Restore with drop option
docker compose run --rm backup \
  ./restore.sh /backups/backup_20260313_020000.dump --drop-before-restore
```

---

## Point-in-Time Recovery (PITR)

Point-in-Time Recovery allows you to restore the database to a specific timestamp, useful for:

- Recovering from accidental data deletion
- Rolling back a bad migration
- Restoring to just before a data corruption event

### Prerequisites

1. WAL archiving must be enabled
2. WAL archives must be available
3. You must have a full backup taken BEFORE the target time

### PITR Procedure

```bash
# 1. Stop the application
docker compose stop api

# 2. Identify the backup to restore from
# You need a full backup taken BEFORE the target recovery time
ls -la docker/backup/backups/

# 3. Create a recovery.conf file
# This tells PostgreSQL to perform PITR
cat > /tmp/recovery.conf << 'EOF'
restore_command = 'cp /backups/wal/%f %p'
recovery_target_time = '2026-03-13 10:30:00 UTC'
recovery_target_action = 'promote'
EOF

# 4. Stop PostgreSQL
docker compose stop postgres

# 5. Backup current data directory
cp -r ./docker/postgres_data ./docker/postgres_data_backup

# 6. Initialize from base backup
# This step varies based on your setup
# For pg_basebackup:
# pg_basebackup -h localhost -U dmz -D /tmp/pg_restore -Ft -z -P

# For pg_dump restore:
docker compose run --rm backup \
  ./restore.sh /backups/backup_20260312_020000.dump

# 7. Copy WAL archives
# Ensure WAL archives from backup time to target time are available

# 8. Start PostgreSQL in recovery mode
docker compose up -d postgres

# 9. Monitor recovery
docker compose logs -f postgres | grep "recovery"

# 10. Verify recovery
docker compose exec postgres psql -U dmz -d dmz_dev -c "SELECT NOW();"

# 11. Restart application
docker compose up -d api
```

### PITR to Specific Timestamp

| Target Time          | Base Backup Required        |
| -------------------- | --------------------------- |
| 2026-03-13 10:30 UTC | backup_20260312_020000.dump |
| 2026-03-13 18:45 UTC | backup_20260313_020000.dump |

---

## Testing Procedures

### Weekly Backup Test

Run every Sunday at 03:00 UTC:

```bash
# Run backup test
docker compose run --rm backup ./test_restore.sh

# Check results
cat docker/backup/backups/backup_test.log
```

### Manual Backup Verification

```bash
# 1. Create a test database
docker compose exec postgres psql -U dmz -c "CREATE DATABASE dmz_test;"

# 2. Run restore test
docker compose run --rm -e TEST_DATABASE_NAME=dmz_test backup ./test_restore.sh

# 3. Verify tables exist
docker compose exec postgres psql -U dmz -d dmz_test -c "\dt"

# 4. Clean up test database
docker compose exec postgres psql -U dmz -c "DROP DATABASE dmz_test;"
```

### Alert Response Drill

1. Trigger a test backup failure
2. Verify alert fires in Prometheus/Alertmanager
3. Document response time
4. Review and improve procedures

---

## Alert Response

### BackupFailed (Critical)

**Trigger:** Backup job exits with non-zero status

**Response:**

1. Check backup logs: `cat docker/backup/backups/backup.log`
2. Verify database connectivity
3. Check disk space: `df -h`
4. Re-run backup manually: `docker compose run --rm backup ./backup.sh`
5. If persistent, escalate to DBA on-call

### BackupAgeWarning (Warning)

**Trigger:** Backup older than 25 hours

**Response:**

1. Check if backup job is scheduled correctly
2. Run manual backup: `docker compose run --rm backup ./backup.sh`
3. Investigate backup job failures

### BackupAgeCritical (Critical)

**Trigger:** Backup older than 48 hours

**Response:**

1. IMMEDIATELY run manual backup
2. Verify backup completed successfully
3. Check disk space and database connectivity
4. Escalate to senior engineer

### WALArchivingFailed (Critical)

**Trigger:** WAL archive command fails

**Response:**

1. Check WAL archive directory permissions
2. Verify disk space for WAL storage
3. Check S3 connectivity if using remote storage
4. Review PostgreSQL logs: `docker compose logs postgres`

---

## Emergency Contacts

| Role             | Contact             | Escalation Time |
| ---------------- | ------------------- | --------------- |
| On-Call Engineer | PagerDuty           | 15 minutes      |
| DBA Lead         | #platform-team      | 30 minutes      |
| Security Team    | #security-incidents | Immediate       |

---

## Appendix

### Checking Backup Status

```bash
# Get backup status JSON
docker compose run --rm backup ./backup_status.sh

# Example output:
# {"status": "success", "latest_backup": "backup_20260313_020000.dump", "latest_backup_age_hours": 4, "backup_count": 30, "wal_count": 1440}
```

### Backup Size Monitoring

```bash
# Check backup directory size
du -sh docker/backup/backups/

# List largest backups
ls -lhS docker/backup/backups/ | head -10
```

### Manual Backup Run

```bash
# Run backup immediately
docker compose run --rm backup ./backup.sh

# Run backup with S3 upload
docker compose run --rm -e S3_BUCKET=my-bucket backup ./backup.sh
```

### Retention Cleanup

Backups older than 30 days are automatically cleaned up by the backup script when running with S3. For local backups:

```bash
# Manual cleanup of old backups (older than 30 days)
find docker/backup/backups/ -name "backup_*.dump" -mtime +30 -delete
```
