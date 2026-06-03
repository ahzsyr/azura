# Platform Upgrade — Deliverables Registry

This document inventories everything delivered for the AZURA platform upgrade. All changes are **additive** and **backward-compatible** unless noted. Production behavior is preserved via shims (`@/modules/*` → `features/`, `@/lib/actions/admin` → `features/admin/actions`).

**Related docs:** [Architecture](../src/ARCHITECTURE.md) · [Upgrade Plan](./UPGRADE_PLAN.md)

---

## 1. Updated Prisma schema

**File:** `prisma/schema.prisma`

### Core (relational marketing & operations)

| Model | Purpose |
|-------|---------|
| `User` | Admin/customer accounts |
| `PackageCategory`, `Package`, `PackageImage` | Umrah packages |
| `Hotel`, `Service`, `Gallery`, `Testimonial` | Marketing content |
| `FAQ`, `CompanyInfo` | Site copy |
| `Inquiry`, `Booking` | Lead capture |
| `SeoSettings` | Legacy per-page-key SEO (still used for static routes) |

### Platform upgrade (CMS, media, search, SEO)

| Model | Purpose |
|-------|---------|
| `SiteTheme` | Draft/publish theme (colors, header/footer JSON) |
| `JsonStore` | Namespaced JSON config/cache |
| `MediaFolder`, `MediaAsset`, `MediaUsage` | Media library + usage tracking |
| `CmsPage`, `CmsPageRevision` | Block-based pages + history |
| `Post`, `PostCategory`, `PostTag`, `PostAuthor` | Blog + taxonomy |
| `SearchDocument` | Denormalized search index (EN/AR) |
| `SeoMeta`, `SeoRedirect`, `Custom404` | Unified SEO layer |

### Enums

`ContentStatus`, `ThemePreset`, `MediaType`, `SearchEntityType`, `RedirectType`, `HotelCity`, `GalleryCategory`, `ServiceType`, `InquiryType`, `InquiryStatus`, `BookingStatus`, `UserRole`

### Apply schema locally

```bash
npm run db:migrate
npm run db:generate   # if you add a generate script; otherwise migrate runs generate
```

---

## 2. Database migrations

**Directory:** `prisma/migrations/`

| Migration | Description |
|-----------|-------------|
| `20260530200231_init` | Baseline: users, packages, hotels, inquiries, company, legacy SEO |
| `20260531120000_platform_upgrade` | **Additive** tables: theme, JsonStore, media, CMS, posts, search, SeoMeta, redirects, custom 404 |
| `20260531140000_search_fulltext` | `FULLTEXT` index on `SearchDocument(title, body)` for global search |

### Notes

- Migrations do **not** drop existing tables or columns.
- If `20260531140000_search_fulltext` fails on an older MySQL build, apply the SQL manually after `platform_upgrade`.
- Seed rebuilds search index: `npm run db:seed` (imports `features/search/search-indexer.service`).

---

## 3. Folder structure

```
src/
├── app/                         # Next.js App Router
│   ├── [locale]/                # Public marketing (en/ar)
│   ├── admin/                   # Dashboard + auth
│   ├── api/                     # REST handlers
│   ├── robots.ts, sitemap.ts
├── components/                  # Shared UI (not domain-specific)
│   ├── admin/                   # Package form, gallery, sidebar, login
│   ├── forms/                   # Inquiry form
│   ├── layout/                  # Header, footer, locale, WhatsApp
│   ├── marketing/               # Home sections, cards, gallery
│   ├── motion/                  # Lazy framer-motion
│   ├── packages/                # Package cards, comparison
│   ├── theme/                   # Theme provider + CSS injection
│   └── ui/                      # Shadcn primitives + OptimizedImage
├── features/                    # Domain modules (preferred import path)
│   ├── admin/                   # CRUD server actions (packages, FAQs, …)
│   ├── auth/                    # requireAdmin guard
│   ├── builder/                 # Block editor, renderer, presets
│   ├── cms/                     # Pages, posts, scheduling
│   ├── media/                   # Uploadthing, picker, manager
│   ├── search/                  # Indexer, service, command UI
│   ├── seo/                     # Metadata, sitemap, JSON-LD, admin forms
│   ├── storage/                 # JsonStore, page cache, database manager
│   └── theme/                   # Theme service, settings form
├── hooks/                       # useDebouncedValue, useMounted
├── i18n/                        # next-intl routing
├── lib/                         # prisma, auth, data, seo.tsx, config/
│   └── actions/admin.ts         # Shim → features/admin/actions
├── repositories/                # Prisma data access
├── services/                    # cache tags, data-loaders
├── schemas/                     # Zod (see §8)
└── types/                       # Shared TS types (see §7)
```

