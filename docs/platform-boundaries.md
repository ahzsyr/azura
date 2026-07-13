# AZURA Platform Boundaries

> **Constitution v1.0** · Part of [AZURA Architectural Constitution](./constitution.md)  
> **Principles:** [architecture-principles.md](./architecture-principles.md) · **Concepts:** [domain-model.md](./domain-model.md)

Where logic **may** live, where it **must not** live, and how to **test** proposals before implementation.

---

## Dependency direction

```text
Core Platform
  ↑ consumed by
Capabilities
  ↑ consumed by
Experience Layer (entities, resolvers, view-models, templates, collections)
  ↑ consumed by
Presets · Modules
  ↑ consumed by
CMS / Builder (Pages, Blocks)
  ↓
Experience (visitor outcome)
```

**Forbidden:** upward dependencies (e.g. `seo/` importing preset code).

---

## Owner map

### Core Platform

| Path (current / target) | Owns |
|-------------------------|------|
| `features/cms/`, `app/` pages & posts | Pages, Posts, menus, editorial workflow |
| `features/builder/` | Blocks, sections, layouts, page composition |
| `features/seo/` | Meta, schema, redirects, sitemap (core tier) |
| `features/media/` | Assets, folders, usage, upload |
| `features/i18n/`, `features/translation/` (field resolution) | Locales, UI messages, entity field translation |
| `features/forms/`, inquiries, newsletter, whatsapp | Leads |

### Capabilities (target structure)

| Path | Owns |
|------|------|
| `capabilities/search/` | Indexing, query, facets, autocomplete, portal directory search |
| `capabilities/workflow/` | Approval stages, assignments |
| `capabilities/versioning/` | Version history API |
| `capabilities/ai/` | Translation assist, content generation |
| `capabilities/personalization/` | Segments, geo, dynamic visibility |
| `capabilities/analytics/` | Search analytics, engagement snapshots |

### Experience Layer (not a competing engine)

| Path | Owns |
|------|------|
| `entities/` (from `features/content/` + unified engine) | EntityType, Entity CRUD, schema |
| `collections/` | Collection membership, hierarchy |
| `resolvers/` | Entity → ViewModel |
| `view-models/` | ViewModel type definitions |
| `templates/` | Template registry and renderers |
| `presets/*/` | Preset schema, validation, preset-specific resolvers |

### Modules (target)

| Path | Owns |
|------|------|
| `modules/documentation/` | Doc portal UX, navigation, versioned reading experience |
| `modules/status-page/` | Incidents, maintenance, public status |
| `modules/enterprise-translation/` | TMS jobs, memory, review UI |
| `modules/advanced-seo/` | GSC/Bing, crawl ops, rich-result monitoring |
| `modules/booking-engine/` | Scheduling infrastructure (future) |

---

## Allowed dependency examples

```text
presets/product/resolvers/card.ts     → entities/, localization/, media/, seo/
templates/product-card.tsx            → view-models/ types only
builder/blocks/product-grid.tsx       → templates/, resolvers/ API
modules/documentation/                → capabilities/search/, capabilities/versioning/
cms/page.tsx                          → builder/, seo/
```

---

## Forbidden patterns

### Ownership violations

| Pattern | Why forbidden | Use instead |
|---------|---------------|-------------|
| `presets/product/seo/` pipeline | Duplicates SEO owner | `seo/` + SeoMeta |
| `presets/partner/translation-registry` | Duplicates localization | Entity field schema + ET |
| `presets/knowledge/media-upload` | Duplicates media | `media/` API |
| `presets/pricing/search-indexer` | Duplicates search | Search Capability profile |
| Template imports `@/lib/prisma` | Breaks ViewModel boundary | Resolver → ViewModel |

### Structural violations

| Pattern | Why forbidden |
|---------|---------------|
| `features/experience-engine/` parallel to CMS | Recreates today's split |
| New top-level concept without Evolution Rule | Architecture inflation |
| Admin nav: Products + Catalog Items + Listings + Offerings as peers | User IA debt |
| `/api/knowledge/*`, `/api/product/*` long-term separate trees | Use unified entity API + Capability |

### Preset creep (requires Module review)

| Signal | Example |
|--------|---------|
| Dedicated worker queue in preset | Knowledge approval pipeline |
| Portal-scale navigation | Full documentation tree |
| Separate public app shell | Status page subscriber UX |

---

