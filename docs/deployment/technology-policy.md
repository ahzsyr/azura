# Technology policy (Phase 5 SSOT)

Anti-drift contract for Azura. **No new platform or major technology is introduced unless an existing technology has a demonstrated limitation that the new technology solves.**

## Status table

| Technology | Status | Policy |
|------------|--------|--------|
| Next.js 16.x | Canonical | Stay on stable App Router releases |
| React 19.x | Canonical | Stay current with Next pairing |
| Node 24 | Canonical | Hostinger runtime; `engines.node` `>=24 <25` |
| npm ≥ 10 | Canonical | Production install via `npm ci`; Bun optional locally |
| MySQL 8.4 | Canonical | Sole application database |
| Prisma 6 | Canonical / frozen | Upgrade only via dedicated Prisma 7 gate |
| Auth.js (next-auth) v5 | Canonical / patch | **≥ 5.0.0-beta.32**; Better Auth is a future option only |
| Tailwind CSS 4 | Canonical | Opportunistic utilities when touching UI |
| TipTap | Default RTE | Production default for rich text fields |
| BlockNote | Decision **C** (coexistence) | TipTap default; BlockNote flagged pilot only — [blocknote-pilot.md](./blocknote-pilot.md) |
| Motion (`motion/react`) | Canonical UI motion | Presence, layout, normal transitions |
| GSAP | Selective | Complex timelines / text effects only — [motion-audit.md](./motion-audit.md) |
| Zustand | Canonical admin UI state | Transient admin chrome / editors |
| Nanostores | Removed | Do not reintroduce |
| nuqs | Canonical URL state | Filters, pagination, locale query params |
| TanStack Query | Selective | Client search sync under `src/capabilities/search/query/` only; no global expansion |
| Fuse.js | Selective | Genuine client-side fuzzy lists only — [search-architecture.md](./search-architecture.md) |
| MySQL FULLTEXT | Canonical search | `SearchDocument` MATCH…AGAINST — not Fuse as DB substitute |
| React Email + Resend | Canonical email | Product path only |
| Nodemailer | Non-product | Not a direct dependency; may reappear transitively via Auth.js — never use as product transport |
| SMTP accounts | Migration-only | UI may show legacy; send rejects `provider === "smtp"` |
| StorageProvider | Canonical media | `MEDIA_STORAGE=local\|supabase\|s3` |
| Prisma jobs + HTTP cron | Canonical background | `CRON_SECRET`, lease/reclaim |
| Hostinger | Sole production | Node 24 + npm + MySQL 8.4 |
| Vercel | Removed | Do not reintroduce deploy path |
| PostgreSQL schema | Removed | Do not reintroduce dual-DB |
| phpMyAdmin | Removed from Compose | Use Prisma Studio / external MySQL GUI |

## Intentional dualities (when / why)

| Pair | When to use which |
|------|-------------------|
| **Motion + GSAP** | Motion for UI presence/layout; GSAP only for complex timeline/hero/text effects that Motion does not justify rewriting |
| **TipTap + BlockNote** | TipTap = default production RTE; BlockNote = flagged pilot on selected advanced-rich-text fields until A/B/C decision says otherwise |
| **Zustand + TanStack Query** | Zustand = admin transient UI; TanStack Query = search client cache/prefetch only |
| **local + supabase + s3** | Explicit `MEDIA_STORAGE`; local valid on Hostinger; supabase/s3 when remote object storage is required |

## CMS / infra contracts

- Page AST, working/published revisions, Draft Mode — [page-ast.md](./page-ast.md)
- EntityTranslation + locale fallback — [locale-fallback.md](./locale-fallback.md)
- Storage identity + webhooks — [storage-and-webhooks.md](./storage-and-webhooks.md)
- Cron table — [hostinger-cron.md](./hostinger-cron.md)
- Stability — [hostinger-stability-gate.md](./hostinger-stability-gate.md)

## Auth.js Hostinger smoke (after ≥ beta.32)

After upgrading Auth.js, verify on Hostinger (or staging equivalent):

- [ ] Admin login (credentials)
- [ ] Session persistence across refresh
- [ ] MFA / email OTP when enabled
- [ ] Verification email delivery (Resend)
- [ ] Password reset flow
- [ ] Middleware protects `/admin` (unauthenticated redirect)
- [ ] Role bounce (customer cannot stay on admin)
- [ ] `npm run build` / Hostinger start healthy

Local regression: `npm run test:auth`, `npm run test:security`.

## Prisma 7 upgrade gate (prep only)

Do **not** upgrade Prisma while CMS/i18n/storage/jobs are in flux. Execute Prisma 7 only as a dedicated PR after:

- [ ] Phase 5 contract suite green (`npm run test:cms-contracts`) — CMS lifecycle, i18n/SEO, storage identity, webhooks, job leases, authz matrix
- [ ] Hostinger Stability Gate green
- [ ] Migrations stable on MySQL 8.4
- [ ] Revision + job lease + MediaAsset identity paths smoke-tested
- [ ] Compatibility review of Prisma 7 breaking changes completed

Never mix Prisma major upgrade with CMS, i18n, storage, job, or Next.js architecture changes.

## Dependency inventory notes

- Production lockfile: `package-lock.json` + `npm ci`
- CI already runs Knip + Hostinger FS/reads + `ci:no-vercel-deploy`
- Nodemailer: not a direct dependency; may appear transitively (e.g. next-auth). Product email must remain React Email → Resend.
- Cache Components / Partial Prefetching: optional admin pilot only; deferral after Hostinger measurement is an acceptable outcome — see Phase 5 Next audit notes.
