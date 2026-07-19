-- RentFlow local database bootstrap.
-- Run once as the `postgres` superuser to create the app role + database.
--
--   psql -U postgres -h localhost -p 3000 -f db/setup.sql
--
-- Tables themselves are created automatically by TypeORM (DB_SYNCHRONIZE=true)
-- the first time the API starts. For production, replace synchronize with
-- generated migrations.

-- Create the application role if it does not already exist.
DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rentflow') THEN
      CREATE ROLE rentflow WITH LOGIN PASSWORD 'rentflow';
   END IF;
END
$$;

-- Create the database if it does not already exist.
SELECT 'CREATE DATABASE rentflow OWNER rentflow'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'rentflow')\gexec

GRANT ALL PRIVILEGES ON DATABASE rentflow TO rentflow;
