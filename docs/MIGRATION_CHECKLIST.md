# Migration Checklist (Astro `sample/` → Next.js)

Statuses:

- **Pending**
- **In Progress**
- **Complete**

---

## Design System (priority 1)

- **Pending**: Port Astro CSS variable token contract (`--p`, `--a`, `--sur`, `--t`, `--m`, `--bg`, `--az-fs-*`, `--az-sp-*`)
- **Pending**: Align Tailwind breakpoints with Astro (notably `md=1080px`) or introduce compatibility utilities
- **Pending**: Verify typography/font mapping (display/body/mono) and update theme resolver output to provide variables
- **Pending**: Verify component-level CSS reused from Astro does not conflict with current Next base styles

## Media Manager (priority 2)

- **Pending**: Confirm `public/uploads/*` folder structure matches Astro
- **Pending**: Implement “replace and update references” for JSON-on-disk content (if products/collections remain file-based)
- **Pending**: Confirm relationships scanner includes products/collections once introduced
- **Pending**: Confirm Next Image config supports `/uploads/*` and any remote sources present in product JSON

## Collections (priority 3)

- **Pending**: Add `src/data/collections.json` + locale overrides directory layout
- **Pending**: Port rule engine + hierarchy helpers + match semantics
- **Pending**: Implement `/[locale]/collections` index route (SEO parity)
- **Pending**: Implement `/[locale]/collections/[slug]` detail route with listing UX parity
- **Pending**: Implement collection sync + validation report service (server-only)

## Products (priority 4)

- **Pending**: Copy product JSON schema + strict TS types
- **Pending**: Implement filesystem product loader with locale fallback merge
- **Pending**: Implement products API routes (CRUD + import pipeline)
- **Pending**: Implement product listing catalog (facets/filter/search/url-state)
- **Pending**: Implement PDP route with tabs/variation matrix/gallery + SEO parity (JSON-LD, canonical, hreflang)

## Mega Menu (priority 5)

- **Pending**: Update href resolution to point `collection` → `/collections/<slug>` and `product` → `/products/<slug>`
- **Pending**: Verify mega-menu child thumbnail images resolve (collections/products media)
- **Pending**: One-time import/seed of `sample/src/data/header.json` into Next JsonStore (if desired)

## Animations & Motion (priority 6)

- **Pending**: Preserve `[data-animation]` scroll reveal contract
- **Pending**: Port preloader/page-transition configuration surface (theme-driven)
- **Pending**: Ensure reduced-motion behavior parity

