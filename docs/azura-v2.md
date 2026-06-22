# AZURA 2.0 — Master Plan & Architectural Constitution

> **Status:** Phase 0 draft complete — pending team review & Constitution v1.0 freeze  
> **Purpose:** Single source of truth for AZURA 2.0 — conversation summary, final architecture, phased rollout, and governance. Build phases in sequence from this document without losing decisions.  
> **Constitution:** [constitution.md](./constitution.md)

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Conversation summary](#2-conversation-summary)
3. [What AZURA is and is not](#3-what-azura-is-and-is-not)
4. [Architectural constitution](#4-architectural-constitution)
5. [Runtime flow](#5-runtime-flow)
6. [Layer model (final — frozen)](#6-layer-model-final--frozen)
7. [Core concepts](#7-core-concepts)
8. [Extension model](#8-extension-model)
9. [Ownership rules](#9-ownership-rules)
10. [Governance](#10-governance)
11. [Deployment profiles](#11-deployment-profiles)
12. [Admin information architecture](#12-admin-information-architecture)
13. [Open decision: Preset vs Custom EntityTypes](#13-open-decision-preset-vs-custom-entitytypes)
14. [Legacy mapping (current codebase)](#14-legacy-mapping-current-codebase)
15. [Phase 0 deliverables (constitution docs)](#15-phase-0-deliverables-constitution-docs)
16. [All phases (sequential rollout)](#16-all-phases-sequential-rollout)
17. [RFC decision examples](#17-rfc-decision-examples)
18. [Feature proposal template](#18-feature-proposal-template)
19. [Related existing docs](#19-related-existing-docs)

---

## 1. Executive summary

AZURA is **not** incomplete e-commerce. It is an **Experience-First composable platform**:

- **Headless CMS** + **Visual Builder** + **Marketing & Lead Generation** + **Structured Showcase** (products, services, projects, properties, team, partners, and more — as needed per site).

The primary complexity problem is **not** too many Prisma models or API routes alone. It is **implicit domain modeling** — the same concept implemented multiple times under different names, visible to both developers and admin users.

**AZURA 2.0 goal:** Establish a **Architectural Constitution**, then apply it through phased migration — **not** a big-bang rewrite.

**One-sentence thesis:**

> AZURA is an Experience-First composable platform where Core Platform and Capabilities provide single-owned services; the Experience Layer supplies Entities and Templates through ViewModels; Pages and Blocks compose the visitor experience; Presets and Modules extend the platform without duplicating infrastructure; Deployment Profiles determine what each installation carries.

**Stop adding layers.** The model is complete. Further work is **stabilization, documentation, and sequential execution** — avoid *Architecture Inflation* (a framework that solves complexity by becoming complex itself).

---

## 2. Conversation summary

### 2.1 Where we started

Initial concern: high complexity — ~84 Prisma models, ~88 API routes, ~694-line middleware, ~50 feature modules, steep learning curve.

First analysis focused on **reducing complexity** via refactoring: split middleware, split Prisma schema, thin API routes, update `ARCHITECTURE.md`.

### 2.2 Vision correction: DXP, not e-commerce

AZURA was reframed as:

```text
Webflow + Headless CMS + Advanced Product Showcase + Lead Generation
```

**Not:** Shopify / WooCommerce / Marketplace.

There is **no** cart, checkout, orders, payments, or inventory system in the codebase. Leftover commerce-shaped fields on `Product` (price, stock, shipping UI) are showcase residue, not scope.

**Core capabilities:** CMS, Visual Builder, Product/Service Showcase (without commerce), Lead Generation, SEO.

### 2.3 Wrong unification target (corrected)

Early suggestion: unify everything under **`Product`**.

**Rejected.** Product is one **preset** among many. A law firm, agency, or consultancy may have **no product catalog** but still needs Services, Projects, Team, Case Studies.

The primary showcase abstraction is **`Entity`** (via `EntityType`), not Product.

### 2.4 Wrong unification target (corrected again)

Suggestion: center everything on **`CatalogType` / `CatalogItem`**.

**Partially rejected.** "Catalog" implies browse/list/filter UX. Many AZURA sites have **entities embedded in pages**, not a traditional catalog. **`Entity`** is more neutral than CatalogItem or ContentItem.

### 2.5 Experience is a layer, not an engine

Creating `features/experience/` as a runtime engine parallel to CMS would **recreate today's split** with new names (`cms/` vs `experience/` vs `products/`).

**Experience** is an **architectural layer** built on CMS + Builder — not a separate engine.

### 2.6 Entity ≠ Page

Critical rule: **Entity is structured data; Page is visitor experience.**

A Service entity ("Web Development") may have a landing **Page** at `/services/web-development` composed of Hero, Benefits, FAQ blocks — pulling data from the Entity. The Entity is not the Page.

This prevents Builder from becoming a giant JSON database.

### 2.7 ViewModel layer added

Templates must not read raw storage (`payload`, `attributes`, Prisma rows).

Pipeline:

```text
Entity → Resolver → ViewModel → Template → Block → Page → Experience
```

The codebase already has embryonic ViewModels (`ContentItemView`, `resolveProductPageContext`) — duplicated per system, not unified.

### 2.8 Presets vs Modules

| | Preset | Module |
|---|--------|--------|
| Adds | Schema, templates, admin defaults, validation | Runtime behavior, workflows, services, infrastructure |
| Examples | Product, Team, Service, Knowledge (thin) | Documentation Portal, Status Page, Booking Engine |

**Preset Creep rule:** When a preset needs new infrastructure or runtime services → evaluate **promotion to Module**.

Do **not** delete Knowledge Base, Partners, Team, Pricing — **reclassify** as presets (or modules when they need infrastructure).

### 2.9 Capabilities layer added

Search, AI, Workflow, Versioning, Personalization, Analytics are **neither** presets **nor** always modules. They are **Capabilities** consumed by Presets, Modules, and CMS.

Prevents: `knowledge-search`, `product-search`, `documentation-search` as separate implementations.

### 2.10 Governance completed

- **Single Ownership Rule** (Core Platform concerns)
- **Capability Ownership Rule**
- **Architecture Fitness Tests** (testable principles)
- **Deployment Profiles** (composable platform, not monolithic every deploy)
- **Evolution Rule** (no new top-level concepts without proof)
- **User Language Rule** (admin shows Services/Team; developers see EntityTypes)

### 2.11 Stabilization decision

**Do not add more layers.** Write the six constitution documents, team review, stress-test with one RFC, freeze Constitution v1.0, **then** refactor.

---

## 3. What AZURA is and is not

### What AZURA is

- Headless CMS (pages, posts, menus)
- Visual Builder (blocks, sections, layouts)
- Marketing & Experience Platform
- Lead Generation Platform (forms, inquiries, WhatsApp, newsletter)
- Multilingual platform (locales, field translation, AI assist)
- Composable platform (profiles enable subsets of features)

### What AZURA is not

- E-commerce platform (cart, checkout, payments)
- ERP / inventory / fulfillment
- Marketplace
- Full booking engine (appointment/inquiry CTAs only unless Booking Module added)
- Enterprise TMS by default (optional module)

### Site archetypes (all valid)

| Archetype | Typical entities | Catalog page? |
|-----------|------------------|---------------|
| Manufacturing showroom | Products | Often yes |
| Service company | Services, case studies | Optional |
| Agency / consultancy | Projects, team, services | Rarely |
| Law firm | Practice areas, team, case studies | No |
| Tourism | Destinations, packages, properties | Often yes |
| Real estate | Properties | Often yes |

---

## 4. Architectural constitution

The constitution consists of **six documents** (Phase 0) plus this master plan.

| Document | Purpose | Status |
|----------|---------|--------|
| [constitution.md](./constitution.md) | Index + v1.0 checklist | Draft |
| [product-vision.md](./product-vision.md) | Why AZURA exists; what it is / is not | Draft |
| [domain-model.md](./domain-model.md) | Formal definitions of all core concepts | Draft |
| [glossary.md](./glossary.md) | Canonical terms; legacy mapping; banned admin labels | Draft |
| [architecture-principles.md](./architecture-principles.md) | All principles including Evolution and User Language | Draft |
| [platform-boundaries.md](./platform-boundaries.md) | Where code may live; forbidden patterns; fitness tests | Draft |
| [deployment-profiles.md](./deployment-profiles.md) | Profile manifests; default bundles | Draft |
| [rfc-001-knowledge-base-reclassification.md](./rfc-001-knowledge-base-reclassification.md) | Constitution stress test (existing feature) | Draft |

---

## 5. Runtime flow

```text
Entity
  ↓  Resolver (locale, preset, capabilities via Core)
ViewModel
  ↓
Template
  ↓
Block
  ↓
Page
  ↓
Experience
```

### Three presentation layers

| Layer | Concept | Role |
|-------|---------|------|
| Data | Entity | Structured knowledge |
| View | ViewModel → Template | Context-specific rendering |
| Composition | Block → Page | Visitor surface |

---

## 6. Layer model (final — frozen)

**Do not add new top-level layers.** Extend via Presets, Modules, and Capabilities only.

```text
┌─────────────────────────────────────────────────────────┐
│  Deployment Profile                                     │
│  selects: Core + Capabilities + Presets + Modules       │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  Modules                                                │
│  documentation · status-page · enterprise-translation   │
│  advanced-seo · booking-engine (future)                 │
├─────────────────────────────────────────────────────────┤
│  Presets                                                │
│  product · service · project · partner · team           │
│  knowledge · pricing · destination · case-study · …     │
│         consume ↓                                       │
├─────────────────────────────────────────────────────────┤
│  Experience Layer (architectural — NOT a runtime engine)│
│  entities · collections · resolvers · view-models       │
│  templates                                              │
├─────────────────────────────────────────────────────────┤
│  Capabilities                                           │
│  search · workflow · versioning · ai                    │
│  personalization · analytics                            │
│         consume ↓                                       │
├─────────────────────────────────────────────────────────┤
│  Core Platform                                          │
│  cms · builder · seo · media · localization · leads     │
└─────────────────────────────────────────────────────────┘
```

### Dependency direction (strict)

```text
Core Platform  ←  Capabilities  ←  Experience Layer  ←  Presets / Modules
                                                      ←  CMS / Builder (Pages, Blocks)
```

### Target folder model (Phase 8+ — after constitution frozen)

```text
Core Platform
  cms/            pages, posts, menus
  builder/        blocks, sections, layouts
  seo/            meta, schema, redirects, sitemap
  media/          assets, documents, storage
  localization/   locales, field translation, UI messages
  leads/          forms, inquiries, newsletter, whatsapp

Capabilities
  search/
  workflow/
  versioning/
  ai/
  personalization/
  analytics/

Experience Layer (paths under features/ — not a competing "engine")
  entities/       EntityType, Entity records, shared engine
  collections/
  resolvers/
  view-models/
  templates/

Presets
  product/
  service/
  project/
  partner/
  team/
  knowledge/
  pricing/
  …

Modules
  documentation/
  status-page/
  enterprise-translation/
  advanced-seo/
  …
```

---

## 7. Core concepts

| Concept | Definition | Owner |
|---------|------------|-------|
| **Page** | Composed marketing/editorial surface; builder canvas; has URL | `cms/` + `builder/` |
| **Post** | Time-ordered editorial content; taxonomy; scheduling | `cms/` |
| **Entity** | Structured showcase record (data, not surface) | `entities/` |
| **EntityType** | Schema + behavior contract for a class of entities | `entities/` |
| **Collection** | Grouping / taxonomy / filters for entities | `collections/` or `entities/` |
| **ViewModel** | Template-ready resolved shape; stable public contract | `resolvers/` + `view-models/` |
| **Template** | Named render mode (card, detail, grid, compare, org-chart) | `templates/` |
| **Block** | Builder composition unit on a Page | `builder/` |
| **Section** | Layout grouping within Pages | `builder/` |
| **Lead** | Inquiry, form submission, newsletter signup | `leads/` |

### Entity ≠ Page (constitutional rule)

| | Entity | Page |
|---|--------|------|
| Role | Structured knowledge | Visitor experience |
| Contains | Fields, media refs, status, relations | Blocks, sections, narrative |
| Example | Service: "Web Development" | `/services/web-development` |

A Page **uses** an Entity; an Entity **is not** a Page.

### EntityType tiers (see §13)

- **Preset EntityType** — shipped (product, service, team, …)
- **Custom EntityType** — admin-defined (vehicle, course, speaker, …) — Phase 9+

### Route policy per EntityType

Document in `domain-model.md`:

- **none** — entity only embedded via blocks (e.g. team member)
- **optional** — may have detail route
- **required** — canonical URL (e.g. product showroom)

---

## 8. Extension model

### Preset

Shipped EntityType package:

- Field schema
- Templates (card, detail, …)
- Admin defaults
- Validation rules

**Must not** add infrastructure (search engine, workers, dedicated portal nav). If it does → **Preset Creep** → Module review.

### Module

Optional vertical capability:

- New runtime behavior
- New workflows
- New services
- New infrastructure
- May have dedicated admin section

Examples: Documentation Portal, Status Page, Booking Engine, Enterprise Translation.

### Capability

Shared service consumed by Presets, Modules, and CMS:

- Search, Workflow, Versioning, AI, Personalization, Analytics

**Must not** be re-implemented inside presets.

---

## 9. Ownership rules

### Single Ownership Rule (Core Platform)

| Concern | Owner |
|---------|--------|
| SEO | `seo/` |
| Translation | `localization/` |
| Media | `media/` |
| URL / routing policy | `cms/` + routing config |
| Search indexing | `search/` (Capability) |
| Entity schema | `entities/` |
| ViewModel resolution | `entities/` resolvers |
| Template rendering | `templates/` |
| Page composition | `builder/` |
| Lead capture | `leads/` |

**Forbidden:** Product-specific SEO, Partner-specific translation, Knowledge-specific media storage, Pricing-specific search engine.

### Capability Ownership Rule

| Capability | Owner |
|------------|--------|
| Search | `capabilities/search/` |
| Workflow / Approval | `capabilities/workflow/` |
| Versioning | `capabilities/versioning/` |
| AI | `capabilities/ai/` |
| Personalization | `capabilities/personalization/` |
| Analytics | `capabilities/analytics/` |

Presets and Modules **consume** only.

---

## 10. Governance

### Architecture principles (for `architecture-principles.md`)

1. **Experience First** — optimize for composed visitor experience
2. **Entity ≠ Page** — data vs surface
3. **Experience is a layer, not an engine** — sits on CMS + Builder
4. **Templates are first-class** — not buried in product layout or block internals
5. **ViewModel boundary** — templates never read raw storage
6. **Presets extend; Modules add capabilities**
7. **Single Ownership Rule**
8. **Capability Ownership Rule**
9. **Evolution Rule** — no new top-level concept unless Core + Capability + Preset + Module are insufficient
10. **User Language Rule** — admin uses business terms; architecture terms stay in dev docs/code
11. **Every feature serves a core concept**
12. **No duplicate storage / search / translation paths**
13. **Preset Creep → Module promotion**

### Evolution Rule

> No new top-level concept may be introduced unless it cannot be expressed using: Page, Entity, Template, Block, Collection, Lead, Capability, Preset, Module.

Proposer must document which existing concepts were considered and why they fail.

### User Language Rule

| Audience | Language |
|----------|----------|
| Admin user | Services, Projects, Team, Products, Partners |
| Developer | EntityType, Entity, ViewModel, Resolver, Preset |

**Wrong admin nav:** `Entities → Service, Team`  
**Right admin nav:** `Content → Services, Projects, Team`

### Architecture Fitness Tests

| # | Test | Fail action |
|---|------|-------------|
| 1 | Can this be Core Concept + Preset (+ Capability)? | Do not create Module |
| 2 | Second owner for SEO, Media, Translation, routing? | Reject |
| 3 | Re-implements Search, Workflow, Versioning, AI, etc.? | Reject; use Capability |
| 4 | Template imports raw storage? | Reject; use ViewModel |
| 5 | Preset introduces infrastructure? | Module promotion review |
| 6 | New top-level "engine" parallel to CMS? | Reject |
| 7 | Reusable structured data stored only as Page blocks? | Create Entity + Template |
| 8 | Ships in every profile by default without justification? | Use Deployment Profile |

### Phase 0 exit criterion

**Not** "six files exist."

**Yes:** any new RFC can be decided in minutes, consistently, without reopening philosophy.

---

## 11. Deployment profiles

AZURA is a **composable platform** — not every deployment carries everything.

### Example profiles

| Profile | Core | Capabilities | Presets | Modules |
|---------|------|--------------|---------|---------|
| **Marketing** | cms, builder, seo, media, localization, leads | ai (optional) | — | — |
| **Showroom** | Marketing + | search, personalization | product, service | — |
| **Agency** | Marketing + | search, ai | service, project, team, case-study | — |
| **Documentation** | Marketing + | search, versioning, workflow | knowledge (thin) | documentation |
| **Enterprise** | Full | all needed | as needed | advanced-seo, enterprise-translation, status-page |

### Profile manifest (conceptual)

```yaml
# profiles/showroom.yaml
core: [cms, builder, seo, media, localization, leads]
capabilities: [search, ai, personalization]
presets: [product, service]
modules: []
```

Effects: admin nav, routes, middleware matchers, and feature flags driven by profile — not monolithic enable-everything.

---

## 12. Admin information architecture

**Biggest remaining UX risk** — if the constitution does not reflect in admin, complexity stays visible.

### Target admin structure (user language)

```text
Dashboard

Content
  Pages
  Blog
  Services          ← EntityType preset (user label)
  Projects
  Products
  Team
  Partners
  … (enabled presets only)

Media
  Library

Marketing
  Forms
  Inquiries
  Newsletter
  WhatsApp

Design
  Studio
  Header
  Footer
  Theme

SEO
  Meta & pages
  Redirects
  Sitemap
  Structured data

Settings
  Languages
  Site access
  Search
  …

System (optional / profile-gated)
  Database
  Demo profiles
  Performance
```

### Banned admin labels (after migration)

Do not show these as peer concepts to end users:

- Catalog Items vs Listings vs Offerings vs Products (as four separate systems)
- Entities (as top-level technical term)
- ContentType / ContentItem (in UI)

### Legacy admin groups to eliminate (from `src/config/admin-nav.ts`)

- Separate **Product Catalog** and **Catalog** groups → unified **Content** (or preset-named items)
- **Portal** group as mini-platforms → presets + modules behind profile flags

---

## 13. Open decision: Preset vs Custom EntityTypes

**Must be decided in Phase 0** (`domain-model.md`) — affects DB, admin, search, i18n, templates, import/export.

### Option A — Preset-only (Phase 2.0 scope)

Fixed shipped types: product, service, project, team, partner, knowledge, …

- **Pros:** Simpler migration, admin, templates
- **Cons:** New vertical requires code preset

### Option B — Preset + Custom EntityTypes

Shipped presets **plus** admin "Create new type" (vehicle, course, speaker, …)

- **Pros:** Truly general DXP; aligns with existing `ContentType.fieldSchema` engine
- **Cons:** Dynamic admin, search profiles, generic templates required

### Recommended default for planning

| Phase | EntityType scope |
|-------|------------------|
| **2.0–2.x** | Preset EntityTypes only — unify engines, fix admin IA |
| **3.0+** | Custom EntityTypes — reuse field schema engine under Entity vocabulary |

Document the team's choice explicitly before Phase 2 migration.

---

## 14. Legacy mapping (current codebase)

### Parallel catalog systems (primary duplication)

| Legacy | Canonical target | Notes |
|--------|------------------|-------|
| `Product` + `CatalogCollection` | Entity preset `product` | Rich PDP, compare, JSON/DB dual storage |
| `ContentType` + `ContentItem` + `ContentCollection` | EntityType + Entity + Collection | Already industry-agnostic engine |
| BUILTIN: catalog-items, listings, offerings | EntityType presets | Travel legacy labels in admin |
| `features/products/` | `presets/product/` | Keep PDP, compare, import as preset extensions |
| `features/content/` | `entities/` engine | Primary unification target |

### Portal features → reclassify (do not delete)

| Legacy feature | Target | Type |
|----------------|--------|------|
| `features/partners/` | preset `partner` or `partners` | Preset |
| `features/knowledge-base/` | preset `knowledge` | Preset (+ Versioning Capability) |
| `features/team/` | preset `team` | Preset |
| `features/pricing-plans/` | preset `pricing` | Preset |
| `features/pricing-calculators/` | preset extension or block | Preset / Capability |
| `features/documentation/` | module `documentation` | Module |
| `features/status/` | module `status-page` | Module |
| `features/releases/` | preset `release` or CMS | Preset or editorial |

### Block registries → unify (Phase 5)

| Legacy | Target |
|--------|--------|
| `content-blocks`, `marketing-blocks`, `conversion-blocks` | `builder/blocks/` categories |
| `discovery-blocks`, `media-blocks`, `product-blocks` | `builder/blocks/` categories |
| `portal-blocks`, `commerce-showcase` | `builder/blocks/` or preset blocks |

### Embryonic ViewModels (formalize in Phase 4)

| Legacy | Target |
|--------|--------|
| `ContentItemView` + `serializeContentItem()` | `*CardViewModel`, `*DetailViewModel` |
| `resolveProductPageContext()` | `resolveProductDetailViewModel()` |
| Product card/listing mappers | Template registry consumers |

### Capabilities (consolidate in Phase 6)

| Legacy | Target |
|--------|--------|
| `features/search` + `search-framework` | Capability: search |
| `features/translation` (jobs, memory) | Core i18n + Capability: ai + Module: enterprise-translation |
| `features/personalization` | Capability: personalization |
| SEO integrations / audit crawlers | Module: advanced-seo |

### Scale reference (as of planning)

- ~84 Prisma models
- ~83–88 API routes (`src/app/api/**/route.ts`)
- ~694-line `src/middleware.ts`
- ~50 `src/features/*` top-level modules
- Outdated `src/ARCHITECTURE.md` (lists ~9 features)

---

## 15. Phase 0 deliverables (constitution docs)

**No code changes in Phase 0.** Write, review, stress-test, freeze.

### Tasks

- [x] Draft `docs/product-vision.md`
- [x] Draft `docs/domain-model.md` (include Entity ≠ Page, ViewModel, Preset/Custom decision)
- [x] Draft `docs/glossary.md`
- [x] Draft `docs/architecture-principles.md` (15 principles)
- [x] Draft `docs/platform-boundaries.md` (owners, forbidden patterns, fitness tests)
- [x] Draft `docs/deployment-profiles.md`
- [x] Draft `docs/constitution.md` index
- [x] **Decide:** Preset-only for 2.0–2.x; Custom EntityTypes Phase 9+ (documented in domain-model.md)
- [x] Run **one real RFC** through fitness tests → [rfc-001-knowledge-base-reclassification.md](./rfc-001-knowledge-base-reclassification.md)
- [ ] Team review (one pass — clarifications only, no new layers)
- [ ] Adjust docs only if review exposes gap
- [ ] **Freeze Constitution v1.0** (update status in constitution.md)

### Explicitly NOT in Phase 0

- Renaming `ContentType` → `EntityType` in code
- Merging `Product` storage
- Middleware refactor
- Folder restructure
- Admin code changes

---

## 16. All phases (sequential rollout)

Execute in order. Do not skip Phase 0.

---

### Phase 0 — Constitution & governance

**Goal:** Unified architectural language; RFC gate operational.

**Deliverables:** Six constitution documents (§15), frozen v1.0, one RFC stress-tested.

**Exit:** Team answers RFCs in minutes without philosophy debates.

**Duration guide:** 1–2 weeks (documentation + review).

---

### Phase 1 — Admin IA design (user language)

**Status:** Complete (documentation) — pending team review  
**Goal:** Dashboard reflects constitution **before** deep code migration.

**Deliverables:**

- [admin-ia.md](./admin-ia.md) — wireframes, user flows, IA decisions, legacy mapping
- [admin-nav-manifest.yaml](./admin-nav-manifest.yaml) — machine-readable nav registry
- [profiles/](./profiles/) — per-profile admin visibility (6 manifests)

**Tasks:**

- [x] Wireframe admin nav per §12 (user language, not Entity jargon)
- [x] Map each enabled preset → admin label + icon + route
- [x] Map legacy nav items → target location or removal
- [x] Deployment profile → admin visibility matrix
- [x] Document banned labels in `glossary.md`
- [ ] Team review (one pass)

**Exit:** A new admin user can answer "where do I add a Service?" in seconds → **Content → Services** ([admin-ia.md](./admin-ia.md)).

**Depends on:** Phase 0 draft (proceeded without formal freeze).

**Explicitly NOT in Phase 1:** Changes to `src/config/admin-nav.ts` or routes.

**Next phase:** [Phase 2 — Entity engine interface](#phase-2--entity-engine-unification-interface-first)

---

### Phase 2 — Entity engine unification (interface first)

**Status:** Complete (2026-06-22). Admin list prototype deferred to Phase 8.

**Goal:** One **read/write interface** for showcase records without big-bang schema migration.

**Tasks:**

- [x] Define `Entity`, `EntityType`, `Collection` TypeScript contracts (canonical names) — [`src/features/entities/types.ts`](../src/features/entities/types.ts)
- [x] Implement `entityService` facade over `ContentItem` + `Product` (dual-read) — [`entity.service.ts`](../src/features/entities/entity.service.ts)
- [x] Register preset EntityTypes in manifest (even if storage still split) — [`preset-registry.ts`](../src/features/entities/preset-registry.ts)
- [ ] Single admin list prototype with type filter (deferred — Phase 8)

**Deliverables:** `entityService` API, preset registry manifest, [adapter layer docs](./entity-adapter-layer.md).

**Exit:** New features call `entityService` — not `productsDataService` or raw `contentPublicService` directly.

**Depends on:** Phase 0, Phase 1 wireframes.

**Next phase:** [Phase 3 — Catalog storage migration](#phase-3--catalog-storage-migration)

---

### Phase 3 — Catalog storage migration

**Status:** Implemented (2026-06-22). Enable via env flags; run data migration on each environment.

**Goal:** One storage model for showcase entities (or documented compatibility layer with single write path).

**Tasks:**

- [x] Migration plan: `Product` → ContentItem (preset `product`) — [RFC-002](./rfc-002-catalog-storage-migration.md)
- [x] Bridge `CatalogCollection` (collections stay; `entityService` unified API)
- [x] Data migration scripts + rollback — `scripts/entities/*`, [runbook](./entity-migration-runbook.md)
- [x] `entityService.saveEntity` / `deleteEntity` with dual-write cutover
- [x] Search: product ContentItems index as `CONTENT_ITEM` + `metadata.presetId`
- [ ] Deprecate dual admin paths (admin IA merge — Phase 8)

**Deliverables:** [RFC-002](./rfc-002-catalog-storage-migration.md), [entity-migration-runbook.md](./entity-migration-runbook.md), `entityService` writes, migration scripts.

**Exit:** One write path per entity when `AZURA_ENTITY_WRITE_PRIMARY=1`; Product table read-only when `AZURA_PRODUCT_TABLE_READONLY=1`.

**Next phase:** [Phase 4 — ViewModel & Template registry](#phase-4--viewmodel--template-registry)

---

### Phase 4 — ViewModel & Template registry

**Status:** **Complete** (product + content presets). See [view-model-resolvers.md](./view-model-resolvers.md).

**Goal:** Formal presentation stack; stop template/storage coupling.

**Shipped:**

- `src/view-models/`, `src/resolvers/resolve-view-model.ts`, `src/templates/registry.ts`
- Active templates: `product-card`, `product-detail`, `destination-card`, `destination-detail`, `service-card`, `service-detail`, `property-card`, `property-detail`
- Product PDP + product grid/carousel blocks wired through ViewModels
- Content list block + content detail pages wired through ViewModels (`ContentListBlockRenderer`, `ContentDetailPage`)
- Optional `presetId` + `templateId` on product blocks and content list blocks
- Fitness Test 4: ESLint `no-restricted-imports` on `src/templates/**` (`npm run lint:templates`)

**Exit:** Product and content preset templates do not import Prisma or read raw `attributes`/`payload` in template files.

**Deferred to Phase 5:**

- `product-compare`, portal `member-card`
- Remove `ContentItemView` public type entirely
- Full block registry unification

**Depends on:** Phase 2 (entity IDs stable).

---

### Phase 5 — Preset reclassification & block unification

**Goal:** Portal mini-platforms become presets; block sprawl becomes categories.

**Status:** Phase 5 complete (Slices 1–4 shipped).

**Slice 4 — done:**

- [x] Dissolve Portal admin group; add Modules group (documentation, status)
- [x] Physical moves: `presets/{knowledge,team-member,partner,pricing,release}` + `modules/{documentation,status-page}`
- [x] Unify block packages under `src/features/builder/blocks/{category}/`
- [x] `block-renderer` / `block-field-editor` import from `builder/blocks/`
- [x] Docs: [presets/release.md](./presets/release.md), [modules/documentation.md](./modules/documentation.md), [modules/status-page.md](./modules/status-page.md)

**Phase 5 exit:** No standalone Portal admin group; preset admin under `presets/*`; portal blocks under `builder/blocks/portal/`.

**Slice 1 (knowledge) — done:**

- [x] Activate preset `knowledge` + portal storage adapter (`entityService`)
- [x] ViewModels + templates: `knowledge-article-card`, `knowledge-article-detail`
- [x] `knowledgeBase` block: `presetId` / `templateId` + resolver path (no Prisma in card render)
- [x] Package `src/presets/knowledge/`; translation preset aliases
- [x] Move Knowledge Base admin nav → Content group
- [x] Docs: [presets/knowledge.md](./presets/knowledge.md)

**Slice 2 (team-member + partner) — done:**

- [x] Activate presets `team-member`, `partner` + portal adapters
- [x] ViewModels + templates: `member-card`, `partner-card`
- [x] `teamDirectory` / `partnerDirectory` blocks: `presetId` / `templateId` + resolver path
- [x] Packages `src/presets/team-member/`, `src/presets/partner/`
- [x] Move Team + Partners admin nav → Content group
- [x] Docs: [presets/team-member.md](./presets/team-member.md), [presets/partner.md](./presets/partner.md)

**Slice 3 (pricing) — done:**

- [x] Activate preset `pricing` + portal storage adapter (`entityService`)
- [x] ViewModels + templates: `plan-card` (`plan-compare` planned stub)
- [x] `pricing` block `source=planSet`: `presetId` / `templateId` + resolver path (no Prisma in card render)
- [x] Package `src/presets/pricing/`; translation preset aliases
- [x] Move Pricing Plans admin nav → Content group
- [x] Docs: [presets/pricing.md](./presets/pricing.md)

**Deferred to Phase 6+:**

- Consume Capabilities (search, versioning) — do not re-implement in presets
- Update translation entity registry → unified `Entity` where possible

**Deliverables:** Preset packages, block registry migration, reduced `features/*` top-level count.

**Depends on:** Phase 4 templates.

---

### Phase 6 — Capabilities consolidation ✅

**Goal:** Single owners for cross-cutting services.

**Completed slices:**

1. **Search** — `src/capabilities/search/` (merged `features/search` + `search-framework`); portal team/partner indexing + directory `/api/search` consumption
2. **AI** — `src/capabilities/ai/` (translate jobs, provider, memory)
3. **Personalization** — `src/capabilities/personalization/`
4. **Versioning + workflow stub** — `src/capabilities/versioning/`, `src/capabilities/workflow/`
5. **Guards + docs** — `npm run capabilities:verify`, `docs/capabilities/*.md`

**Deliverables:** `capabilities/*` structure, consumption API docs, unified search indexer, translation AI extraction.

**Exit:** Fitness tests 2–3 guarded via `capabilities:verify`; presets/modules consume capabilities.

**Depends on:** Phase 5 preset boundaries clear.

---

### Phase 7 — Deployment profiles ✅

**Goal:** Composable installs — not every deploy carries everything.

**Tasks:**

- [x] Profile manifest format (yaml/json)
- [x] Profile → enabled presets, modules, capabilities
- [x] Admin nav filtered from profile (href + nav item id)
- [x] Route registration / middleware matcher from profile
- [x] Default profiles: marketing, showroom, agency, documentation, enterprise
- [x] Env or config: `AZURA_PROFILE=showroom`

**Deliverables:** `docs/deployment-profiles.md` implemented, profile loader, demo profile configs.

**Exit:** Marketing-only install does not expose Products admin or product routes.

**Depends on:** Phases 5–6 (features classified).

---

### Phase 8 — Platform cleanup ✅

**Goal:** Reduce routes, middleware, docs debt as **consequence** of constitution — not as first step.

**Tasks:**

- [x] Middleware pipeline split (locale, setup, coming-soon, account, admin gates)
- [x] Consolidate duplicate APIs (`media` vs `catalog-media`, `search` vs `manage/search`)
- [x] Thin route handlers → services (products API pilot)
- [x] Multi-file Prisma schema by domain
- [x] Expand repository layer for entity access (portal presets)
- [x] Update `src/ARCHITECTURE.md` → point to constitution docs
- [x] Remove banned admin labels from `src/config/admin-nav.ts`

**Deliverables:** Smaller middleware, fewer routes, updated architecture docs, `npm run platform:verify`.

**Exit:** Complexity metrics reduced; fitness tests pass in CI review checklist.

**Depends on:** Phases 3–7.

---

### Phase 9 — Custom EntityTypes (optional, post-2.0) ✅

**Goal:** Admin-defined types for general DXP positioning.

**Tasks:**

- Admin "Create Entity Type" UI (reuse `fieldSchema` engine)
- Generic templates (detail, card, list) for custom types
- Search profile generator from field schema
- Translation field registration from schema
- Import/export for custom types

**Deliverables:** Custom EntityType CRUD, generic template fallbacks.

**Exit:** Vehicle, Course, Speaker creatable without code preset.

**Depends on:** Phase 3 unified storage, Phase 4 template registry, Phase 7 profiles.

**Note:** Skip entirely if Phase 0 decision is Preset-only long-term.

**Manual exit checklist:**

1. Create Vehicle, Course, Speaker via `/admin/content/types/new` (no code preset).
2. Add published items; confirm public list + detail at `/{routePrefix}`.
3. Confirm search finds items (`/api/search`, autocomplete).
4. Confirm localized `fieldSchema` fields appear in translation field registry (`attr:*` keys).
5. Export type JSON → import round-trip on another instance or after edit.

**Verify:** `npm run custom-entity-types:verify`

---

### Phase summary table

| Phase | Name | Code? | Primary outcome |
|-------|------|-------|-----------------|
| 0 | Constitution | No | Frozen v1.0 docs, RFC gate |
| 1 | Admin IA design | No | User-language wireframes |
| 2 | Entity engine interface | Yes (facade) | Unified entityService |
| 3 | Storage migration | Yes | Single entity storage |
| 4 | ViewModel + Templates | Yes | Presentation stack |
| 5 | Presets + blocks | Yes | Portal → presets |
| 6 | Capabilities | Yes | Shared services |
| 7 | Deployment profiles | Yes | Composable installs |
| 8 | Platform cleanup | Yes | Routes, middleware, docs |
| 9 | Custom EntityTypes | Optional | General DXP |

---

## 17. RFC decision examples

### RFC: Events feature

| Question | Answer |
|----------|--------|
| Core concept? | Entity |
| Preset? | `event` |
| Capabilities? | Search, Workflow |
| Infrastructure? | No |
| **Decision** | **Approved as Preset** |

### RFC: Booking Engine

| Question | Answer |
|----------|--------|
| Core concept? | Entity + Lead |
| Infrastructure? | Scheduling, availability, reservations |
| **Decision** | **Module** (not preset creep) |

### RFC: Knowledge Base (existing)

| Question | Answer |
|----------|--------|
| Core concept? | Entity |
| Preset? | `knowledge` |
| Capabilities? | Search, Versioning, Workflow (if approval) |
| Infrastructure? | Only if full portal UX → Module for doc-style nav |
| **Decision** | **Preset + Capabilities**; promote to Module if portal infrastructure required |

### RFC: Product compare (existing)

| Question | Answer |
|----------|--------|
| Core concept? | Entity + Template |
| Preset? | `product` |
| New concept needed? | No — `product-compare` template |
| **Decision** | **Template on product preset** |

---

## 18. Feature proposal template

Copy into PRs, RFCs, and `platform-boundaries.md`.

```markdown
## Feature proposal

**Title:**
**Deployment profile(s):**

### Constitution check
- [ ] Core concept served: ___
- [ ] Preset / Module / Capability-only (pick one primary)
- [ ] Fitness Test 1 passed (not unnecessary Module)
- [ ] Fitness Test 2 passed (no duplicate Core owner)
- [ ] Fitness Test 3 passed (no duplicate Capability)
- [ ] Fitness Test 4 passed (ViewModel for templates)
- [ ] Fitness Test 5 passed (no preset creep)
- [ ] Evolution Rule: existing concepts insufficient because ___

### Consumes (do not re-implement)
- SEO: yes/no
- Localization: yes/no
- Media: yes/no
- Search: yes/no
- Other capabilities: ___

### Admin IA (User Language Rule)
- User-facing label: ___
- Nav section: ___

### Storage / routes
- New tables justified? yes/no — why
- New API route tree? yes/no — why
```

---

## 19. Related existing docs

| Document | Relationship to AZURA 2.0 |
|----------|---------------------------|
| `src/ARCHITECTURE.md` | Outdated — replace pointers with constitution after Phase 0 |
| `docs/unified-i18n-architecture.md` | Align with Localization Core + Capability AI |
| `docs/i18n-admin-audit.md` | Input for Phase 6 translation consolidation |
| `Guide/project-description.md` | Update after product-vision.md |
| `prisma/schema.prisma` header | Still says travel/packages — update after domain model frozen |

---

## Document history

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-06-22 | Initial master plan — conversation summary + phases 0–9 |
| 1.1 | 2026-06-22 | Phase 0 constitution documents drafted; RFC-001 stress test |
| 1.2 | 2026-06-22 | Phase 1 admin IA — admin-ia.md, manifest, profile YAMLs |

---

*Next step: Team review → freeze Constitution v1.0 → begin [Phase 2 — Entity engine interface](#phase-2--entity-engine-unification-interface-first). Phase 1 IA docs: [admin-ia.md](./admin-ia.md).*
