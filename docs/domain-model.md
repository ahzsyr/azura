# AZURA Domain Model

> **Constitution v1.0** · Part of [AZURA Architectural Constitution](./constitution.md)  
> **Terms:** [glossary.md](./glossary.md) · **Vision:** [product-vision.md](./product-vision.md)

Formal definitions for every core concept. If a feature does not map to a concept here, it must justify a new concept via the [Evolution Rule](./architecture-principles.md#9-evolution-rule).

---

## Meta-concept: Experience

**Experience** is not a database table or runtime engine. It is the **composed outcome** a visitor receives:

```text
Pages + Blocks + surfaced Entities (via Templates) + Leads + SEO + personalization
```

Experience is an **architectural layer** built on Core Platform, Capabilities, and the Entity/Template stack — not a sibling of CMS.

---

## Runtime pipeline

```text
Entity
  ↓  Resolver (locale, EntityType, Capabilities, Core services)
ViewModel
  ↓
Template
  ↓
Block (optional — embeds Template on a Page)
  ↓
Page
  ↓
Experience
```

### Three layers

| Layer | Concepts | Role |
|-------|----------|------|
| **Data** | Entity, Collection | Structured knowledge |
| **View** | ViewModel, Template | Context-specific presentation |
| **Composition** | Block, Section, Page | Visitor surface |

---

## Core concepts

Each concept includes: **Definition · Owner · Responsibilities · Not responsible for · Consumes**

---

### Page

| | |
|---|---|
| **Definition** | A composed marketing or editorial surface with a URL, built from Blocks and Sections. |
| **Owner** | `cms/` + `builder/` |
| **Responsibilities** | URL, layout, block tree, page-level SEO hooks, publish state |
| **Not** | A structured schema record; not a substitute for Entity storage |
| **Consumes** | SEO, localization, media, Templates (via Blocks), optional Entity ViewModels |
| **Storage** | `CmsPage` (+ revisions) — today |

**Rule:** A landing page for an Entity is still a **Page**. The Page tells the story; the Entity holds structured fields.

**Example:**

```text
Entity:  Service "Web Development"  (data)
Page:    /services/web-development  (experience)
         ├─ Hero Block
         ├─ Benefits Block
         ├─ FAQ Block
         └─ Service Summary Block → Template(service-card) → Service ViewModel
```

---

### Post

| | |
|---|---|
| **Definition** | Time-ordered editorial content (blog/articles) with taxonomy and scheduling. |
| **Owner** | `cms/` |
| **Responsibilities** | Author, categories, tags, publish/schedule, post SEO |
| **Not** | Interchangeable with Entity without an explicit EntityType preset decision |
| **Consumes** | SEO, localization, media |
| **Storage** | `Post`, taxonomy tables — today |

**AZURA 2.0 decision:** Posts remain **editorial Core CMS** for Phase 2.x. A future `article` EntityType preset is optional and must not duplicate Post without migration plan.

---

### Entity

| | |
|---|---|
| **Definition** | A structured showcase record — one instance of an EntityType. |
| **Owner** | `entities/` (Experience Layer) |
| **Responsibilities** | Field values, status, visibility, slug, relations to collections and media |
| **Not** | A Page; not free-form page layout (use Blocks on Pages or preset-allowed Entity blocks) |
| **Consumes** | SEO, localization, media, search indexing (via Capability) |
| **Storage** | Target: unified Entity store. **Today:** split across `ContentItem` and `Product` (Phase 3 migration) |

**Shared traits across EntityTypes:** title, description, images, files, SEO, translations, categories, CTA, URL — expressed via schema, not separate platforms.

---

### EntityType

| | |
|---|---|
| **Definition** | Schema and behavior contract for a class of Entities. |
| **Owner** | `entities/` |
| **Responsibilities** | Field schema, route policy, search profile reference, enabled templates, admin defaults |
| **Not** | A single Entity instance |
| **Storage** | Target: `EntityType` table. **Today:** `ContentType` (+ preset manifests for Product) |

#### Tiers

| Tier | Description | AZURA 2.0 scope |
|------|-------------|-----------------|
| **Preset EntityType** | Shipped with platform (product, service, team, …) | **Phase 2.0–2.x** |
| **Custom EntityType** | Admin-defined schema (vehicle, course, speaker, …) | **Phase 9+** (optional) |

#### Phase 0 decision (Constitution v1.0)

> **Preset EntityTypes only** for implementation Phases 2–8.  
> **Custom EntityTypes** are planned for Phase 9+ using the existing dynamic field-schema engine (`ContentType.fieldSchema` today), renamed under Entity vocabulary.

#### Route policy (per EntityType)

| Policy | Meaning | Example |
|--------|---------|---------|
| `none` | Embedded via Blocks only | Team member on About page |
| `optional` | May have detail route | Case study |
| `required` | Canonical public URL | Product in showroom profile |

---

### Collection

| | |
|---|---|
| **Definition** | Grouping, taxonomy, or filter bucket for Entities within an EntityType (or explicit cross-type rules). |
| **Owner** | `entities/` or `collections/` |
| **Responsibilities** | Membership, sort order, visibility, hierarchy (parent/child) |
| **Not** | A Page section |
| **Storage** | Target: unified Collection. **Today:** `ContentCollection`, `CatalogCollection` |

---

### ViewModel

| | |
|---|---|
| **Definition** | Template-ready, locale-resolved shape — the **public contract** between data and presentation. |
| **Owner** | `resolvers/` + `view-models/` |
| **Responsibilities** | Stable fields for a specific template context; no storage leakage |
| **Not** | Raw Prisma row, `payload`, or `attributes` JSON |
| **Produced by** | Resolver from Entity + Core/Capability services |

**Example:**

```text
ProductEntity
  ↓ resolveProductCardViewModel(...)
ProductCardViewModel { title, thumbUrl, badge, priceLabel, href, cta }
  ↓ ProductCardTemplate
```

**Today (legacy):** `ContentItemView`, `resolveProductPageContext()` — to be unified in Phase 4.

---

### Template

| | |
|---|---|
| **Definition** | Named render mode for an Entity in a **context** (not a Page type). |
| **Owner** | `templates/` |
| **Responsibilities** | Register renderer; accept ViewModel only; map to HTML/components |
| **Not** | A Block; not raw Entity access |
| **Examples** | `product-card`, `product-detail`, `product-compare`, `member-card`, `case-study-featured` |

Templates are **first-class citizens** — not buried inside product layout or individual block packages.

Blocks **reference** Templates by ID + Entity reference(s).

---

### Block

| | |
|---|---|
| **Definition** | Builder composition unit placed on a Page (or preset-allowed Entity detail). |
| **Owner** | `builder/` |
| **Responsibilities** | Layout, props, visibility, binding to Templates or static content |
| **Not** | An Entity; not a Template implementation (Block invokes Template) |

---

### Section

| | |
|---|---|
| **Definition** | Layout grouping of Blocks within a Page (row, column, spacing). |
| **Owner** | `builder/` |

---

### Lead

| | |
|---|---|
| **Definition** | A conversion artifact: inquiry, form submission, newsletter signup, booking request. |
| **Owner** | `leads/` |
| **Responsibilities** | Capture, store, notify, webhook delivery |
| **May reference** | Entity (e.g. “quote this product”) |
| **Storage** | `Inquiry`, `FormSubmission`, `NewsletterSubscriber`, … — today |

---

## Extension concepts

### Preset

| | |
|---|---|
| **Definition** | Shipped EntityType package. |
| **Includes** | Field schema, templates, admin defaults, validation rules |
| **Must not add** | Infrastructure (workers, dedicated search index, portal navigation tree) |
| **Examples** | `product`, `service`, `team`, `partner`, `knowledge`, `pricing` |

If infrastructure is required → [Preset Creep](./architecture-principles.md#13-preset-creep--module-promotion) → Module review.

---

### Module

| | |
|---|---|
| **Definition** | Optional vertical capability with runtime behavior, workflows, services, or infrastructure. |
| **Includes** | Dedicated UX, background jobs, cross-entity workflows |
| **Examples** | `documentation`, `status-page`, `enterprise-translation`, `advanced-seo`, `booking-engine` |

---

### Capability

| | |
|---|---|
| **Definition** | Shared service consumed by Presets, Modules, and CMS. |
| **Examples** | search, workflow, versioning, ai, personalization, analytics |
| **Owner map** | [platform-boundaries.md](./platform-boundaries.md) |

---

### Deployment Profile

| | |
|---|---|
| **Definition** | Manifest selecting which Core, Capabilities, Presets, and Modules an installation enables. |
| **Owner** | Platform config / `deployment-profiles.md` |
| **Examples** | marketing, showroom, agency, documentation, enterprise |

---

## Entity ≠ Page (constitutional)

| | Entity | Page |
|---|--------|------|
| **Role** | Structured knowledge | Visitor experience |
| **Analogy** | Database record | Designed surface |
| **Reuse** | Same Entity on multiple Pages/Templates | One primary URL narrative |
| **Anti-pattern** | Storing all service copy only in Page blocks with no Entity | Losing reuse, search, translation consistency |

**Anti-pattern:** Everything = Page (unstructured JSON in builder).  
**Anti-pattern:** Everything = Entity (no editorial freedom).

Both Page and Entity are required.

---

## Relationships diagram

```text
Deployment Profile
  enables → Presets, Modules, Capabilities

Page ──contains──▶ Block ──references──▶ Template ──consumes──▶ ViewModel
                                                      ▲
Entity ──resolved by──▶ Resolver ──────────────────┘
  │
  ├── EntityType (Preset or Custom)
  ├── Collection(s)
  ├── SEO (Core)
  ├── Media (Core)
  └── Translations (Core)

Lead ──may reference──▶ Entity
Post ──parallel editorial track──▶ CMS
```

---

## Legacy mapping (current codebase)

| Legacy | Canonical | Phase |
|--------|-----------|-------|
| `ContentType` | EntityType | Rename in Phase 2+ |
| `ContentItem` | Entity | Unify in Phase 3 |
| `ContentCollection` | Collection | Unify in Phase 3 |
| `Product` | Entity (preset: `product`) | Phase 3 |
| `CatalogCollection` | Collection | Phase 3 |
| catalog-items / listings / offerings presets | EntityType presets | Phase 5 IA |
| `features/partners/` | preset `partner` | Phase 5 |
| `features/knowledge-base/` | preset `knowledge` | Phase 5 |
| `features/documentation/` | module `documentation` | Phase 5–7 |

Full table: [azura-v2.md §14](./azura-v2.md#14-legacy-mapping-current-codebase)

---

## Concept consumption matrix

| Concept | SEO | i18n | Media | Search | Leads |
|---------|-----|------|-------|--------|-------|
| Page | ✓ | ✓ | ✓ | optional | via blocks |
| Post | ✓ | ✓ | ✓ | optional | — |
| Entity | ✓ | ✓ | ✓ | ✓ | optional FK |
| Template | via ViewModel | via ViewModel | via ViewModel | — | — |
| Block | — | UI strings | ✓ | — | ✓ |
| Preset | consumes | consumes | consumes | consumes | consumes |
| Module | consumes | consumes | consumes | consumes | consumes |

No preset or module re-implements these concerns. See [Single Ownership Rule](./architecture-principles.md#7-single-ownership-rule).

---

## Related documents

- [glossary.md](./glossary.md)
- [platform-boundaries.md](./platform-boundaries.md)
- [deployment-profiles.md](./deployment-profiles.md)
