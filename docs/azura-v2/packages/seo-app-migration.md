# Advanced SEO app migration

Status: **M6 logical extraction complete.** **Phase 7 ownership RFC approved** (modules-v2 authority: [`docs/modules-v2/plans/phase-7-extraction-advanced-seo.md`](../../modules-v2/plans/phase-7-extraction-advanced-seo.md)). Physical relocate of `src/features/seo` / Search Intelligence trees remains a follow-on RFC.

Advanced SEO is the builtin Module `advanced-seo`. The read path (`SeoMeta`, sitemap, redirects, Basic SEO admin) remains Core. Advanced admin write surfaces are gated by the module without moving Prisma ownership yet.

## Logical cut (done)

- Manifest kind `app`, id `advanced-seo`, registered in `MODULE_MANIFESTS`.
- Admin nav items from the Advanced SEO group (excluding shared `seo-integrations`) are module `navItemIds`.
- `adminRoutes` are exact Advanced prefixes only — **never** `/admin/seo` (would take Basic down).
- `/admin/seo/**` is **flat** (no `layout.tsx`). Guards are **per-page** `requireAdvancedSeoPage()` → `notFound()`.
- Mutations use pure `decideAdvancedSeoMutation` over `resolveModuleIngressAccess` (fail-closed). APIs return `403 { ok: false, reason }`.
- Enterprise profile lists `advanced-seo`; other profiles omit it — generator deletes Advanced nav ids and keeps disabled Advanced prefixes.
- Shared integrations page stays Core; Advanced `?tab=configure` soft-disables when the module is inactive; configure save actions refuse.

## Still later

- Move `src/features/seo/platform/` into a package tree / physical app package.
- Package SQL only for tables created after a reviewed Prisma split. Existing models stay until migration copies them.
- Hot-load / ZIP executable install remains out of scope (Modules Manager is not a plugin host).

## Guards (current)

- Activating the module (profile include + SiteFeature) enables Advanced nav and allows mutations.
- Deactivating removes Advanced admin links from the effective surface and refuses Advanced pages/APIs/actions.
- Basic pages that store SEO fields continue to render. Public metadata read paths do not check the module flag.
