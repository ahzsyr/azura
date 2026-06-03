# Incremental Upgrade Plan

AZURA platform upgrade — **production-safe**, **feature-module-first**, **no breaking changes** unless explicitly versioned.

**Principles**

1. **Ship in thin vertical slices** — schema → repository → service → action → UI → cache/SEO hook.
2. **Additive DB only** — new tables/columns/indexes; deprecate before remove (minimum one release cycle).
3. **Keep shims** until all imports migrate (`@/modules/*`, `@/lib/actions/admin`, `@/schemas/blocks`).
4. **Prefer `features/<domain>/`** over growing `lib/` or `components/` monoliths.
5. **Validate at boundaries** — Zod on server actions and API routes; types for UI contracts.

---

## Phase 0 — Baseline (complete)

| Item | Status |
|------|--------|
| Prisma schema (core + platform models) | Done |
| Migrations: `init`, `platform_upgrade`, `search_fulltext` | Done |
| Folder structure under `src/features/` | Done |
| Public marketing routes + admin dashboard | Done |
| Deliverables registry | `docs/DELIVERABLES.md` |

**Ops:** Run `npm run db:migrate` on every deploy before `next start`.

---

## Phase 1 — Stabilize production (current focus)

**Goal:** Reliable builds and deploys without behavior regressions.

| Task | Risk | Action |
|------|------|--------|
| Admin prerender at build | Low | Mark DB-dependent admin routes `dynamic = 'force-dynamic'` or ensure CI has `DATABASE_URL` |
| FULLTEXT migration | Medium | Confirm MySQL 8+; run `20260531140000_search_fulltext` manually if migrate skips |
| Search index drift | Low | Cron or admin “Rebuild index” after bulk imports |
| Shim removal prep | None | Grep for `@/modules/` and `@/lib/actions/admin`; migrate to `@/features/` |

**Exit criteria:** `npm run build` green in CI with DB; smoke test admin login + one CMS save.

---

## Phase 2 — Harden APIs & validation

**Goal:** Enterprise-grade input/output contracts.

| Task | Module | Notes |
|------|--------|-------|
| Standardize API errors | `lib/api-response.ts` (new) | `{ error, code }` shape for `/api/*` |
| Rate-limit public POST | `api/inquiries` | Edge or middleware |
| OpenAPI / typed client | `docs/openapi.yaml` (optional) | Document search + inquiry only first |
| ActionResult everywhere | admin + features | Return `ok()` / `fail()` from actions; surface in forms |
| Booking API completion | `api/bookings` | Wire to Prisma + auth if product needs it |

**No breaking changes:** Keep existing JSON response shapes; add fields only.

---

## Phase 3 — CMS & builder depth

**Goal:** Marketing team owns more pages without dev deploys.

| Task | Module | Notes |
|------|--------|-------|
| Migrate static marketing slugs | `cms` | About, Visa, etc. → published `CmsPage` blocks |
| Block presets library | `builder` | More templates in JsonStore |
| Preview URLs | `cms` | Draft preview token (read-only) |
| Revision diff UI | `cms` | Compare `CmsPageRevision` versions |
| Scheduled publish cron | `cms/scheduling` | `processDueScheduled` via Vercel cron or worker |

---

## Phase 4 — Performance & observability

**Goal:** Lighthouse 90+ and operable production.

| Task | Notes |
|------|-------|
| ISR audit | Document `revalidate` per marketing segment |
| Image audit | All hero/gallery use `OptimizedImage` + `IMAGE_SIZES` |
| Query selects | Lean Prisma `select` in `data-loaders` |
| Do **not** enable `cacheComponents` until all `revalidate` exports migrated to `use cache` |
| Logging | Request ID + slow query log in production |
| Error tracking | Sentry (or similar) on server actions |

---

## Phase 5 — Enterprise extras (optional)

| Task | When |
|------|------|
| Role-based admin (editor vs admin) | Multi-user editorial |
| Audit log table | Compliance |
| i18n message CMS | Non-developer copy edits |
| Edge search (Typesense/Meilisearch) | MySQL FULLTEXT limits hit |
| Remove deprecated shims | After grep shows zero `@/modules` imports |

---

## Module ownership map

Use this when adding code — **one owner per domain**:

```
features/admin     → packages, hotels, services, gallery, FAQs, company, inquiries
features/cms       → pages, posts, scheduling, taxonomy
features/builder   → blocks, templates, validation
features/media     → assets, folders, uploadthing
features/search    → indexer, query, command UI
features/seo       → meta, redirects, sitemap, JSON-LD
features/storage   → JsonStore, backups, page cache
features/theme     → SiteTheme draft/publish
features/auth      → guards, session

repositories/*     → Prisma only (no React)
services/*         → cache + batched reads
components/*       → cross-feature UI only
app/*              → routes thin; call features/services
```

---

## Change checklist (every PR)

- [ ] Migration is additive (or has rollback SQL documented)
- [ ] Zod schema updated if form/API shape changed
- [ ] Search indexer called on publish/delete (if entity is searchable)
- [ ] `revalidate*` / cache tags updated
- [ ] No new imports to deprecated paths unless shim
- [ ] `npm run build` TypeScript passes
- [ ] Manual test: affected admin page + one public route

---

## Rollback strategy

| Layer | Rollback |
|-------|----------|
| App deploy | Previous Vercel/host build |
| Migration | Forward-only; restore DB snapshot if failed mid-migrate |
| JsonStore | Export from `/admin/database` before risky edits |
| Theme | Re-publish last known good draft from DB |

---

*Aligns with deliverables in [DELIVERABLES.md](./DELIVERABLES.md).*
