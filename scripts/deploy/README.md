# Deploy scripts

| Script | Purpose |
|--------|---------|
| `encode-db-password.mjs` | URL-encode MySQL password for `DATABASE_URL` |
| `production-build.mjs` | Routes `npm run build` — Vercel vs Hostinger |
| `hostinger-build.mjs` | Hostinger production build (chmod, DB probe, `next build`) |
| `hostinger-standalone-build.mjs` | Local standalone build for upload (`npm run build:hostinger:standalone`) |
| `assemble-standalone.mjs` | Copy static + public into `.next/standalone` after build |
| `hostinger-db-setup.mjs` | Run via `npm run deploy:hostinger-db` on the server after first deploy |
| `diagnose-hostinger-fs.mjs` | Check API/catalog folder permissions (`npm run diagnose:hostinger`) |
| `test-db-connection.mjs` | Verify `DATABASE_URL` (`npm run test:db`) |
| `run-prisma.mjs` | Shared `npx prisma` runner for postinstall scripts |

## Hostinger (brt-me.com) — reduce 503 / Max Processes

This app is **Next.js SSR** (`next start`), not WordPress. Shared hosting limits concurrent Node processes; each page view can trigger middleware self-fetches and DB work unless configured correctly.

### hPanel environment variables (required)

Copy from [`.env.brt`](../.env.brt) into **Websites → Node.js → Environment variables**. The uploaded zip does **not** apply `.env` files automatically.

| Variable | Value | Why |
|----------|-------|-----|
| `SETUP_COMPLETE` | `true` | Skips middleware `/api/setup/status` self-fetch |
| `COMING_SOON_ENABLED` | `false` | Avoids 30s setup-status cache TTL |
| `INTERNAL_APP_URL` | `http://127.0.0.1:3000` | Reliable loopback for any remaining internal fetches |
| `DATABASE_URL` | Supabase transaction pooler port **6543**, `?pgbouncer=true&connection_limit=3&sslmode=require` | Avoids connection pool exhaustion under SSR |
| `NODE_ENV` | `production` | Enables ISR / caching |

After deploy, server logs should **not** show repeated `/api/setup/status` on every page view.

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

Explicit aliases: `npm run build:vercel`, `npm run build:hostinger`, `npm run build:hostinger:standalone`.
