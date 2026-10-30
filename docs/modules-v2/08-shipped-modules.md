# Shipped built-in Modules

All entries below are registered in `MODULE_MANIFESTS` (`src/config/deployment-profile/route-registry.ts`).

| ID | Label | Version | Required presets | Required capabilities | Admin prefix(es) | Public / API |
|----|-------|---------|------------------|----------------------|------------------|--------------|
| `documentation` | Documentation | 1.0.0 | `knowledge` | search, versioning, workflow | `/admin/documentation` | `/docs` |
| `status-page` | Status Page | 1.0.0 | — | — | `/admin/status` | `/status`, `/api/status-boards` |
| `marketing` | Marketing | 1.0.0 | — | analytics | `/admin/marketing` | `/api/marketing` (+ `/a` extra binding) |
| `advanced-seo` | Advanced SEO | 1.0.0 | — | — | Enumerated `/admin/seo/*` Advanced paths (never whole `/admin/seo`) — Phase 7 ownership: [plans/phase-7-extraction-advanced-seo.md](./plans/phase-7-extraction-advanced-seo.md) | none |

## Deep dives

- [modules/documentation.md](./modules/documentation.md)
- [modules/status-page.md](./modules/status-page.md)
- [modules/marketing.md](./modules/marketing.md)
- [modules/advanced-seo.md](./modules/advanced-seo.md)

## Shared conventions across shipped Modules

1. Manifest lives at `src/modules/<id>/manifest.ts`.
2. Admin UI for Module-owned features lives under Module folders and/or `src/app/admin/...` routes matching `adminRoutes`.
3. Runtime deactivation must be enforced in Node (layouts, actions, APIs) — not only via middleware.
4. Deactivate retains Module data.
5. Profile omit removes prefixes from the compiled ceiling; App Router files may still exist on disk.
6. `permissions` are registered ACL keys (`{id}.read` / `{id}.manage`) enforced via `requireModulePermission` (Phase 3).

## Profile coverage (typical)

Exact YAML lists vary by profile. As of current docs/tests:

- **enterprise** — includes `advanced-seo` by default among others.
- Other profiles may omit Marketing, Documentation, Status Page, and/or Advanced SEO depending on product packaging.

Always verify the active YAML under `docs/profiles/` and the compiled `src/generated/deployment-profile.json` for the environment under discussion.
