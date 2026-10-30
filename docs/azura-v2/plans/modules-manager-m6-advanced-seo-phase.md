# Modules Manager Upgrade — Phase M6 (Advanced SEO extraction)

> **Status:** Complete — M6 first slice done → **M7 done** (theme tokens); next **M7.1**  
> **Prerequisite:** [modules-manager-m5-lifecycle-ux-phase.md](./modules-manager-m5-lifecycle-ux-phase.md) exit  
> **Parent:** [application-platform-upgrade-plan.md](./application-platform-upgrade-plan.md) §7 M6 / U6  
> **Handoff:** **M7** (Option C declarative themes / contribution overlays)  
> **Cursor plan:** `.cursor/plans/m6_advanced_seo_0e304ac4.plan.md`  
> **CI:** `test:advanced-seo` (pure decide + static pins + profile prune) + `profiles:verify`

## Goal

Logically extract **Advanced SEO** as builtin Module `advanced-seo` (Option **1A** + cut **2A**): Advanced admin nav section only. Basic SEO + named public reads stay Core. Fail-closed mutations via `resolveModuleIngressAccess` → pure `decideAdvancedSeoMutation`. Per-page `notFound()` (flat `/admin/seo`, no layout). Generator prunes Advanced nav when the module is omitted (enterprise-only module entry). No physical `platform/` move; no installer rebuild.

**Non-goals:** Ecommerce/themes; `/admin/seo` layout; hand-pruning YAML nav lists; Prisma ownership migration; guarding `analytics`/`head`/`indexnow-key`/`llms`; guarding Basic pages/actions.

### Decisions locked

| Topic | Choice |
|-------|--------|
| Cut | Advanced nav section in `admin-nav.ts` (exclude shared `seo-integrations`) |
| Routes | Enumerated `adminRoutes` prefixes; **never** `/admin/seo` |
| Pages | Per-page `requireAdvancedSeoPage()` → `notFound()` |
| Mutations | Pure `decideAdvancedSeoMutation`; async assert / 403 API |
| Profiles | Add `advanced-seo` to `enterprise.yaml` only; generator prune |
| Builtin | M5 Remove/Purge hidden and refused |

```text
E0  Phase doc + inventory + README
E1  Manifest + pure decide + MODULE_MANIFESTS
E2  enterprise.yaml + generate/verify prune
E3  Per-page / API / action guards + integrations soft-disable
E4  test:advanced-seo + CI
E5  Docs + handoff M7
```

## Acceptance

- Enterprise: Advanced usable when active; deactivate hides Advanced nav (generator) and per-page/API/action refuse
- Omit profile: Advanced nav pruned; Advanced pages 404; Advanced APIs/actions refuse all non-`active` (unit-proven); Basic + public reads work
- Disabled Advanced prefixes survive prune when omitted; no `/admin/seo` disabled prefix
- Direct Advanced action cannot bypass page guard
- Builtin → no Remove UI (M5)
- CI green

## Inventory appendix

### Manifest `navItemIds` (module-owned)

`seo-templates`, `seo-metadata`, `seo-schemas`, `seo-rules`, `seo-google`, `seo-404`, `seo-search-operations`, `seo-search-intelligence`, `seo-so-automation`, plus SI/SO children: `seo-si-entity-graph`, `seo-si-schema`, `seo-si-linking`, `seo-si-content`, `seo-si-authority`, `seo-si-performance`, `seo-si-ai`, `seo-so-operations`, `seo-so-pages`, `seo-so-entities`, `seo-so-content`, `seo-so-google`, `seo-so-monitoring`, `seo-so-settings`.

**Shared / Core (not on module):** `seo-integrations` (page stays; Advanced `?tab=configure` soft-disabled).

### Pages (Advanced href → file)

| Href prefix | File |
|-------------|------|
| `/admin/seo/templates` | `src/app/admin/(dashboard)/seo/templates/page.tsx` |
| `/admin/seo/metadata` | `…/seo/metadata/page.tsx` |
| `/admin/seo/schemas` | `…/seo/schemas/page.tsx` |
| `/admin/seo/rules` | `…/seo/rules/page.tsx` |
| `/admin/seo/google` | `…/seo/google/page.tsx` |
| `/admin/seo/404` | `…/seo/404/page.tsx` |
| `/admin/seo/search-operations/**` | `…/seo/search-operations/**/page.tsx` |
| `/admin/seo/search-intelligence/**` | `…/seo/search-intelligence/**/page.tsx` |

### APIs

| Route | Class | Guard |
|-------|-------|-------|
| `api/seo/head` | Basic/public read | No |
| `api/seo/llms` | Basic/public read | No |
| `api/seo/indexnow-key/[key]` | Basic/public read | No |
| `api/seo/analytics/run` | Cron / Core ingest | No |
| `api/seo/integrations/run` | Cron / Core queue | No |
| `api/manage/seo/tracking` | Basic (google-tags) | No |
| `api/seo/analyze` | Advanced admin | Yes → 403 |
| `api/seo/debug` | Advanced admin | Yes → 403 |
| `api/seo/simulate` | Advanced admin | Yes → 403 |
| `api/seo/analytics/google/oauth/start` | Advanced Google | Yes → 403 |
| `api/seo/analytics/google/oauth/callback` | Advanced Google | Yes → 403 |

### Actions (reverse map — Advanced-only assert)

| Action | Callers | Guard |
|--------|---------|-------|
| `upsertSeoAppearanceAction` | Search Appearance form (templates) | Yes |
| `upsertCustom404Action` | 404 admin form | Yes |
| `upsertGoogleIntegrationAction` | Google Search Console panel | Yes |
| `upsertSeoIntegrationsAction` | Integrations configure panel | Yes (soft-disable UI + assert) |
| `upsertRedirectAction` / sitemap / llms / meta / … | Basic SEO surfaces | **No** |
| Queue / publish / analytics ingest | Integrations queue + Core | **No** |

## Exit

M6 first slice complete. Next: **M7**.