**Path aliases (`tsconfig.json`):** `@/*`, `@/features/*`, `@/modules/*` (alias to features), `@/repositories/*`, `@/services/*`, `@/schemas/*`, `@/types/*`

---

## 4. API routes

| Route | Method | Auth | Handler / feature |
|-------|--------|------|-------------------|
| `/api/auth/[...nextauth]` | * | Public | NextAuth session |
| `/api/inquiries` | POST | Public | Zod `inquirySchema` → Prisma |
| `/api/bookings` | GET, POST | Varies | Bookings stub |
| `/api/redirects` | GET | Public | Active SEO redirects |
| `/api/search` | GET | Public | `searchService` — `q`, `locale`, `mode=suggest`, `types` |
| `/api/admin/search` | GET | Admin session | Same search + admin paths in metadata |
| `/api/uploadthing` | * | Admin upload | Uploadthing + `createMediaFromUpload` |

### Search query parameters

- `q` — query string  
- `locale` — `en` \| `ar` (default `en`)  
- `mode` — `search` \| `suggest`  
- `types` — comma-separated `SearchEntityType` values  

### Server actions (not REST, but public API surface)

Domain mutations live in `features/*/actions.ts` and `features/admin/actions.ts`, invoked from admin forms. Prefer extending feature actions over new monolithic `lib/actions` files.

---

## 5. Admin pages

| Route | Feature module | Notes |
|-------|----------------|-------|
| `/admin/login` | auth | Credentials login |
| `/admin` | — | Dashboard + search index rebuild |
| `/admin/packages`, `/new`, `/[id]` | admin | Package CRUD + images |
| `/admin/pages`, `/new`, `/[id]` | cms + builder | Block editor |
| `/admin/posts`, `/new`, `/[id]` | cms | Blog editor |
| `/admin/posts/categories`, `/tags`, `/authors` | cms | Taxonomy |
| `/admin/media` | media | Folder tree, upload |
| `/admin/theme` | theme | Draft/publish |
| `/admin/hotels`, `/services`, `/gallery`, `/testimonials`, `/faqs` | admin | Content CRUD |
| `/admin/company` | admin | CompanyInfo |
| `/admin/inquiries` | admin | Status workflow |
| `/admin/seo` | seo | Static page meta |
| `/admin/seo/redirects` | seo | URL redirects |
| `/admin/seo/robots` | seo | robots.txt config (JsonStore) |
| `/admin/seo/structured-data` | seo | Global JSON-LD |
| `/admin/seo/404` | seo | Per-locale custom 404 blocks |
| `/admin/database` | storage | JSON CRUD, backup, schema browser |

**Layout:** `app/admin/(dashboard)/layout.tsx` — `AdminSidebar` + `AdminHeader` (includes admin search command).

---

## 6. Reusable components

### Shared (`src/components/`)

| Component | Use |
|-----------|-----|
| `ui/button`, `input`, `textarea`, `label`, `card`, `dialog`, `badge` | Shadcn base |
| `ui/optimized-image` | Next/Image + sizes from `lib/config/performance` |
| `layout/header`, `footer`, `locale-switcher`, `whatsapp-fab` | Site chrome |
| `marketing/*` | Home hero/sections, cards, FAQ accordion, trust badges |
| `packages/package-card`, `package-comparison` | Package listing |
| `forms/inquiry-form` | Contact / package inquiries |
| `motion/lazy-motion`, `animated-section` | Code-split animations |
| `admin/sidebar`, `admin-header`, `package-form`, `gallery-admin`, … | Admin shell |

