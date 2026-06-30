# RFC-001: Knowledge Base Reclassification

> **Status:** Approved (Constitution stress test)  
> **Type:** Reclassification of existing feature  
> **Constitution:** v1.0-draft

This RFC validates the [AZURA Architectural Constitution](./constitution.md) against a **real existing feature** — not a greenfield idea.

---

## Summary

Reclassify the current **Knowledge Base** vertical (`features/knowledge-base/`, Prisma `KnowledgeBase` / `KnowledgeCategory` / `KnowledgeArticle`, Portal admin, portal-blocks) as:

- **Preset:** `knowledge` (EntityType + templates + schema)
- **Capabilities consumed:** Search, Versioning, Workflow (if approval added)
- **Module:** `documentation` only if full doc-portal UX is required separately

Do **not** delete Knowledge Base capabilities. Reduce independent platform surface area.

---

## Feature proposal

**Title:** Knowledge Base → Entity preset `knowledge`  
**Deployment profile(s):** documentation, enterprise (optional on others)

### Constitution check

| Test | Result | Notes |
|------|--------|-------|
| **1 — Concept decomposition** | Pass | Core: Entity. Preset: `knowledge`. Capabilities: search, versioning |
| **2 — Single Ownership** | Pass | SEO via `seo/`, i18n via `localization/`, media via `media/` |
| **3 — Capability Ownership** | Pass | No new search engine — Search Capability + entity profile |
| **4 — ViewModel boundary** | Pass (target) | Migrate `knowledgeBaseService` public output to `KnowledgeArticle*ViewModel` |
| **5 — Preset Creep** | Watch | Versioning/approval → Versioning + Workflow Capabilities; portal nav → documentation Module |
| **6 — Parallel engine** | Pass | No new engine — lives under presets/knowledge |
| **7 — Entity vs Page** | Pass | Articles are Entities; KB landing may be a Page with Blocks |
| **8 — Deployment Profile** | Pass | Not in marketing/showroom default profiles |

**Classification:** **Preset** (`knowledge`) + optional **Module** (`documentation`) for portal-scale UX

---

## Evolution Rule

| Concept considered | Sufficient? |
|--------------------|-------------|
| Page | No — reusable articles need structured storage |
| Entity + Preset | **Yes** |
| Module alone | Only if portal infrastructure dominates |
| New "KnowledgeAsset" concept | **Rejected** — Evolution Rule |

---

## Core concept served

**Entity** (preset: `knowledge`)

Hierarchy maps to existing Entity patterns:

```text
EntityType: knowledge
  Collection: category (was KnowledgeCategory)
  Entity: article (was KnowledgeArticle)
```

Optional top-level KB config → preset admin defaults or single Collection root — not a separate platform.

---

## Consumes (do not re-implement)

| Service | Used | Current legacy |
|---------|------|----------------|
| SEO | yes | SeoMeta / entity fields |
| Localization | yes | EntityTranslation (KnowledgeArticle, etc.) |
| Media | yes | Media library |
| Search | yes | Search Capability — **not** `knowledge-search` fork |
| Versioning | yes (articles) | Versioning Capability — **not** preset-local store |
| Workflow | optional | Workflow Capability for approval |
| AI | optional | AI Capability for translate/summarize |

---

## Admin IA (User Language Rule)

| Developer | Admin user |
|-----------|------------|
| EntityType preset `knowledge` | **Knowledge Base** (or **Help Articles**) under **Content** |
| Entity: article | **Articles** sub-nav or list within Knowledge Base |

**Remove:** standalone **Portal → Knowledge Base** as peer to unrelated portal mini-systems (Phase 5).

---

## Templates

| Template ID | Purpose |
|-------------|---------|
| `knowledge-article-card` | Listing, related articles |
| `knowledge-article-detail` | Article body |
| `knowledge-category-list` | Category browse |
| `knowledge-search-result` | Search Capability result rendering |

Blocks reference templates — not inline portal-block renderers long-term.

---

## Module boundary decision

| Need | Preset | Module |
|------|--------|--------|
| Article schema + card/detail templates | ✓ | |
| Category hierarchy | ✓ (Collection) | |
| Version history on articles | | consumes Versioning Capability |
| Related articles | ✓ (resolver) | |
| Full doc portal nav + version switcher + dedicated search UX | | **documentation Module** |

**RFC decision:** Start as **Preset + Capabilities**. Promote to **documentation Module** only when portal UX requirements exceed preset scope (Fitness Test 5).

---

## Storage & routes

| Question | Answer |
|----------|--------|
| New tables immediately? | No in Phase 0. Phase 5: migrate or adapter over existing tables |
| New `/api/knowledge/*` tree? | No — unified entity API long-term |
| ViewModel IDs | `KnowledgeArticleCardViewModel`, `KnowledgeArticleDetailViewModel` |
| Template IDs | See table above |

---

## Migration notes (future phases)

| Phase | Work |
|-------|------|
| 2 | `entityService` adapter reads KnowledgeArticle as Entity |
| 4 | ViewModels + template registry |
| 5 | **Done (Slice 1):** `presets/knowledge/`, portal adapter, block `presetId`/`templateId`; physical move of `features/knowledge-base/` deferred |
| 6 | Wire Search + Versioning Capabilities |
| 7 | Enable via `documentation` profile |

---

## Outcome

This RFC demonstrates Constitution-driven decision making in **minutes**:

- **Not** a new Knowledge Platform
- **Not** deleted functionality
- **Yes** Preset + shared Capabilities
- **Maybe** documentation Module later (Preset Creep guard)

Use this pattern for Partners, Team, Pricing, and Product unification RFCs.

---

## Related

- [domain-model.md](./domain-model.md)
- [glossary.md](./glossary.md)
- [platform-boundaries.md](./platform-boundaries.md)
- [azura-v2.md §17](./azura-v2.md#17-rfc-decision-examples)
