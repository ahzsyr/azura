# AZURA database import bundles

Generated from `prisma/schema.prisma` (MySQL) and `prisma/schema.postgresql.prisma` (Supabase).

## Regenerate

```bash
# Schema only (MySQL + PostgreSQL DDL)
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

# Regenerate PostgreSQL seeds only (from existing MySQL SQL, no DB wipe)
npm run db:export -- --pg-from-mysql --seed all

# Fix NULL JSON columns in existing MySQL seeds, then rebuild PostgreSQL
npm run db:export -- --fix-mysql-json --seed all
```

> **Note:** `--seed` runs `db:zero-data` first, which wipes your local database before exporting.

### Seed admin credentials

| Field    | Default           |
|----------|-------------------|
| Email    | `admin@azura.com` |
| Password | `Admin123`        |

Override with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env` before export. Demo bundles embed a bcrypt hash generated at export time. **Blank bundles include no `User` rows** — the setup wizard creates the admin on first visit.

---

## Supabase + Hostinger (recommended production flow)

1. **Supabase SQL Editor** — import `database/postgres/import-blank.sql` (not `import-demo-brt.sql` for first deploy).
2. **Hostinger hPanel** → Node.js → Environment — set:
   ```env
   DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@...supabase.co:5432/postgres
   SEED_ADMIN_EMAIL=admin@azura.com
   SEED_ADMIN_PASSWORD=Admin123
   AUTH_SECRET=...
   NEXTAUTH_SECRET=...
   NEXTAUTH_URL=https://your-domain.com
   ```
   Password characters like `@` `#` `:` must be URL-encoded in `DATABASE_URL`.
3. **Deploy / rebuild** — the build runs `prisma generate --schema prisma/schema.postgresql.prisma` when `DATABASE_URL` starts with `postgresql://`.
4. **First visit** — middleware redirects to `/setup`. Complete the wizard with `admin@azura.com` / `Admin123`.
5. **Login** — `/admin/login` after setup.

Demo content (`demo-brt`, `demo-safar`) is chosen inside the setup wizard (`installMode`), not by importing `import-demo-*.sql` on a fresh deploy.

### One-time fix for an existing Supabase database

If setup was skipped or admin login fails after a bad import, run in **Supabase SQL Editor**:

```sql
-- Or import database/postgres/reset-setup.sql
UPDATE "JsonStore"
SET "data" = '{"setupComplete":false,"comingSoonEnabled":false,"registrationEnabled":true}'::jsonb
WHERE "namespace" = 'settings' AND "key" = 'system';

DELETE FROM "User" WHERE "role" = 'ADMIN';
```

Then visit the site → `/setup` → create admin via wizard.

### Emergency admin reset (setup already complete)

When `setupComplete` is already `true` and you only need to reset credentials:

- **SQL:** `database/postgres/reset-admin.sql`
- **CLI:** `npm run db:reset-admin` (requires `DATABASE_URL` pointing at the live database)

---

## MySQL / phpMyAdmin

1. Create an empty database (e.g. `azura`) with **utf8mb4_unicode_ci**.
2. **One-file import** — pick one:
   - `database/mysql/import-blank-full.sql` — **recommended** — current schema (all Prisma migrations + extras) + blank seed
   - `database/mysql/import-blank.sql` — same blank seed; schema refreshed by `db:export:mysql-full`
   - `database/mysql/import-demo-brt.sql` — BRT TRADING LLC demo
   - `database/mysql/import-demo-safar.sql` — Safar Al-Madina demo

   Or import in two steps: `01-schema.sql` then `02-seed-*.sql`.

   Regenerate the full import after schema changes:
   ```bash
   npm run db:export:mysql-full
   ```

   **Upgrade an existing MySQL database** (legacy schema with `*En`/`*Ar` columns, `SeoSettings`, etc.):
   ```bash
   npm run db:export:mysql-update   # refresh update-existing-to-current.sql
   ```
   Then import `database/mysql/update-existing-to-current.sql` in phpMyAdmin. Run the i18n backfill scripts listed in that file before the legacy column drops if you have live content.

   After importing `import-blank-full.sql` on Hostinger, set `SKIP_DB_MIGRATE=1` on deploy so Prisma does not re-apply migrations to an already-built database.
3. Set `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL="mysql://user:password@localhost:3306/azura"
   ```

For a stuck setup state on MySQL, use `database/mysql/reset-setup.sql`.

---

## Supabase (PostgreSQL) — manual import

1. In **Supabase SQL Editor**, run one combined import file:
   - `database/postgres/import-blank.sql` — blank site, ready for `/setup`
   - `database/postgres/import-demo-brt.sql` — BRT TRADING LLC demo (manual / dev only)
   - `database/postgres/import-demo-safar.sql` — Safar Al-Madina demo (manual / dev only)

   Or import in two steps: `01-schema.sql` then `02-seed-*.sql`.
2. Set `DATABASE_URL` to the Supabase connection string. The app auto-selects `prisma/schema.postgresql.prisma` when the URL starts with `postgresql://`.

### Alternative: CSV import

Load data table-by-table via **Table Editor → Import data from CSV**:

- `database/csv/blank/` — initial state (no `User.csv` rows)
- `database/csv/demo-brt/` — BRT demo
- `database/csv/demo-safar/` — Safar demo

Import tables in dependency order (parent tables before children). See `_manifest.json` in each folder for row counts.

### Data format notes

- JSON columns are stored as JSON strings in CSV; PostgreSQL seed SQL uses `::jsonb` casts.
- Datetimes are ISO-8601 (`2026-06-05T12:00:00.000Z`).
- Booleans in CSV are `true`/`false`; PostgreSQL seed SQL uses native `true`/`false`.
- Enum values match Prisma enum names (e.g. `ADMIN`, `PUBLISHED`).

---

## File layout

```
database/
├── README.md
├── mysql/
│   ├── 01-schema.sql
│   ├── mysql-schema-extras.sql   # FULLTEXT etc. (not in Prisma datamodel)
│   ├── import-blank-full.sql     # Full schema + blank seed (Hostinger / phpMyAdmin)
│   ├── update-existing-to-current.sql  # ALTER existing DB → current schema
│   ├── import-blank.sql
│   ├── import-demo-brt.sql
│   ├── import-demo-safar.sql
│   ├── 02-seed-blank.sql
│   ├── 02-seed-demo-brt.sql
│   ├── 02-seed-demo-safar.sql
│   ├── reset-admin.sql      # Reset admin when setup is complete
│   └── reset-setup.sql      # Force /setup wizard
├── postgres/
│   ├── 01-schema.sql
│   ├── import-blank.sql
│   ├── import-demo-brt.sql
│   ├── import-demo-safar.sql
│   ├── 02-seed-blank.sql
│   ├── 02-seed-demo-brt.sql
│   ├── 02-seed-demo-safar.sql
│   ├── reset-admin.sql
│   └── reset-setup.sql
└── csv/
    ├── blank/
    ├── demo-brt/
    └── demo-safar/
```
