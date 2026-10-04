# Hostinger Phase 4 Stability Gate

Hostinger is the **sole** supported production runtime. Do not treat Vercel (or any second host) as a production fallback.

## Production runtime

- [ ] Node.js **24** selected in hPanel (`engines.node`: `>=24 <25`)
- [ ] `npm ci` succeeds using committed `package-lock.json` (npm ≥ 10)
- [ ] `npm run build` / `npm run build:hostinger` completes
- [ ] `DATABASE_URL` is `mysql://…` (MySQL **8.4**); `HOSTINGER_MYSQL_LOCALHOST=1` if same server
- [ ] Migrate/start applies schema; `/setup` completes if blank
- [ ] Public site and `/admin` load without restart loops

## Storage (`MEDIA_STORAGE`)

- [ ] `MEDIA_STORAGE` is explicitly `local` | `supabase` | `s3` (no Vercel heuristic)
- [ ] Local media is valid on Hostinger when `MEDIA_STORAGE=local` (persistent uploads dir / symlink)
- [ ] Supabase: remote env vars set when `MEDIA_STORAGE=supabase`
- [ ] S3/R2: `S3_*` env vars set when `MEDIA_STORAGE=s3`
- [ ] Upload / replace / delete go through `StorageProvider` only
- [ ] Delete/replace resolve via `storageBackend + bucket + objectKey` (never parse `url`)
- [ ] Storage status reports `MEDIA_STORAGE` and `cronSecretConfigured` (boolean)

## Cron & jobs

- [ ] `CRON_SECRET` configured; Hostinger HTTP cron hits `/api/*/run` routes
- [ ] See [hostinger-cron.md](./hostinger-cron.md) for SEO, search, CMS scheduled, marketing, translation
- [ ] Runners fail closed without `CRON_SECRET` (marketing: admin session **or** cron)
- [ ] Stranded `RUNNING` jobs reclaim when `lockedUntil` expires
- [ ] Double-run of the same cron is safe (atomic claim)

## Webhooks

- [ ] Outbound webhooks are best-effort (domain writes never depend on webhook success)
- [ ] SSRF: destinations validated **after DNS resolve**; `redirect: "error"`
- [ ] HMAC-SHA256 `x-azura-signature` when endpoints configured
- [ ] Production requires `WEBHOOK_SIGNING_SECRET` when `WEBHOOK_ENDPOINTS` is set

## Docs index

- [ ] Deployment guides linked from [README.md](./README.md)
- [ ] [storage-and-webhooks.md](./storage-and-webhooks.md) documents identity vs url
- [ ] [hostinger-cron.md](./hostinger-cron.md) lists cron table (no Vercel cron config)

## Phase 5 contracts (local / CI)

- [ ] `npm run test:cms-contracts` green (CMS lifecycle, i18n/SEO, storage identity, webhooks, jobs, authz)
- [ ] Auth.js ≥ `5.0.0-beta.32` (`npm run test:auth`)
- [ ] Technology policy current: [technology-policy.md](./technology-policy.md)

## Optional

- [ ] Resend emails (OTP) configured and smoke-tested
- [ ] `STAGING_URL=… npm run ci:smoke-hostinger` against staging

## Local proxy verification (dev)

```bash
docker compose up -d mysql
docker compose up -d --build app
docker compose exec app node -v   # v24.x
```

Local Bun: see [local-dev-runtime.md](./local-dev-runtime.md).
