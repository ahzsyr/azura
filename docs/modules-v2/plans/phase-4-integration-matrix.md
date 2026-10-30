# Phase 4 — Project-wide integration matrix

**Status:** Complete (implementation + contract evidence)  
**Parent:** [executive-application-platform-implementation-plan.md](./executive-application-platform-implementation-plan.md) Phase 4  
**Locks:** [phase-0-decisions-freeze.md](./phase-0-decisions-freeze.md)  
**Prior exits:** [phase-1-runtime-ingress-matrix.md](./phase-1-runtime-ingress-matrix.md) · [phase-2-state-transitions.md](./phase-2-state-transitions.md) · [phase-3-settings-and-permissions.md](./phase-3-settings-and-permissions.md)

## Objective

One supported mechanism per Module↔Core surface. No contribution key presented as operational without a live consumer. Four shipped Modules conform or have an explicit migration path.

## Contribution key outcomes (Phase 4)

| Key | Outcome |
|-----|---------|
| `adminNavItemIds` | **Keep operational** |
| `adminRoutePrefixes` | **Keep operational** (dashboard uses `[0]` only; gating uses Module `adminRoutes`) |
| `blockTypes` | **Keep operational** |
| `publicRoutePrefixes` | **Removed** from `PackageContributions` — gating SoT = `ModuleManifest.publicRoutes` → `MODULE_ROUTE_REGISTRY` |
| `dashboardSections` | **Removed** from `PackageContributions` — dashboard = `label` + `adminRoutePrefixes[0]` |
| `themeTokens` under contributions | **Not-in-contract** (unchanged) |

Validation **rejects** removed keys with an actionable error (fail closed).

---

## Integration matrix

| Surface | Mechanism | Owner | Status | Evidence |
|---------|-----------|-------|--------|----------|
| Admin routes | `ModuleManifest.adminRoutes` → profile `disabledAdminPrefixes` | Profile generator + Module manifests | supported | `route-registry.ts`, `generate-deployment-profile.mjs` |
| Public / API routes | `ModuleManifest.publicRoutes` → `MODULE_ROUTE_REGISTRY` → profile disabled public/api prefixes | same | supported | `route-registry.ts` |
| Extra public bindings | Core `MODULE_EXTRA_PUBLIC_BINDINGS` (Marketing `/a`) | Profile generator | exception | `module-extra-bindings.ts` |
| Admin nav | `navItemIds` + profile `enabledNavItemIds` + inactive hide + extension overlays | Core admin nav + contributions | supported | `contributions.ts`, admin layout |
| Dashboard cards | Built-in manifests: `label` + `adminRoutePrefixes[0]` | `listActivePackageSections` | supported | `contributions.ts` |
| Builder blocks | `contributedBlockTypes` → `requires.module` → `isBlockTypeEnabled`; overlays **admin-only** | Builder registry + Modules | supported | `getModuleForContributedBlock` |
| Settings | Phase 3 `ModuleSetting` + registry | Core platform | supported | `module-settings.ts` |
| Permissions | Phase 3 `requireModulePermission` | Core auth | supported | `module-permissions.ts` |
| Jobs | Module-owned jobs + fail-closed ingress (+ admin/cron auth) | Owning Module | supported | Marketing `jobs/` reference |
| Events / plugin bus | — | — | **deferred** | Explicit non-goal |
| Core services | Module→Core import allowlist | Constitution / boundary script | supported | § Core allowlist below |
| Availability UI | Fail-open `isModuleActive` | Phase 1 | supported | cite Phase 1 |
| Mutation ingress | Fail-closed `resolveModuleIngressAccess` | Phase 1 | supported | cite Phase 1 |

---

## Core import allowlist (Modules may import)

