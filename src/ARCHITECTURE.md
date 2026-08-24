# Source architecture

> **AZURA 2.0:** Canonical architecture lives in [docs/constitution.md](../docs/constitution.md) and [docs/azura-v2.md](../docs/azura-v2.md). This file describes the **current** `src/` layout.

Layered layout under `src/` for the AZURA composable CMS platform.

## Layers

| Layer | Path | Responsibility |
|-------|------|----------------|
| **App** | `app/` | Next.js App Router: thin route handlers, layouts, `generateMetadata` |
| **Components** | `components/` | Shared UI: layout, marketing sections, admin shells, Shadcn `ui/` |
| **Features** | `features/` | Domain modules (services, actions, feature-specific components) |
| **Capabilities** | `capabilities/` | Cross-cutting engines: search, AI, personalization, versioning, workflow |
| **Config** | `config/` | Admin nav, deployment profiles, site constants |
| **Lib** | `lib/` | Cross-cutting utilities: Prisma client, auth, middleware gates, SEO helpers |
| **Middleware** | `middleware/` | Pipeline orchestration (entry point: `src/middleware.ts`) |
| **Repositories** | `repositories/` | Prisma/MySQL data access |
| **Modules** | `modules/` | Optional vertical products (documentation, status-page) |
| **Presets** | `presets/` | Entity preset extensions (product, pricing, release) |
| **i18n** | `i18n/` | next-intl routing and messages |

## Feature modules (`features/`)

Each feature owns business logic and admin/public UI for its domain:

- **`entities/`** — Unified Entity facade (`entityService`), preset registry, storage adapters
- **`cms/`** — Pages, posts, scheduling, taxonomy
- **`builder/`** — Block tree, editor, renderer, page templates
- **`products/`** — Catalog products, `productsApiService`, PDP/compare
- **`catalog/`** — Collections, sync orchestration, admin catalog tools
- **`media/`** — CMS media manager (distinct from `catalog-media` filesystem API)
- **`seo/`** — Metadata, sitemap, redirects, structured data
- **`setup/`**, **`coming-soon/`**, **`account/`** — Middleware gate modules

Search, AI, and personalization live under **`capabilities/`** (not `features/search/`).

## Deployment profiles (Phase 7)

Build-time profile from `AZURA_PROFILE` → `src/generated/deployment-profile.json`. Runtime API: `src/config/deployment-profile/`. Gates admin nav, middleware routes, preset/capability APIs.

## Dependency direction

```
app → components → features / capabilities → repositories → lib (prisma, config)
                  ↘ schemas, types, hooks
```

- **Routes** stay thin: auth + parse + delegate to `features/*` or `capabilities/*` services.
- **Repositories** do not import from `app/` or React components.
- **Middleware** entry (`src/middleware.ts`) delegates to `middleware/pipeline.ts` and feature gate modules.

## Prisma schema (Phase 8)

Multi-file schema by domain: `prisma/schema/mysql/` and `prisma/schema/postgresql/`. Entry shims: `prisma/schema.prisma`, `prisma/schema.postgresql.prisma`. Generate via `npm run db:generate`.

## Related docs

- [constitution.md](../docs/constitution.md) — platform boundaries and fitness tests
- [deployment-profiles.md](../docs/deployment-profiles.md) — composable install bundles
- [admin-ia.md](../docs/admin-ia.md) — target admin navigation
- [entity-adapter-layer.md](../docs/entity-adapter-layer.md) — entity facade and adapters
