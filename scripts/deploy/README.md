# Deploy scripts

| Script | Purpose |
|--------|---------|
| `encode-db-password.mjs` | URL-encode MySQL password for `DATABASE_URL` |
| `production-build.mjs` | Routes `npm run build` → Hostinger build |
| `hostinger-build.mjs` | Hostinger production build (chmod, DB probe, `next build`) |
| `hostinger-standalone-build.mjs` | Local standalone build for upload (`npm run build:hostinger:standalone`) |
| `assemble-standalone.mjs` | Copy static + public into `.next/standalone` after build |
| `hostinger-start.mjs` | Recommended Hostinger start: migrate/patches then `server.js` / `next start` |
| `hostinger-db-setup.mjs` | Run via `npm run deploy:hostinger-db` on the server after first deploy |
| `warm-isr.mjs` | Post-deploy ISR warm-up (`npm run deploy:warmup`) |
| `diagnose-hostinger-fs.mjs` | Check API/catalog permissions and persistent media layout (`npm run diagnose:hostinger`) |
| `test-db-connection.mjs` | Verify `DATABASE_URL` (`npm run test:db`) |
| `run-prisma.mjs` | Shared `npx prisma` runner for postinstall scripts |
| `ensure-uploads-symlink.mjs` | Link `public/uploads` to persistent disk (`LOCAL_PUBLIC_DIR/uploads` or `LOCAL_UPLOADS_DIR`) |
| `log-runtime-persistence-env.mjs` | Log persistence paths and symlink layout at `prestart` |
| `local-persistence-paths.mjs` | Shared path validation for persistent media (used by symlink + diagnose scripts) |

## Hostinger — reduce 503 / Max Processes

This app is **Next.js SSR** (`next start`), not WordPress. Shared hosting limits concurrent Node processes; each page view can trigger middleware self-fetches and DB work unless configured correctly.

### Multiple websites

Each Hostinger website needs **its own** MySQL database and **its own** persistent uploads path. See [host-setup-steps.md §8](../../docs/deployment/host-setup-steps.md).

Example for site slug `site-a`:

```env
DATABASE_URL=mysql://site_a_user:PASSWORD@localhost:3306/site_a_db
HOSTINGER_MYSQL_LOCALHOST=1
LOCAL_PUBLIC_DIR=/home/<user>/persistent/site-a/public
```

### Do not destroy data on redeploy

- Never run `db:zero-data`, `db:reset-setup`, `db:factory-defaults`, blank SQL import, or `SETUP_FRESH_INSTALL=1` on a live DB.
- Prefer start command `node scripts/deploy/hostinger-start.mjs` (additive migrate/patches, then server).
- Existing MySQL DBs skip destructive `prisma migrate deploy`; only additive patches apply.

### hPanel environment variables (required)

Set in **Websites → Node.js → Environment variables**. The uploaded zip does **not** apply `.env` files automatically. Start from [`database/env/.env.mysql`](../../database/env/.env.mysql).

| Variable | Value | Why |
|----------|-------|-----|
| `SETUP_COMPLETE` | `true` | Marks setup complete when `/api/setup/status` is temporarily unreachable |
| `INTERNAL_APP_URL` | `http://127.0.0.1:3000` | Reliable loopback for middleware `/api/setup/status` self-fetch |
| `DATABASE_URL` | `mysql://USER:PASSWORD@localhost:3306/DATABASE_NAME` | App DB is **MySQL 8.4** only (URL-encode special characters in the password) |
| `NODE_ENV` | `production` | Enables ISR / caching |
| `MEDIA_STORAGE` | `local` | Use Hostinger disk for CMS uploads (no Supabase) |
| `LOCAL_PUBLIC_DIR` | `/home/<user>/persistent/<site-slug>/public` | **Recommended** — CMS writes to `…/uploads`; only `public/uploads` is symlinked |
| `LOCAL_UPLOADS_DIR` | `/home/<user>/persistent/<site-slug>/media-uploads` | Alternative uploads-only path (use when `LOCAL_PUBLIC_DIR` is unset) |
| `HOSTINGER_MYSQL_LOCALHOST` | `1` | Use `localhost` instead of `srv*.hstgr.io` in `DATABASE_URL` at runtime |
| `AUTH_SECRET` | long random string | Unique per website |

