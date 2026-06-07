# Deploy scripts

| Script | Purpose |
|--------|---------|
| `encode-db-password.mjs` | URL-encode MySQL password for `DATABASE_URL` |
| `production-build.mjs` | Routes `npm run build` — Vercel vs Hostinger |
| `hostinger-build.mjs` | Hostinger production build (chmod, DB probe, `next build`) |
| `hostinger-db-setup.mjs` | Run via `npm run deploy:hostinger-db` on the server after first deploy |
| `diagnose-hostinger-fs.mjs` | Check API/catalog folder permissions (`npm run diagnose:hostinger`) |
| `test-db-connection.mjs` | Verify `DATABASE_URL` (`npm run test:db`) |
| `run-prisma.mjs` | Shared `npx prisma` runner for postinstall scripts |

## Vercel + Supabase

1. Set `DATABASE_URL` in the Vercel project (transaction pooler, port **6543**, `?pgbouncer=true&connection_limit=1&sslmode=require`).
2. **Build Command**: `npm run build` (default) — auto-detects `VERCEL` and runs `prisma generate` + `next build`. No dashboard override needed.
3. **Node.js Version**: `20` (matches `.nvmrc` and `package.json` `engines`).
4. Do **not** commit `.env` to git; use Vercel environment variables only.
5. Site settings saved in admin persist via **JsonStore** on Vercel (read-only filesystem); bundled `src/data/*/ui/site.json` remains the default baseline.

Explicit aliases: `npm run build:vercel`, `npm run build:hostinger`.
