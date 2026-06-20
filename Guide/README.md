# AZURA Host Setup Guide

This folder contains deployment-ready setup files for running this project on a host with either MySQL or PostgreSQL (Supabase default).

## Files in this folder

- `mysql-schema.md`: MySQL schema source and usage notes.
- `mysql-create-tables.sql`: MySQL query script to create the database and tables.
- `postgres-schema.md`: PostgreSQL schema source and usage notes.
- `postgres-create-tables.sql`: PostgreSQL query script to create schema and tables.
- `.env.mysql`: environment template for MySQL deployment (includes DB + file manager connection).
- `.env.postgres`: environment template for PostgreSQL/Supabase deployment (includes DB + file manager connection).
- `project-description.md`: project overview and architecture summary.
- `deployment-requirements.md`: deployment and runtime requirements.
- `recommended-host-specs.md`: recommended hosting specifications.

## Recommended order

1. Pick a database engine (`mysql` or `postgres`).
2. Run the matching SQL script in this folder.
3. Copy the matching `.env.*` file to your host environment variables and fill placeholders.
4. Install dependencies and build:
   - `npm ci`
   - `npm run build`
   - `npm start` (or `node server.js` for standalone builds)
5. Open the app and complete `/setup` if it is a first-time deployment.
