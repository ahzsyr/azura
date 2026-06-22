# Host Setup Steps

## 1) Prepare host runtime

- Install Node.js 20.x
- Ensure npm is available
- Create app directory on host
- Upload project files (or deploy from Git)

## 2) Create database

Choose one:

- MySQL:
  - Create empty DB (example: `azura`)
  - Import [`database/mysql/01-schema.sql`](../../database/mysql/01-schema.sql)
- PostgreSQL/Supabase:
  - Create project/database
  - Import [`database/postgres/01-schema.sql`](../../database/postgres/01-schema.sql)

See [`database/README.md`](../../database/README.md) for seed bundles and regeneration.

## 3) Configure environment variables

- For MySQL: start from [`database/env/.env.mysql`](../../database/env/.env.mysql)
- For PostgreSQL/Supabase: start from [`database/env/.env.postgres`](../../database/env/.env.postgres)

Set all required secrets and URLs before build/start.

## 4) Install and build

```bash
npm ci
npm run build
```

## 5) Start application

```bash
npm start
```

Standalone option (for some hosts):

```bash
npm run build:hostinger:standalone
# then run node server.js in .next/standalone
```

## 6) First-time setup

- Open your domain
- If redirected, complete `/setup`
- Login at `/admin/login`

## 7) Post-deploy checks

- Confirm database reads/writes work
- Confirm media upload works (Supabase bucket and service role key)
- Confirm auth login works
- Confirm email provider works (SMTP or Resend)
