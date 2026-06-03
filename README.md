# AZURA — Islamic Travel CMS Template

A reusable, bilingual (English/Arabic) Umrah and Islamic travel platform built with Next.js, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion, **MySQL**, Prisma, and Uploadthing.

Deploy one instance per client (e.g. SAFEER MEDINA, B R T Trading LLC) by configuring `.env` and the admin **Company** / **Theme** settings.

## Features

- **Public website** — Home, About, Packages, Visa, Hotels & Transport, Gallery, Testimonials, Contact, CMS pages, Blog
- **Bilingual** — Full EN/AR support with RTL/LTR layouts
- **Admin dashboard** — Packages, CMS pages, blog, media library, theme, SEO, database tools
- **Block builder** — Drag-and-drop page blocks with version history
- **Global search** — MySQL FULLTEXT across packages, pages, posts, FAQs, and more
- **Theme system** — Draft/publish theme with live preview
- **JSON storage layer** — Config/cache alongside relational MySQL data
- **Image uploads** — Uploadthing (images, video, documents)
- **SEO** — Unified metadata, redirects, custom 404, dynamic sitemap
- **WhatsApp integration** — Floating button and inquiry links

## Prerequisites

- Node.js 20+
- MySQL 8+
- npm

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env — DATABASE_URL, NEXT_PUBLIC_SITE_NAME, SEED_* credentials
npm run db:migrate
npm run db:seed
npm run dev
```

- **Website:** http://localhost:3000/en
- **Admin:** http://localhost:3000/admin (default: `admin@localhost` / `admin123` from `.env`)

Fresh installs use **AZURA** as the demo brand until you update Company and Theme in admin.

## Client branding

| Layer | Configure via |
|-------|----------------|
| Env fallbacks | `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SITE_SHORT_NAME`, `NEXT_PUBLIC_SITE_TAGLINE` |
| Legal / contact | Admin → Company |
| Logo, colors, header/footer | Admin → Theme (publish) |

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for a full deployment checklist.

## Project Structure

```
src/
├── app/                    # App Router (locale + admin + API)
├── components/             # Shared UI (layout, marketing, admin, ui, forms)
├── config/                 # AZURA site template defaults (site.ts)
├── features/               # Domain modules (admin, auth, builder, cms, media, search, seo, storage, theme)
├── hooks/                  # Shared React hooks
├── lib/                    # Prisma, auth, data, SEO helpers, site-identity
├── repositories/           # Prisma data access
├── services/               # Cache and batched loaders
├── schemas/                # Zod validation (incl. builder block props)
├── types/                  # Shared TypeScript types
└── i18n/                   # next-intl routing
```

See `src/ARCHITECTURE.md` for layer rules and import conventions.

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy AZURA for a new client |
| [docs/DELIVERABLES.md](docs/DELIVERABLES.md) | Full deliverables registry |
| [docs/UPGRADE_PLAN.md](docs/UPGRADE_PLAN.md) | Phased upgrade plan |
| [src/ARCHITECTURE.md](src/ARCHITECTURE.md) | Source layout and dependency rules |

## Admin Routes

| Route | Purpose |
|-------|---------|
| `/admin/theme` | Theme settings (draft/publish) |
| `/admin/media` | Media manager |
| `/admin/pages` | CMS pages + block builder |
| `/admin/posts` | Blog posts |
| `/admin/seo` | SEO metadata |
| `/admin/seo/redirects` | URL redirects |
| `/admin/seo/404` | Custom 404 pages |
| `/admin/database` | JSON import/export & backup |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Prisma Studio |

## Architecture Notes

- **Relational data** (packages, inquiries, users, bookings) stays in MySQL via Prisma.
- **JSON layer** (`JsonStore`, block JSON on pages) is used for theme presets, builder content, and caches.
- **Site identity** resolves: theme brand → company name → env → AZURA default (`src/lib/site-identity.ts`).

## License

Private — AZURA template. All rights reserved.
