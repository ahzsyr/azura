# Deployment Requirements

## Required software

- Node.js `>=24 <25`
- npm (uses `package-lock.json`, so prefer `npm ci`)
- MySQL 8.4 (or compatible MySQL 8+ / MariaDB mode)

## Required environment configuration

Use the MySQL template:

- [`database/env/.env.mysql`](../../database/env/.env.mysql)

At minimum, you must set:

- `DATABASE_URL` (`mysql://…`)
- `AUTH_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SITE_URL`

Media (`MEDIA_STORAGE=local|supabase|s3` — explicit; local is valid on Hostinger):

- `MEDIA_STORAGE=local` (default on Hostinger disk) or `supabase` / `s3`
- Supabase: `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_MEDIA_BUCKET`
- S3/R2: `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, optional `S3_ENDPOINT` / `S3_PUBLIC_URL`

Cron / webhooks:

- `CRON_SECRET` (required for `/api/*/run` cron routes)
- Optional: `WEBHOOK_ENDPOINTS`, `WEBHOOK_SIGNING_SECRET` (required in production when endpoints set)

See [storage-and-webhooks.md](./storage-and-webhooks.md) and [hostinger-cron.md](./hostinger-cron.md).

## Database bootstrapping

- Import [`database/mysql/01-schema.sql`](../../database/mysql/01-schema.sql) or the full blank bundle.

For first deployment, blank seed is recommended (`02-seed-blank.sql` or `import-blank.sql`). See [`database/README.md`](../../database/README.md).

## Build and run

Production / Hostinger (Node 24 + npm):

1. `npm ci`
2. `npm run build`
3. `npm start`

Local development may use Bun (`bun install`, `bun run dev`) while keeping `package-lock.json` as the production lockfile.

Alternative for Hostinger-like environments:

- Build standalone: `npm run build:hostinger:standalone`
- Run: `node server.js` from `.next/standalone`

## First-run behavior

- If setup is not complete, the app redirects to `/setup`.
- Complete setup wizard to create admin user and finalize initial settings.
