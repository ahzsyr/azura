# Next.js usage audit (Phase 5.6)

Lightweight audit notes. Goal: each piece of state/data lives at the cheapest appropriate layer — not “convert everything to Server Components.”

## Findings (repo snapshot)

| Pattern | Status |
|---------|--------|
| App Router | Canonical; no Pages Router product paths |
| Admin `"use client"` | Expected for editors, tables, forms; keep server loaders for page data |
| TanStack Query | Confined to search query layer — do not expand |
| nuqs | URL state for search/listing — keep |
| Draft Mode / ISR / revalidate | Public CMS path from Phases 2–4 — keep |
| Admin `loading.tsx` | Sparse (SEO routes only) — improve opportunistically when touching segments |
| `cacheComponents` / `partialPrefetching` | **Deferred** (see below) |
| React `<Activity />` editor pilot | **Phase 6 candidate** — not Phase 5 exit |

## Cache Components pilot — evaluated / deferred

Enabling `cacheComponents` + `partialPrefetching` globally (or even on all of `/admin`) risks extra prefetch → Node process → Prisma → MySQL load on Hostinger shared hosting.

**Phase 5 outcome:** deferred until a measured single-segment pilot shows net UX gain without process pressure.

If revisited later:

1. Pick one cheap admin list segment (not the page editor).
2. Add Suspense + `loading.tsx`.
3. Enable flags only for that experiment branch.
4. Measure: navigation latency, prefetch count, Hostinger process/memory, DB query volume.
5. Prefer shell prefetch; avoid aggressive `prefetch={true}` on editor/data-heavy routes.

Public CMS continues Phase 2–4 published revision + revalidation — Cache Components is not a replacement for that model.

## Guidance when touching admin code

- Prefer Server Actions for mutations already behind `requireAdmin`.
- Avoid new client fetch wrappers for CMS CRUD.
- Add `loading.tsx` / `error.tsx` when editing a segment layout.
- Prefer Tailwind 4 utilities opportunistically; no Tailwind migration project.