Coming soon mode is controlled in **Admin → Settings → Site**. Optional `COMING_SOON_ENABLED` env is only used as a fallback when middleware cannot reach `/api/setup/status` — it does not override the admin toggle when the API responds.

After deploy, middleware caches setup status (30s when coming soon is on) so logs should not show `/api/setup/status` on every page view.

### Persistent local media (MySQL + Hostinger disk)

Git redeploy replaces the Node.js app folder. CMS uploads must live **outside** the deploy path and only `public/uploads` may be symlinked — **never symlink entire `public/`** on Git Deploy hosts.

#### Why not `public → persistent/public`?

```text
public -> /home/u637787491/persistent/public   ← UNSAFE with Git Deploy
```

Git checkout, reset, or `git clean` on `public/` can run **inside** persistent storage via the symlink. That matches: upload → deploy 1 → deploy 2 → files gone from both locations.

**Safe layout:**

```text
public/                    ← normal Git directory (static assets from repo)
public/uploads -> /home/u637787491/persistent/public/uploads
```

Uploads are served via `/api/local-uploads` ([`next.config.ts`](../../next.config.ts) rewrite); the full-public symlink is not required.

#### Git Deploy proof test (optional)

Before changing production config, confirm whether Hostinger Git follows symlinks:

```bash
mkdir -p /home/u637787491/persistent/test
echo "hello" > /home/u637787491/persistent/test/a.txt
rm -rf public
ln -s /home/u637787491/persistent/test public
# Trigger ONE Git Deploy, then:
cat /home/u637787491/persistent/test/a.txt
```

If `a.txt` is gone → Git mutates through `public` symlinks (uploads-only symlink is required). If it remains → investigate other causes (`npm run diagnose:hostinger`).

#### Path rules

| Path | Safe for CMS uploads? |
|------|----------------------|
| `/home/<user>/persistent/<site-slug>/public` | Yes — recommended (`LOCAL_PUBLIC_DIR`) |
| `/home/<user>/<deploy-folder>/public` | **No** — inside deploy tree |
| `./public` or relative paths | **No** — rejected by deploy script |
| Symlink entire `public/` | **No** — Git Deploy risk |

**One-time migration** (if uploads were under the deploy tree):

```bash
mkdir -p /home/<user>/persistent/<site-slug>/public/uploads
cp -a /home/<user>/<deploy-folder>/public/uploads/. /home/<user>/persistent/<site-slug>/public/uploads/ 2>/dev/null || true
```

**hPanel env (with `MEDIA_STORAGE=local`):**

```env
LOCAL_PUBLIC_DIR=/home/<user>/persistent/<site-slug>/public
```

Set the **same value** in both Build and Runtime env sections if hPanel separates them.

Alternative (uploads-only env, unset `LOCAL_PUBLIC_DIR`):

```env
LOCAL_UPLOADS_DIR=/home/<user>/persistent/<site-slug>/media-uploads
```

**Post-deploy verification** (SSH):

```bash
pwd
ls -ld public                    # should be a directory, NOT a symlink
readlink -f public/uploads       # -> /home/<user>/persistent/<site-slug>/public/uploads
ls -la /home/<user>/persistent/<site-slug>/public/uploads/images/
npm run diagnose:hostinger
```

Upload a test image, Git deploy **twice**, confirm the file remains under `persistent/<site-slug>/public/uploads/`.

Startup logs (`[prestart]`) show `LOCAL_PUBLIC_DIR`, resolved uploads path, and symlink layout. Upload logs show `[media-storage] wrote local upload: /path/...`.

Default **Build** `npm run build` and **Start** `npm start` run `ensure-uploads-symlink.mjs` automatically (after build, in `prestart`, and on server boot via `instrumentation.ts`). The script breaks legacy whole-public symlinks on first run after upgrade.

Set `SKIP_PUBLIC_SYMLINK=1` to disable. Unset both env vars to skip (no change for Vercel or local dev).

### Hostinger MySQL connection (`Can't reach database server`)

phpMyAdmin may show host `srvXXXX.hstgr.io`, but **Node.js on the same Hostinger account** often must use **`localhost`**:

