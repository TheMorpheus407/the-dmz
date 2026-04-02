-- Migration: 0057_idempotency_records_remove_http_semantics
-- Description: Rename method to operation and drop response_status column from idempotency.records

ALTER TABLE idempotency.records RENAME COLUMN method TO operation;

ALTER TABLE idempotency.records DROP COLUMN IF EXISTS response_status;