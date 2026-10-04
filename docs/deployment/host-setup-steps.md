# Host Setup Steps

## 1) Prepare host runtime

- Install Node.js 24.x
- Ensure npm is available
- Create app directory on host
- Upload project files (or deploy from Git)

## 2) Create database

MySQL 8.4 only:

- Create empty DB (example: `azura`)
- Import [`database/mysql/01-schema.sql`](../../database/mysql/01-schema.sql) or the blank full bundle

See [`database/README.md`](../../database/README.md) for seed bundles and regeneration.

## 3) Configure environment variables

- Start from [`database/env/.env.mysql`](../../database/env/.env.mysql)
- Optional media: Supabase Storage keys (`MEDIA_STORAGE=supabase`) — not used as the app database

Set **host infrastructure** only: `DATABASE_URL`, `AUTH_SECRET`, optional `SETUP_TOKEN` / `CRON_SECRET`.

On Hostinger MySQL (Node app on the same server), also set `HOSTINGER_MYSQL_LOCALHOST=1` (or `DATABASE_MYSQL_HOST=localhost`) so the app and migrate scripts connect via localhost.

In production, set `SETUP_TOKEN` to a long random string in the host env and restart. That unlocks first-run `/setup` without a `?token=` URL. Re-setup after completion still requires presenting the matching token.

Product credentials (Google OAuth, translation APIs, marketing pixels) are managed in the **admin dashboard** after setup — not in Hostinger env vars.

## 4) Install and build

```bash
npm ci
npm run build
```

## 5) Start application

Prefer a start command that migrates first:

```bash
node scripts/deploy/hostinger-start.mjs
```

Or:

```bash
npm start
```

Standalone option (for some hosts):

```bash
npm run build:hostinger:standalone
# upload .next/standalone, then:
node scripts/deploy/hostinger-start.mjs
```

Do **not** start with bare `node server.js` on an empty database (that skips schema bootstrap). Avoid `SKIP_DB_MIGRATE=1` until the `User` table exists.

## 6) First-time setup

- Ensure schema exists (`npm start` / `npm run db:migrate:deploy`, or `npm run deploy:hostinger-db`, or import blank SQL). Do not set `SKIP_DB_MIGRATE=1` on an empty database.
- Open your domain
- If redirected, complete `/setup` (no query token needed when `SETUP_TOKEN` is set in env)
- Login at `/account/login` (admins are routed to `/admin` after sign-in)

## 7) Post-deploy checks

- Confirm database reads/writes work
- Confirm media upload works (Supabase bucket and service role key)
- Confirm auth login works
- Confirm email provider works (SMTP or Resend)
