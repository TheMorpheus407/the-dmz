SELECT 'CREATE DATABASE dmz_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dmz_dev')\gexec

SELECT 'CREATE DATABASE dmz_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dmz_test')\gexec
