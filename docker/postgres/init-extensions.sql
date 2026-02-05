SELECT 'CREATE DATABASE dmz_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dmz_dev')\gexec

SELECT 'CREATE DATABASE dmz_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dmz_test')\gexec

\connect dmz_dev
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\connect dmz_test
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
