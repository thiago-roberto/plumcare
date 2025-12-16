-- PostgreSQL initialization for Medplum
-- This file runs automatically on first container start

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Grant privileges (Medplum will create its own tables)
GRANT ALL PRIVILEGES ON DATABASE medplum TO medplum;
