# AZURA Glossary

> **Constitution v1.0** · Part of [AZURA Architectural Constitution](./constitution.md)  
> **Formal definitions:** [domain-model.md](./domain-model.md)

Canonical terminology for RFCs, code, and documentation. Admin UI uses **user language** (see [User Language Rule](./architecture-principles.md#10-user-language-rule)).

---

## Canonical terms (use in RFCs and code comments)

| Term | Definition | Short |
|------|------------|-------|
| **Experience** | Composed visitor outcome (not a code package) | Pages + Blocks + Entities + Leads |
| **Page** | URL-owned builder canvas | Editorial/marketing surface |
| **Post** | Blog/article editorial content | CMS content |
| **Entity** | Structured showcase record | Data |
| **EntityType** | Schema contract for Entities | Type definition |
| **Collection** | Entity grouping / taxonomy | Categories, filters |
| **ViewModel** | Template-ready resolved data | Public render contract |
| **Resolver** | Entity → ViewModel transformation | `resolve*ViewModel()` |
| **Template** | Named Entity render mode | `product-card`, `member-detail` |
| **Block** | Builder unit on a Page | Hero, grid, form |
| **Section** | Block layout grouping | Row, spacing |
| **Lead** | Conversion record | Inquiry, submission |
| **Preset** | Shipped EntityType package | product, team, … |
| **Module** | Optional vertical capability | documentation, status-page |
| **Capability** | Shared service | search, ai, workflow |
| **Deployment Profile** | Enabled feature bundle | showroom, agency, … |
| **Core Platform** | Always-on foundations | cms, builder, seo, media, … |

---

## User language (admin UI)

Map EntityType presets to business labels. **Do not expose "Entity" as a nav title.**

| EntityType preset (developer) | Admin label (user) |
|------------------------------|-------------------|
| `product` | Products |
| `service` | Services |
| `project` | Projects |
| `property` | Properties |
| `destination` | Destinations |
| `case-study` | Case Studies |
| `team-member` | Team |
| `partner` | Partners |
| `knowledge` | Knowledge Base |
| `pricing` | Pricing Plans |
| `event` | Events |

Nav section for preset items: **Content** (or profile-specific grouping) — not "Entities" or "Catalog."

---

## Legacy → canonical mapping

### Storage / models

| Legacy (code today) | Canonical | Notes |
|---------------------|-----------|-------|
| `ContentType` | EntityType | Prisma model rename Phase 2+ |
| `ContentItem` | Entity | Primary unification target |
| `ContentCollection` | Collection | |
| `Product` | Entity | preset: `product` |
| `CatalogCollection` | Collection | product collections |
| `PartnerProgram` / `Partner` | Entity | preset: `partner` |
| `KnowledgeBase` / `KnowledgeArticle` | Entity | preset: `knowledge` |
| `TeamDirectory` / `TeamMember` | Entity | preset: `team` |
| `PricingPlanSet` / `PricingPlan` | Entity | preset: `pricing` |

### Features / folders

| Legacy path | Canonical | Type |
|-------------|-----------|------|
| `features/products/` | `presets/product/` | Preset |
| `features/content/` | `entities/` engine | Core Experience Layer |
| `features/partners/` | `presets/partner/` | Preset |
| `features/knowledge-base/` | `presets/knowledge/` | Preset |
| `features/team/` | `presets/team/` | Preset |
| `features/documentation/` | `modules/documentation/` | Module |
| `features/status/` | `modules/status-page/` | Module |
| `features/search/` + `search-framework/` | Capability: search | Capability |
| `features/translation/` (jobs, memory) | ai Capability + enterprise-translation Module | Split |
| `features/personalization/` | Capability: personalization | Capability |
| `portal-blocks/` | builder blocks + preset templates | Phase 5 |

### Admin nav (legacy labels)

Full mapping: [admin-ia.md § Legacy → target](./admin-ia.md#legacy--target-mapping-full) · Machine-readable: [admin-nav-manifest.yaml](./admin-nav-manifest.yaml)

| Legacy group | Legacy label | Current href | Target group | Target label | preset / module |
|--------------|--------------|--------------|--------------|--------------|-----------------|
| product-catalog | Product Catalog | *(group)* | — | *(removed)* | — |
| product-catalog | Products | `/admin/products` | content | Products | `product` |
| product-catalog | Collections | `/admin/collections` | content | Collections | `product` |
| product-catalog | Brands & Tags | `/admin/catalog-taxonomy` | content | Brands & Tags | `product` |
| catalog | Catalog | *(group)* | — | *(removed)* | — |
| catalog | Content | `/admin/content` | system | Content Types | — |
| catalog | Catalog Items | `/admin/content/catalog-items` | content | Packages / Destinations | `destination` |
| catalog | Listings | `/admin/content/listings` | content | Properties | `property` |
| catalog | Offerings | `/admin/content/offerings` | content | Services | `service` |
| catalog | Inquiries | `/admin/inquiries` | marketing | Inquiries | — |
| catalog | Form Templates | `/admin/forms` | marketing | Form Templates | — |
| catalog | Form Submissions | `/admin/form-submissions` | marketing | Form Submissions | — |
| catalog | Newsletter | `/admin/newsletter` | marketing | Newsletter | — |
| portal | Portal | *(group)* | — | *(dissolved)* | — |
| portal | Pricing Plans | `/admin/pricing-plans` | content | Pricing Plans | `pricing` |
| portal | Releases | `/admin/releases` | content | Releases | `release` |
| portal | Calculators | `/admin/pricing-calculators` | content | Calculators | `pricing` |
| portal | Knowledge Base | `/admin/knowledge-base` | content | Knowledge Base | `knowledge` |
| portal | Documentation | `/admin/documentation` | modules | Documentation | `documentation` |
| portal | Status | `/admin/status` | modules | Status Page | `status-page` |
| portal | Team | `/admin/team` | content | Team | `team-member` |
| portal | Partners | `/admin/partners` | content | Partners | `partner` |
| content | Media | `/admin/media` | media | Library | — |
| *(orphan)* | `/admin/packages` | redirects to catalog-items | content | Packages | `destination` |
| *(orphan)* | `/admin/hotels` | redirects to listings | content | Properties | `property` |
| *(orphan)* | `/admin/services` | redirects to offerings | content | Services | `service` |

### Code patterns (legacy)

| Legacy | Canonical |
|--------|-----------|
| `ContentItemView` | `*ViewModel` |
| `serializeContentItem()` | `resolve*ViewModel()` |
| `resolveProductPageContext()` | `resolveProductDetailViewModel()` |
| `TranslatableEntityType: Product` | Entity + EntityType discriminator |
| `TranslatableEntityType: ContentItem` | Entity + EntityType discriminator |
| `catalog_product` search kind | Entity search profile: `product` |
| `content_item` search kind | Entity search profile: [type slug] |

---

## Banned terms

### In admin UI (target IA — see [admin-ia.md](./admin-ia.md))

| Banned | Use instead |
|--------|-------------|
| **Entities** (nav title) | Content → [preset user label] |
| **ContentType** / **ContentItem** | Never in UI |
| **Product Catalog** (group) | Content → Products |
| **Catalog** (group) | Dissolved — items move to Content / Marketing / System |
| **Catalog Items** | Packages, Destinations, or hide per profile |
| **Listings** | Properties |
| **Offerings** | Services |
| **Portal** (group) | Content presets + Modules |
| **Content** (hub at `/admin/content`) | System → Content Types (developer) |
| **Catalog Products** / **Catalog Collections** | Products / Collections (deprecated routes) |

### In new RFCs / features

- **SmartEntity**, **AdvancedEntity**, **ContentAsset** — use [Evolution Rule](./architecture-principles.md#9-evolution-rule)
- **Experience Engine** (as package name)
- **CatalogItem** — use **Entity**
- **Product Platform**, **Knowledge Platform** — use Preset or Module

---

## Preset registry (planned)

| Preset ID | User label | Route policy | Key templates |
|-----------|------------|--------------|---------------|
| `product` | Products | required | product-card, product-detail, product-compare |
| `service` | Services | optional | service-card, service-detail |
| `project` | Projects | optional | project-card, project-detail |
| `property` | Properties | required | property-card, property-detail |
| `destination` | Destinations | optional | destination-card, destination-detail |
| `case-study` | Case Studies | optional | case-study-card, case-study-featured |
| `team-member` | Team | none / optional | member-card, org-chart-node |
| `partner` | Partners | optional | partner-card, partner-grid |
| `knowledge` | Knowledge Base | optional | article-card, article-detail |
| `pricing` | Pricing Plans | optional | plan-card, plan-compare |
| `event` | Events | optional | event-card, event-detail |

Enabled presets depend on [deployment profile](./deployment-profiles.md).

---

## Module registry (planned)

| Module ID | Purpose |
|-----------|---------|
| `documentation` | Doc portal UX, navigation, versioned doc experience |
| `status-page` | Incidents, maintenance, public status views |
| `enterprise-translation` | Translation memory, jobs, review workflows |
| `advanced-seo` | GSC/Bing integrations, crawl diagnostics, rich results ops |
| `booking-engine` | Scheduling, availability, reservations (future) |

---

## Capability registry (planned)

| Capability ID | Purpose |
|-----------------|---------|
| `search` | Indexing, query, facets, autocomplete |
| `workflow` | Approval, stages, assignments |
| `versioning` | Content/version history |
| `ai` | Translation, generation assist |
| `personalization` | Segments, geo, dynamic sections |
| `analytics` | Search analytics, engagement metrics |

---

## Related documents

- [admin-ia.md](./admin-ia.md) — target admin wireframes
- [admin-nav-manifest.yaml](./admin-nav-manifest.yaml)
- [domain-model.md](./domain-model.md)
- [product-vision.md](./product-vision.md)
- [azura-v2.md](./azura-v2.md)