### Feature-owned (`src/features/*/components/`)

| Module | Key components |
|--------|----------------|
| `builder` | `block-editor`, `block-renderer`, `block-tree-editor`, `block-field-editor` |
| `cms` | `cms-page-renderer`, `page-editor-form`, `post-editor-form`, tables |
| `media` | `media-manager`, `media-picker-dialog`, `media-picker-field` |
| `search` | `search-command`, `search-lazy` |
| `seo` | `seo-meta-form`, `seo-meta-panel`, `page-seo-jsonld`, `global-structured-data` |
| `storage` | `database-manager` |
| `theme` | `theme-settings-form`, `theme-preview-panel` |

**Rule:** New domain UI goes under `features/<domain>/components/`. Only promote to `components/` when used across two or more features.

---

## 7. Types

| File | Contents |
|------|----------|
| `types/builder.ts` | `BlockType`, `BlockNode`, `PageBlocks` |
| `types/cms.ts` | CMS/post editor types |
| `types/theme.ts` | Theme config shapes |
| `types/api.ts` | `ActionResult<T>`, `ok()`, `fail()` |
| `types/next-auth.d.ts` | Session user augmentation |

Prisma-generated types come from `@prisma/client`. Feature-specific types may live in `features/<name>/types.ts` (e.g. `seo/types.ts`, `storage/types.ts`).

---

## 8. Validation schemas (Zod)

| Schema file | Validates |
|-------------|-----------|
| `schemas/auth.ts` | Login credentials |
| `schemas/inquiry.ts` | Public inquiry API |
| `schemas/package.ts` | Admin package forms |
| `schemas/company.ts` | Company info form |
| `schemas/cms.ts` | CMS pages, posts, taxonomy |
| `schemas/media.ts` | Media queries / uploads |
| `schemas/seo.ts` | SEO meta, redirects |
| `schemas/theme.ts` | Theme settings |
| `schemas/builder/` | Block tree + per-block props (`props.ts`) |
| `schemas/blocks/` | Re-exports `builder` (deprecated path) |

Barrel: `schemas/index.ts` — import `@/schemas` or specific files.

---

## 9. Documentation comments

| Location | What was documented |
|----------|----------------------|
| `prisma/schema.prisma` | File header: schema layers + migration pointer |
| `src/lib/prisma.ts` | Singleton client usage |
| `src/services/cache.ts` | Cache tags + revalidation helpers |
| `src/ARCHITECTURE.md` | Layer rules, dependency direction |
| `docs/DELIVERABLES.md` | This registry |
| `docs/UPGRADE_PLAN.md` | Phased rollout |
| Feature `index.ts` barrels | Public export surface |
| `@deprecated` shims | `lib/actions/admin`, `schemas/blocks` |

When adding features, document **non-obvious** business rules only (scheduling, index invalidation, JsonStore namespaces).

---

## 10. Upgrade plan

See **[UPGRADE_PLAN.md](./UPGRADE_PLAN.md)** for phased, incremental work (production-safe, no big-bang refactors).

---

## Verification checklist

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev          # http://localhost:3000/en
# Admin: http://localhost:3000/admin
npm run build        # TypeScript must pass; admin prerender may need DB at build time
```

| Check | Expected |
|-------|----------|
| Public home/packages | Loads with ISR + cached loaders |
| `/api/search?q=umrah` | JSON results + suggestions |
| Admin CMS page save | Revalidates cache + search index |
| Theme publish | Header/footer reflect draft |
| `/admin/database` | JsonStore namespaces visible |

---

*Last updated: platform upgrade delivery (items 1–10).*