## Architecture Fitness Tests

Apply to every RFC and significant PR.

### Fitness Test 1 — Concept decomposition

> Can this be expressed as **Core Concept + Preset (+ Capability)**?

| Result | Action |
|--------|--------|
| Yes | Do **not** create a Module |
| No — needs vertical UX + infrastructure | Module review |

---

### Fitness Test 2 — Single Ownership

> Does this introduce a **second owner** for SEO, Media, Translation, or routing?

| Result | Action |
|--------|--------|
| Yes | **Reject** |
| No | Continue |

---

### Fitness Test 3 — Capability Ownership

> Does this **re-implement** Search, Workflow, Versioning, AI, Personalization, or Analytics?

| Result | Action |
|--------|--------|
| Yes | **Reject** — consume Capability |
| No | Continue |

---

### Fitness Test 4 — ViewModel boundary

> Does a Template (or block renderer acting as template) import **raw storage**?

Includes: Prisma client, `Product.payload`, `ContentItem.attributes`, direct repository calls.

| Result | Action |
|--------|--------|
| Yes | **Reject** — add Resolver + ViewModel |
| No | Continue |

**Enforcement (Phase 4):** ESLint `no-restricted-imports` on `src/templates/**` — run `npm run lint:templates`. Resolver specs: [view-model-resolvers.md](./view-model-resolvers.md).

---

### Fitness Test 5 — Preset Creep

> Does a **Preset** introduce infrastructure (workers, dedicated index, portal nav, standalone admin product)?

| Result | Action |
|--------|--------|
| Yes | **Module promotion review** |
| No | Preset approved |

---

### Fitness Test 6 — No parallel engine

> Is this a new top-level **engine** parallel to CMS?

| Result | Action |
|--------|--------|
| Yes | **Reject** |
| No | Continue |

---

### Fitness Test 7 — Entity vs Page

> Is **reusable structured data** stored only as Page blocks with no Entity?

| Result | Action |
|--------|--------|
| Yes, reusable across pages/search/i18n | **Create Entity + Template** |
| No, one-off editorial | Page is correct |

---

### Fitness Test 8 — Deployment Profile

> Should this ship in **every** installation by default?

| Result | Action |
|--------|--------|
| No | Gate via [deployment profile](./deployment-profiles.md) |
| Yes | Document justification in RFC |

---

## Feature proposal template

Copy into RFCs and significant PR descriptions.

```markdown
## Feature proposal

**Title:**
**Author:**
**Deployment profile(s):**

### Constitution check
- [ ] Core concept served: ___
- [ ] Classification: Preset / Module / Capability-only / Core change
- [ ] Fitness Test 1 passed
- [ ] Fitness Test 2 passed (Single Ownership)
- [ ] Fitness Test 3 passed (Capability Ownership)
- [ ] Fitness Test 4 passed (ViewModel)
- [ ] Fitness Test 5 passed (Preset Creep) — N/A if not preset
- [ ] Fitness Test 6 passed — N/A if not new package
- [ ] Fitness Test 7 passed — N/A if not content storage
- [ ] Fitness Test 8 passed (Profile)

### Evolution Rule (if new vocabulary)
- Existing concepts considered: ___
- Why insufficient: ___

### Consumes (do not re-implement)
| Service | Used | API entry |
|---------|------|-----------|
| SEO | yes/no | |
| Localization | yes/no | |
| Media | yes/no | |
| Search | yes/no | |
| Workflow | yes/no | |
| Versioning | yes/no | |
| AI | yes/no | |

### Admin IA (User Language Rule)
- User-facing label: ___
- Nav section: ___

### Storage & routes
- New tables? yes/no — justification: ___
- New `/api/*` tree? yes/no — justification: ___
- ViewModel IDs: ___
- Template IDs: ___
```

---

## Code review quick reference

| Question | Pass criteria |
|----------|---------------|
| Where does this live? | Matches owner map above |
| Who owns SEO for this entity? | Always `seo/` |
| Who owns search indexing? | Search Capability |
| Can admin user understand the nav label? | User Language Rule |
| Template file imports | ViewModel types only |

---

## Related documents

- [architecture-principles.md](./architecture-principles.md)
- [domain-model.md](./domain-model.md)
- [deployment-profiles.md](./deployment-profiles.md)
- [rfc-001-knowledge-base-reclassification.md](./rfc-001-knowledge-base-reclassification.md) — worked example