| Prefix / package | Role |
|------------------|------|
| `@/config/deployment-profile/**` | Profile + SiteFeature + ingress |
| `@/features/auth/**` | Guards, section + Module ACL |
| `@/lib/prisma`, `@/lib/**` (shared utils) | Data + utilities |
| `@/platform/packages/**` | Installer, settings, contributions |
| `@/features/i18n/**`, `@/features/translation/**` | Locale / translation |
| `@/features/portal/lib/**` | Shared portal admin helpers |
| `@/services/cache`, `@/services/data-loaders` | Cache / loaders |
| `@/components/**`, `@/types/**` | UI / types |

### Documented bridge exceptions (migration → Phase 7 / Core façade)

| Edge | Why | Migration path |
|------|-----|----------------|
| `features/seo/**` → `modules/advanced-seo/**` | Advanced SEO pages/actions still live partly under SEO trees | **Phase 7 RFC approved** (logical ownership); physical relocate **deferred** — [phase-7-extraction-advanced-seo.md](./phase-7-extraction-advanced-seo.md) |
| `features/search-intelligence/**` → `modules/advanced-seo/**` | Search Intelligence classified as Advanced Module surface | Same RFC; bridge exception documented |
| `features/seo/google-platform/**` → `modules/marketing/providers/google-ads/**` | Shared Google Ads credentials | Later Core-owned Ads credential façade |
| `modules/marketing/**` → `features/seo/integrations/secret-seal.server` | Secret sealing helper | Keep as Core lib (allowed); Marketing→SEO platform internals otherwise discouraged |

Modules must not import sibling Module packages except via Core-owned shared libs. Boundary script flags non-allowlisted / non-excepted edges.

---

## Jobs policy

**Supported:** Module-owned job runners under `src/modules/<id>/…` with:

1. Fail-closed Module ingress (`resolveModuleIngressAccess` / Module decide helper)
2. Auth (`requireModulePermission` / section / cron secret as appropriate)
3. No ZIP-registered handlers

**Deferred:** generic Module event bus / plugin hooks.

Reference: Marketing `/api/marketing/jobs/run` + `src/modules/marketing/jobs/`.

---

## Four-Module conformance

| Module | Routes | Nav | Blocks | Jobs | Settings | Permissions | Notes |
|--------|--------|-----|--------|------|----------|-------------|-------|
| documentation | admin + public via manifest | `documentation` | `documentationNav` | none | Phase 3 pilot | `documentation.*` | Conforms |
| status-page | admin + `/status` + API | `status-page` | `statusDashboard` | none | registered | `status-page.*` | Conforms |
| marketing | admin + `/api/marketing` + **extra `/a`** | marketing nav ids | none | Module-owned | Phase 3 pilot | `marketing.*` | Conforms (exception binding) |
| advanced-seo | enumerated Advanced admin/API (impl under `features/seo` + SI) | via SEO section | none | queue via SEO trees | deferred full registry | `advanced-seo.*` | **Phase 7 RFC approved**; physical ownership move deferred |

---

## Implementation status

| Slice | Topic | Status | Evidence |
|-------|-------|--------|----------|
| P4.1 | This matrix | **Done** | This file + `07` pointer |
| P4.2 | Contribution honesty | **Done** | Removed `publicRoutePrefixes` / `dashboardSections`; inventory + package-contract tests |
| P4.3 | Route/nav ownership | **Done** | `MODULE_ROUTE_REGISTRY` SoT comments; `module-extra-bindings`; uniqueness tests |
| P4.4 | Builder conformance | **Done** | `builder-conformance-pin.test.ts` + overlay public/admin pin |
| P4.5 | Jobs/events policy | **Done** | `module-job-ingress.ts`; event bus deferred in `07` |
| P4.6 | Core APIs / cycles | **Done** | Allowlist in this file; `check-module-import-boundaries.mjs` (0 violations) |
| P4.7 | Four-Module conform | **Done** | Conformance table above; Advanced SEO → Phase 7 path |
| P4.8 | Exit artifact | **Done** | README / executive / gap matrix #3 |

**Exit gate:** Matrix complete; no fake-operational contributions; four Modules conform or have migration paths; contract tests green (`npm run test:phase4-integration` + `npm run check:module-import-boundaries`).
