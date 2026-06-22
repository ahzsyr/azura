# Deployment Requirements

## Required software

- Node.js `>=20 <21`
- npm (uses `package-lock.json`, so prefer `npm ci`)
- One database:
  - MySQL 8+ (or compatible MariaDB mode)
  - PostgreSQL 15+ (Supabase recommended)

## Required environment configuration

Use one of these templates:

- `Guide/.env.mysql`
- `Guide/.env.postgres`

At minimum, you must set:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SITE_URL`

For file manager in hosted setups, set Supabase storage keys:

- `MEDIA_STORAGE=supabase`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_MEDIA_BUCKET`

## Database bootstrapping

- MySQL:
  - Run `Guide/mysql-create-tables.sql`
  - Import `database/mysql/01-schema.sql`
- PostgreSQL:
  - Run `Guide/postgres-create-tables.sql`
  - Import `database/postgres/01-schema.sql`

For first deployment, blank seed is recommended (`02-seed-blank.sql` or `import-blank.sql`).

## Build and run

1. `npm ci`
2. `npm run build`
3. `npm start`

Alternative for Hostinger-like environments:

- Build standalone: `npm run build:hostinger:standalone`
- Run: `node server.js` from `.next/standalone`

## First-run behavior

- If setup is not complete, the app redirects to `/setup`.
- Complete setup wizard to create admin user and finalize initial settings.
