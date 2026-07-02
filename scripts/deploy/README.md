# Deploy scripts

| Script | Purpose |
|--------|---------|
| `encode-db-password.mjs` | URL-encode MySQL password for `DATABASE_URL` |
| `production-build.mjs` | Routes `npm run build` — Vercel vs Hostinger |
| `hostinger-build.mjs` | Hostinger production build (chmod, DB probe, `next build`) |
| `hostinger-standalone-build.mjs` | Local standalone build for upload (`npm run build:hostinger:standalone`) |
| `assemble-standalone.mjs` | Copy static + public into `.next/standalone` after build |
| `hostinger-db-setup.mjs` | Run via `npm run deploy:hostinger-db` on the server after first deploy |
| `warm-isr.mjs` | Post-deploy ISR warm-up (`npm run deploy:warmup`) |
| `diagnose-hostinger-fs.mjs` | Check API/catalog permissions and persistent media layout (`npm run diagnose:hostinger`) |
| `test-db-connection.mjs` | Verify `DATABASE_URL` (`npm run test:db`) |
| `run-prisma.mjs` | Shared `npx prisma` runner for postinstall scripts |
| `ensure-uploads-symlink.mjs` | Link `public/uploads` to persistent disk (`LOCAL_PUBLIC_DIR/uploads` or `LOCAL_UPLOADS_DIR`) |
| `log-runtime-persistence-env.mjs` | Log persistence paths and symlink layout at `prestart` |
| `local-persistence-paths.mjs` | Shared path validation for persistent media (used by symlink + diagnose scripts) |

## Hostinger (brt-me.com) — reduce 503 / Max Processes

This app is **Next.js SSR** (`next start`), not WordPress. Shared hosting limits concurrent Node processes; each page view can trigger middleware self-fetches and DB work unless configured correctly.

### hPanel environment variables (required)

Copy from [`.env.brt`](../.env.brt) into **Websites → Node.js → Environment variables**. The uploaded zip does **not** apply `.env` files automatically.

| Variable | Value | Why |
|----------|-------|-----|
| `SETUP_COMPLETE` | `true` | Marks setup complete when `/api/setup/status` is temporarily unreachable |
| `INTERNAL_APP_URL` | `http://127.0.0.1:3000` | Reliable loopback for middleware `/api/setup/status` self-fetch |
| `DATABASE_URL` | Supabase transaction pooler port **6543**, `?pgbouncer=true&connection_limit=3&sslmode=require` | Avoids connection pool exhaustion under SSR |
| `NODE_ENV` | `production` | Enables ISR / caching |
| `MEDIA_STORAGE` | `local` | Use Hostinger disk for CMS uploads (no Supabase) |
| `LOCAL_PUBLIC_DIR` | `/home/u637787491/persistent/public` | **Recommended** — CMS writes to `persistent/public/uploads`; only `public/uploads` is symlinked |
| `LOCAL_UPLOADS_DIR` | `/home/u637787491/persistent/media-uploads` | Alternative uploads-only path (use when `LOCAL_PUBLIC_DIR` is unset) |
| `HOSTINGER_MYSQL_LOCALHOST` | `1` | Use `localhost` instead of `srv*.hstgr.io` in `DATABASE_URL` at runtime |

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
| `/home/u637787491/persistent/public` | Yes — recommended (`LOCAL_PUBLIC_DIR`) |
| `/home/u637787491/brt-data/public` | **No** — inside deploy tree if app lives in `brt-data/` |
| `./public` or relative paths | **No** — rejected by deploy script |
| Symlink entire `public/` | **No** — Git Deploy risk |

**One-time migration** (if uploads were under `brt-data/public`):

```bash
mkdir -p /home/u637787491/persistent/public/uploads
cp -a /home/u637787491/brt-data/public/uploads/. /home/u637787491/persistent/public/uploads/ 2>/dev/null || true
```

**hPanel env (with `MEDIA_STORAGE=local`):**

```env
LOCAL_PUBLIC_DIR=/home/u637787491/persistent/public
```

Set the **same value** in both Build and Runtime env sections if hPanel separates them.

Alternative (uploads-only env, unset `LOCAL_PUBLIC_DIR`):

```env
LOCAL_UPLOADS_DIR=/home/u637787491/persistent/media-uploads
```

**Post-deploy verification** (SSH):

```bash
pwd
ls -ld public                    # should be a directory, NOT a symlink
readlink -f public/uploads       # -> /home/u637787491/persistent/public/uploads
ls -la /home/u637787491/persistent/public/uploads/images/
npm run diagnose:hostinger
```

Upload a test image, Git deploy **twice**, confirm the file remains in `persistent/public/uploads/`.

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

**hPanel start command:** `node server.js` (working directory = standalone folder)

**Persistent media (standalone):** set `LOCAL_PUBLIC_DIR` in hPanel, then either:

```bash
node scripts/deploy/ensure-uploads-symlink.mjs && node server.js
```

or run the symlink script once after each upload of the standalone bundle.

**Optional:** set `SKIP_PRESTART_PRISMA=1` when using standalone + `node server.js` directly (skips Prisma regenerate on every restart).

### Alternative: zip or GitHub deploy on Hostinger

If you must build on the server:

- Schedule deploys during **low traffic**
- Set `SKIP_CATALOG_PREBUILD=1` when committed `src/data/products-index/` is already populated
- Run `npm run catalog:index` locally and commit indexes before deploy

Default commands: **Build** `npm run build`, **Start** `npm start`.

### Operational guardrails

Run these **off-peak** — they share the same Node process as public traffic:

- Admin **search index rebuild**
- **Product import** (`/api/products/import`)
- **Collection sync** (`/api/sync-collections`)

**CDN / static caching:** Enable Hostinger CDN or LiteSpeed cache for `/_next/static/*` and `/public/*`.

**If 503 persists after code + env fixes:** upgrade the Hostinger plan, add Cloudflare in front, or move the public site to Vercel (`npm run build:vercel`).

---

## Vercel + Supabase

1. Set `DATABASE_URL` in the Vercel project (transaction pooler, port **6543**, `?pgbouncer=true&connection_limit=1&sslmode=require`).
2. **Build Command**: `npm run build` (default) — auto-detects `VERCEL` and runs `prisma generate` + `next build`. No dashboard override needed.
3. **Node.js Version**: `20` (matches `.nvmrc` and `package.json` `engines`).
4. Do **not** commit `.env` to git; use Vercel environment variables only.
5. Site settings saved in admin persist via **JsonStore** on Vercel (read-only filesystem); bundled `src/data/*/ui/site.json` remains the default baseline.
6. After each production deploy, warm ISR routes so first visitors do not see stale build shells:

```bash
WARMUP_BASE_URL=https://your-domain.com npm run deploy:warmup
```

To pre-render product detail pages with live element visibility settings, pass one or more slugs:

```bash
WARMUP_BASE_URL=https://your-domain.com WARMUP_PRODUCT_SLUGS=alfa-2-4-5ghz-indoor-antenna npm run deploy:warmup
```

Explicit aliases: `npm run build:vercel`, `npm run build:hostinger`, `npm run build:hostinger:standalone`, `npm run deploy:warmup`.
