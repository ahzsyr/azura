# AZURA database import bundles

Generated from `prisma/schema.prisma` / `prisma/schema/mysql/` (MySQL 8.4 only).

## Regenerate

```bash
# Schema + seed exports (MySQL)
npm run db:export

# MySQL one-file import with full current schema (Prisma migrations + extras + blank seed)
npm run db:export:mysql-full

# Blank initial state (factory defaults, no admin user — /setup wizard runs on first visit)
npm run db:export -- --seed blank

# Demo profiles (include pre-seeded admin with bcrypt hash from SEED_ADMIN_*)
npm run db:export -- --seed demo-brt
npm run db:export -- --seed demo-safar

# All three datasets + reset-admin.sql + reset-setup.sql
npm run db:export -- --seed all
```

> **Note:** `--seed` runs `db:zero-data` first, which wipes your local database before exporting.

### Seed admin credentials

| Field    | Default           |
|----------|-------------------|
| Email    | `admin@azura.com` |
| Password | `Admin123`        |

Override with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env` before export. Demo bundles embed a bcrypt hash generated at export time. **Blank bundles include no `User` rows** — the setup wizard creates the admin on first visit.

---

## Hostinger MySQL (canonical production)

1. Create a MySQL 8 database in hPanel.
2. Import `database/mysql/import-blank-full.sql` (or `import-blank.sql`) via Prisma Studio / TablePlus / Beekeeper (or phpMyAdmin if still enabled).
3. **Hostinger hPanel** → Node.js → Environment — set:

```env
DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/DB_NAME
HOSTINGER_MYSQL_LOCALHOST=1
AUTH_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-domain.com
```

Password characters like `@` `#` `:` must be URL-encoded in `DATABASE_URL`.

4. **Deploy / rebuild** — `npm ci && npm run build` on Node.js 24.
5. **First visit** — middleware redirects to `/setup`. Complete the wizard.
6. **Login** — `/account/login` after setup (admins are routed to `/admin`).

Optional media: set `MEDIA_STORAGE=supabase` and Supabase Storage keys. Supabase is **not** used as the application database.

### Local Docker MySQL

```bash
docker compose up -d mysql
# App connects via DATABASE_URL in .env (see database/env/.env.mysql)
# Inspect: bun run db:studio  OR  TablePlus/Beekeeper → localhost:3307
```

---

## Files

| Path | Purpose |
|------|---------|
| `database/mysql/` | Schema, seeds, import bundles |
| `database/env/.env.mysql` | Env template |
| `prisma/schema/mysql/` | Prisma multi-file schema |
| `prisma/migrations/` | Migrate history (MySQL) |