```env
DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/DATABASE_NAME
```

If you already use `srv*.hstgr.io` in `DATABASE_URL`, add either:

```env
HOSTINGER_MYSQL_LOCALHOST=1
```

or:

```env
DATABASE_MYSQL_HOST=localhost
```

Then restart the app and run `npm run test:db` via SSH to verify.

### Recommended deploy: prebuilt standalone (avoids server build worker storm)

Building on Hostinger spawns 60+ Next.js workers and can temporarily hit Max Processes.

**On your dev machine:**

```bash
npm run build:hostinger:standalone
```

Upload to Hostinger:

1. `.next/standalone/` (entire folder — contains `server.js`)
2. Ensure `.next/static` and `public/` were copied (the script does this via `assemble-standalone.mjs`)

**hPanel start command:** `node scripts/deploy/hostinger-start.mjs`

This applies pending Prisma migrations / schema patches (including FormTemplate columns like `allowedAdminIds`), then starts `server.js`.

Fallback: `node server.js` alone does **not** migrate — run once via SSH:

```bash
npm run db:migrate:deploy
```

**Persistent media (standalone):** set `LOCAL_PUBLIC_DIR` in hPanel; `hostinger-start.mjs` runs the uploads symlink when that env is set.

**Optional:** set `SKIP_PRESTART_PRISMA=1` when using standalone + `node server.js` directly (skips Prisma regenerate on every restart). Do **not** set `SKIP_DB_MIGRATE=1` unless the database schema is already current.

### Alternative: zip or GitHub deploy on Hostinger

If you must build on the server:

- Schedule deploys during **low traffic**
- Set `SKIP_CATALOG_PREBUILD=1` when committed `src/data/products-index/` is already populated
- Run `npm run catalog:index` locally and commit indexes before deploy

Default commands: **Build** `npm run build`, **Start** `npm start` (or `npm run start:hostinger`).

`npm start` / `prestart` now runs `db:migrate:deploy` so Hostinger Git deploys apply schema changes (e.g. `FormTemplate.allowedAdminIds`, security hardening) automatically. Unset `SKIP_DB_MIGRATE` if it is set in hPanel.

Security hardening (`20260821120000_security_hardening`) is **MySQL** SQL in `prisma/migrations/` and is also applied idempotently by `prisma-migrate-deploy.mjs` patches on start — so Git → Hostinger deploys pick it up without a manual phpMyAdmin step.

### Operational guardrails

Run these **off-peak** — they share the same Node process as public traffic:

- Admin **search index rebuild**
- **Product import** (`/api/products/import`)
- **Collection sync** (`/api/sync-collections`)

**CDN / static caching:** Enable Hostinger CDN or LiteSpeed cache for `/_next/static/*` and `/public/*`.

**If 503 persists after code + env fixes:** upgrade the Hostinger plan and/or put Cloudflare in front. Hostinger is the sole supported production host — do not redeploy to Vercel.

---

## Hostinger (canonical)

1. Set `DATABASE_URL` to a **MySQL** URI (`mysql://…`). Use `HOSTINGER_MYSQL_LOCALHOST=1` when MySQL is on the same server.
2. **Node.js Version**: `24` (matches `.nvmrc` and `package.json` `engines`).
3. Install with **`npm ci`** (lockfile: `package-lock.json`). Local Mac may use Bun; see [`docs/deployment/local-dev-runtime.md`](../../docs/deployment/local-dev-runtime.md).
4. Do **not** commit `.env` to git; use hPanel environment variables only.
5. Optional media: `MEDIA_STORAGE=supabase` + Supabase Storage keys (not used as the app database).
6. After each production deploy, warm ISR routes so first visitors do not see stale build shells:

```bash
WARMUP_BASE_URL=https://your-domain.com npm run deploy:warmup
```

To pre-render product detail pages with live element visibility settings, pass one or more slugs:

```bash
WARMUP_BASE_URL=https://your-domain.com WARMUP_PRODUCT_SLUGS=alfa-2-4-5ghz-indoor-antenna npm run deploy:warmup
```

Explicit aliases: `npm run build:hostinger`, `npm run build:hostinger:standalone`, `npm run deploy:warmup`.
