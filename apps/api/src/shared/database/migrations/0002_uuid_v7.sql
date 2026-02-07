-- UUIDv7 function and default migration
-- Replaces gen_random_uuid() (v4) with uuid_generate_v7() on all PK columns.
-- UUIDv7 embeds a millisecond timestamp, giving PKs natural chronological
-- ordering and improving B-tree index locality on insert-heavy tables.

CREATE OR REPLACE FUNCTION uuid_generate_v7() RETURNS uuid AS $$
DECLARE
  unix_ts_ms bigint;
  uuid_bytes bytea;
BEGIN
  unix_ts_ms = (extract(epoch from clock_timestamp()) * 1000)::bigint;
  -- First 6 bytes: 48-bit big-endian millisecond timestamp
  uuid_bytes = substring(int8send(unix_ts_ms) from 3);
  -- Next 10 bytes: cryptographically random
  uuid_bytes = uuid_bytes || gen_random_bytes(10);
  -- Set version nibble to 0111 (version 7)
  uuid_bytes = set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(4))::bit(8)::int);
  -- Set variant bits to 10 (RFC 9562 variant)
  uuid_bytes = set_byte(uuid_bytes, 8, (b'10' || get_byte(uuid_bytes, 8)::bit(6))::bit(8)::int);
  RETURN encode(uuid_bytes, 'hex')::uuid;
END
$$ LANGUAGE plpgsql VOLATILE;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "tenant_id" SET DEFAULT uuid_generate_v7();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "user_id" SET DEFAULT uuid_generate_v7();
