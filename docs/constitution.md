# AZURA Architectural Constitution

> **Version:** 1.0 (draft — pending team review)  
> **Status:** Phase 0 complete (documentation draft)  
> **Master plan:** [azura-v2.md](./azura-v2.md)

The governing documents for AZURA 2.0. All features, refactors, and modules must align with this Constitution before implementation.

---

## Thesis

> AZURA is an Experience-First composable platform where Core Platform and Capabilities provide single-owned services; the Experience Layer supplies Entities and Templates through ViewModels; Pages and Blocks compose the visitor experience; Presets and Modules extend the platform without duplicating infrastructure; Deployment Profiles determine what each installation carries.

---

## Constitution documents

| # | Document | Purpose |
|---|----------|---------|
| 1 | [product-vision.md](./product-vision.md) | What AZURA is and is not; positioning; archetypes |
| 2 | [domain-model.md](./domain-model.md) | Formal definitions: Page, Entity, Template, ViewModel, Preset, Module, … |
| 3 | [glossary.md](./glossary.md) | Canonical terms; legacy mapping; banned admin labels |
| 4 | [architecture-principles.md](./architecture-principles.md) | 15 governing principles including Evolution and User Language |
| 5 | [platform-boundaries.md](./platform-boundaries.md) | Where code lives; forbidden patterns; Fitness Tests; RFC template |
| 6 | [deployment-profiles.md](./deployment-profiles.md) | Composable install bundles |
| 7 | [admin-ia.md](./admin-ia.md) | Target admin navigation (Phase 1) |
| 8 | [admin-nav-manifest.yaml](./admin-nav-manifest.yaml) | Nav item registry for profiles + Phase 8 |
| 9 | [entity-adapter-layer.md](./entity-adapter-layer.md) | Entity engine facade + adapter docs (Phase 2) |
| 10 | [rfc-002-catalog-storage-migration.md](./rfc-002-catalog-storage-migration.md) | Product → ContentItem migration (Phase 3) |
| 11 | [entity-migration-runbook.md](./entity-migration-runbook.md) | Phase 3 operational runbook |

**Planning & phases:** [azura-v2.md](./azura-v2.md)

---

## Layer model (frozen — do not extend)

```text
Deployment Profile
  ↓
Modules · Presets
  ↓
Experience Layer (entities, templates, collections, resolvers, view-models)
  ↓
Capabilities (search, workflow, versioning, ai, personalization, analytics)
  ↓
Core Platform (cms, builder, seo, media, localization, leads)
```

Experience is an **architectural layer**, not a runtime engine.

---

## Runtime pipeline (frozen)

```text
Entity → Resolver → ViewModel → Template → Block → Page → Experience
```

---

## Non-negotiable rules

1. **Entity ≠ Page**
2. **Single Ownership** — one owner per Core concern
3. **Capability Ownership** — no preset-specific search/AI/workflow engines
4. **ViewModel boundary** — templates never read raw storage
5. **Preset Creep → Module** — infrastructure requires promotion review
6. **Evolution Rule** — no new top-level concepts without proof
7. **User Language Rule** — admin shows Services/Team, not "Entities"
8. **No Architecture Inflation** — no new layers; stabilize and apply

Full text: [architecture-principles.md](./architecture-principles.md)

---

## RFC process

1. Copy [Feature proposal template](./platform-boundaries.md#feature-proposal-template)
2. Run [Fitness Tests 1–8](./platform-boundaries.md#architecture-fitness-tests)
3. Name deployment profile(s): [deployment-profiles.md](./deployment-profiles.md)
4. Approve or reject without reopening philosophy

**Worked example:** [rfc-001-knowledge-base-reclassification.md](./rfc-001-knowledge-base-reclassification.md)

---

## Phase 0 decisions (v1.0)

| Decision | Resolution |
|----------|------------|
| EntityType scope for 2.0–2.x | **Preset EntityTypes only** |
| Custom EntityTypes | **Phase 9+** (optional) |
| Primary showcase abstraction | **Entity** (not Product, not CatalogItem) |
| Experience packaging | **Layer**, not engine |
| Knowledge Base / Partners / Team | **Reclassify** as Presets — do not delete |
| Documentation / Status | **Modules** |

---

## Phase 0 exit checklist

- [x] Draft six constitution documents
- [x] Draft RFC stress test (RFC-001)
- [ ] Team review (one pass — clarifications only)
- [ ] Adjust docs if review finds gaps
- [ ] **Freeze Constitution v1.0** (update status line above)

## Phase 1 exit checklist

- [x] [admin-ia.md](./admin-ia.md) — target wireframes and legacy mapping
- [x] [admin-nav-manifest.yaml](./admin-nav-manifest.yaml) — full nav registry
- [x] [profiles/](./profiles/) — six deployment profile admin manifests
- [x] Glossary banned labels updated
- [ ] Team review (one pass)
- [x] No changes to `src/config/admin-nav.ts`

## Phase 2 exit checklist

- [x] [entity-adapter-layer.md](./entity-adapter-layer.md) — adapter layer documentation
- [x] `src/features/entities/` — types, preset registry, `entityService` facade
- [x] Dual-read adapters for `product` + content-backed presets (`service`, `destination`, `property`)
- [x] Unit tests for registry and normalization
- [ ] Admin unified entity list prototype (deferred to Phase 8)

**Next phase:** [Phase 3 — Catalog storage migration](./azura-v2.md#phase-3--catalog-storage-migration)

## Phase 3 exit checklist

- [x] [RFC-002](./rfc-002-catalog-storage-migration.md) — Product → ContentItem strategy
- [x] [entity-migration-runbook.md](./entity-migration-runbook.md)
- [x] `products` ContentType + `entityService` write/delete API
- [x] Migration scripts (`entities:migrate-products`, verify, rollback, reindex)
- [x] Dual-write / read / write-primary env flags
- [x] Search metadata for product ContentItems (`metadata.presetId`)
- [ ] Production cutover (per-environment flag rollout)

**Next phase:** [Phase 4 — ViewModel & Template registry](./azura-v2.md#phase-4--viewmodel--template-registry)

**Explicitly not in Phase 0:** code renames, migrations, middleware split, admin changes.

---

## Document history

| Version | Date | Change |
|---------|------|--------|
| 1.0-draft | 2026-06-22 | Initial Constitution from AZURA 2.0 planning conversation |
| 1.0-draft+1 | 2026-06-22 | Phase 1 admin IA deliverables added |
