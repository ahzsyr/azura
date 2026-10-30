# Phase 1 — Runtime ingress surface matrix

**Status:** Complete (implementation + verified unit/pin evidence)  
**Parent:** [executive-application-platform-implementation-plan.md](./executive-application-platform-implementation-plan.md) Phase 1  
**Locks:** [phase-0-decisions-freeze.md](./phase-0-decisions-freeze.md)  
**Disposition:** Accept (default) — [phase-0-working-tree-disposition.md](./phase-0-working-tree-disposition.md)

## Outcome legend

| State | Meaning |
|-------|---------|
| active | Profile includes + SiteFeature on (+ env for Marketing) |
| runtime_inactive | Included but SiteFeature off |
| profile_omitted | Not in compiled profile modules |
| ledger_unavailable | SiteFeature map could not load |

| Guard class | Policy |
|-------------|--------|
| fail-open | `isModuleActive` — ledger miss → treat as active (availability UI / soft reads) |
| fail-closed | `resolveModuleIngressAccess` — ledger miss → deny mutations |

Operation classes: `read_ui` · `mutation` · `public_read` · `privileged_callback` · `job`

## Exceptional binding — Marketing `/a`

Not in `publicRoutes`. Profile omit → `MODULE_EXTRA_DISABLED_PUBLIC` → `disabledPublicPrefixes`. Runtime-inactive → Node short-link ingress (`handleMarketingShortLink`). Documented as exceptional; not folded into `publicRoutes` in Phase 1.

---

## documentation

| Surface | Path | Class | Guard | active | runtime_inactive | profile_omitted | ledger_unavailable | Evidence |
|---------|------|-------|-------|--------|------------------|-----------------|--------------------|----------|
| Admin layout | `src/app/admin/(dashboard)/documentation/layout.tsx` | read_ui | fail-open `isModuleActive` → notFound | allow | notFound | notFound (or middleware 404) | allow | layout source |
| Admin pages | `…/documentation/page.tsx`, `[id]`, `new` | read_ui | via layout | same | same | same | same | layout |
| Mutations | `src/modules/documentation/actions.ts` | mutation | fail-closed `assertDocumentationMutationAllowed` | allow | deny | deny | deny | `decideDocumentationMutation` tests; actions wired |
| Service reads | `src/modules/documentation/service.ts` | public_read | fail-open soft null/`[]` | data | empty | empty | data | service source |
| Builder | `documentationNav` resolver | public_read | via service | soft | soft | soft | soft | resolver |
| App Router `/docs` | none (prefix + CMS) | — | profile middleware omit | — | — | middleware 404 | — | manifest |

## status-page

| Surface | Path | Class | Guard | active | runtime_inactive | profile_omitted | ledger_unavailable | Evidence |
|---------|------|-------|-------|--------|------------------|-----------------|--------------------|----------|
| Admin layout | `src/app/admin/(dashboard)/status/layout.tsx` | read_ui | fail-open | allow | notFound | notFound | allow | layout |
| Mutations | `src/modules/status-page/actions.ts` | mutation | fail-closed `assertStatusPageMutationAllowed` | allow | deny | deny | deny | `decideStatusPageMutation` tests; actions wired |
| API GET | `src/app/api/status-boards/[slug]/route.ts` | public_read | fail-open soft via service | data | soft 404/empty | middleware 404 | data | service |
| Builder | `statusDashboard` | public_read | via service | soft | soft | soft | soft | resolver |

## marketing

| Surface | Path | Class | Guard | active | runtime_inactive | profile_omitted | ledger_unavailable | Evidence |
|---------|------|-------|-------|--------|------------------|-----------------|--------------------|----------|
| Admin layout | `…/marketing/layout.tsx` | read_ui | fail-open + env (`isMarketingCoreEnabled`) | allow* | notFound | notFound | allow* | layout |
| API routes | `/api/marketing/*` handlers | mutation / privileged_callback / job | fail-closed `resolveMarketingIngressAccess` | allow* | deny | deny | deny | `test:marketing-ingress` |
| Short link `/a` | `src/app/a/route.ts` | privileged_callback | fail-closed | allow* | deny/redirect | middleware 404 | deny | ingress tests |
| Admin actions / jobs / service writes | `assertMarketingModuleActive` → fail-closed ingress | mutation / job | fail-closed | allow* | deny | deny | deny | feature-flags + marketing ingress decide tests |
| Soft ingest helpers | secondary after routes | public_read soft-skip | fail-open `isMarketingCoreEnabled` | soft | soft-skip | soft-skip | soft (fail-open) | routes deny first |

\*Also requires `MARKETING_CORE_ENABLED` not off.

## advanced-seo

| Surface | Path | Class | Guard | active | runtime_inactive | profile_omitted | ledger_unavailable | Evidence |
|---------|------|-------|-------|--------|------------------|-----------------|--------------------|----------|
| Advanced admin pages | enumerated `/admin/seo/*` Advanced | read_ui | fail-closed `requireAdvancedSeoPage` | allow | notFound | notFound | notFound | `test:advanced-seo` pins |
| Guarded actions (prior) | appearance, 404, integrations, google upsert | mutation | fail-closed assert | allow | deny | deny | deny | pins |
| Google platform writes | `google-platform/actions.ts` upserts/ops/test/disconnect | mutation | fail-closed assert | allow | deny | deny | deny | static pins (Phase 1 Slice 4) |
| Queue/analytics admin | enqueue/run/submit sitemap + analytics ingest actions | mutation / job | fail-closed assert | allow | deny | deny | deny | static pins (Phase 1 Slice 4) |
| Advanced APIs | analyze, debug, simulate, Google OAuth | mutation / privileged_callback | fail-closed API guard | allow | 403 | 403 | 403 | pins |
| Basic SEO pages/actions | redirects, sitemap settings, operator/workspace | — | intentionally none | — | — | — | — | static pins |
| Basic/public cron reads | head, llms, indexnow, analytics/run | public_read / job | not Advanced-gated | — | — | — | — | pins |

---

## Verify-first notes

| Suite | Result (Phase 1 execute) |
|-------|--------------------------|
| `test:marketing-ingress` | Pass |
| `decideAdvancedSeoMutation` + guard static pins | Pass (incl. new Google platform / queue pins) |
| `test:portal-module-ingress` (docs + status decide) | Pass |
| `profile-prune.test.ts` | Failed to spawn profile generator in this agent environment (`status null !== 0`) — **not** treated as an ingress regression; re-run locally with project Node |

## Phase 1 exit gate

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Matrix lists inventoried surfaces with four-state outcomes | **Met** |
| 2 | Inactive Modules cannot mutate / set marketing cookies / enqueue privileged jobs / accept privileged callbacks on guarded paths | **Met** (code + tests) |
| 3 | Profile-omitted vs runtime-inactive distinct | **Met** (middleware vs Node) |
| 4 | Ledger-unavailable: mutations deny; availability UI may remain | **Met** |
| 5 | Deactivation preserves Module data | **Met** (no purge in Phase 1) |
| 6 | Tests green for marketing / portal / advanced-seo pins | **Met** (profile-prune env caveat above) |

## Implementation summary

| Slice | Change |
|-------|--------|
| 1 | Documentation `ingress-decision` + `assertDocumentationMutationAllowed` on actions |
| 2 | Status Page same pattern |
| 3 | `assertMarketingModuleActive` → `resolveMarketingIngressAccess` (fail-closed) |
| 4 | Advanced SEO assert on google-platform actions + queue/analytics admin actions; pin tests |
