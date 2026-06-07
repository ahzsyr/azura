# Source architecture

Layered layout under `src/` for the AZURA Islamic travel CMS template.

**Deliverables & rollout:** [docs/DELIVERABLES.md](../docs/DELIVERABLES.md) · [docs/UPGRADE_PLAN.md](../docs/UPGRADE_PLAN.md)

## Layers

| Layer | Path | Responsibility |
|-------|------|----------------|
| **App** | `app/` | Next.js App Router: routes, layouts, API handlers, `generateMetadata` |
| **Components** | `components/` | Shared UI: layout, marketing sections, admin shells, Shadcn `ui/`, forms |
| **Features** | `features/` | Domain modules (services, actions, feature-specific components) |
| **Lib** | `lib/` | Cross-cutting utilities: Prisma client, auth, SEO helpers, `config/`, data facades |
| **Services** | `services/` | Orchestration: caching, batched data loaders |
| **Repositories** | `repositories/` | Prisma/MySQL data access (search, SEO, etc.) |
| **Hooks** | `hooks/` | Reusable React hooks |
| **Types** | `types/` | Shared TypeScript types |
| **Schemas** | `schemas/` | Zod validation (`schemas/builder/` for block props) |
| **i18n** | `i18n/` | next-intl routing and messages |

## Feature modules (`features/`)

Each feature owns business logic and admin/public UI that is specific to that domain:

- **`admin/`** — Server actions for packages, hotels, FAQs, testimonials, gallery, inquiries
- **`auth/`** — `requireAdmin` and session guards
- **`builder/`** — Block tree, editor, renderer, presets, page templates
- **`cms/`** — Pages, posts, scheduling, taxonomy, marketing renderers
- **`media/`** — Uploadthing integration, media manager, picker
- **`search/`** — Indexer, query service, command palette UI
- **`seo/`** — Metadata resolution, sitemap, redirects, structured data, admin forms
- **`storage/`** — JsonStore, page cache, database manager
- **`theme/`** — Draft/publish theme, CSS variables, header/footer config

Import from `@/features/<name>/...`. The alias `@/modules/*` still resolves to `features/` for backward compatibility.

## Dependency direction

```
app → components → features → services / repositories → lib (prisma, config)
                  ↘ schemas, types, hooks
```

- **Routes** stay thin: call `features/*` services or `lib/data`, compose shared `components/`.
- **Repositories** do not import from `app/` or React components.
- **Server actions** live in `features/*/actions.ts` (or `features/admin/actions.ts`).

## Config and performance

Runtime tuning (ISR intervals, image sizes) lives in `lib/config/performance.ts`.

## Adding a new feature

1. Create `src/features/<name>/` with `*.service.ts`, optional `actions.ts`, `components/`, `constants.ts`, `types.ts`.
2. Add `index.ts` barrel for the public API.
3. Add repository code in `repositories/` if MySQL access is non-trivial.
4. Wire routes in `app/` and shared UI only when needed in `components/`.
