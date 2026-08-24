# AZURA Architecture Principles

> **Constitution v1.0** · Part of [AZURA Architectural Constitution](./constitution.md)  
> **Enforcement:** [platform-boundaries.md](./platform-boundaries.md) · **Concepts:** [domain-model.md](./domain-model.md)

Governing rules for all AZURA 2.0 design, RFCs, and refactors. Principles are **testable** via [Fitness Tests](./platform-boundaries.md#architecture-fitness-tests).

**Do not add new top-level architectural layers.** Extend via Presets, Modules, and Capabilities only.

---

## 1. Experience First

Optimize for the **visitor experience**: composed pages, clear conversion paths, fast localized content — not internal folder convenience.

**Test:** Does this change make the public site clearer or only reorganize code?

---

## 2. Entity ≠ Page

**Entity** = structured data. **Page** = visitor experience.

A service landing page is a Page that may reference a Service Entity. Never store all reusable structured content only in Page blocks when an Entity is appropriate.

**Test:** [Fitness Test 7](./platform-boundaries.md#fitness-test-7--entity-vs-page)

---

## 3. Experience is a layer, not an engine

Experience is how Core Platform, Capabilities, Entities, Templates, Blocks, and Pages **compose**. It is **not** a runtime package parallel to CMS (`features/experience-engine/` is forbidden).

**Test:** [Fitness Test 6](./platform-boundaries.md#fitness-test-6--no-parallel-engine)

---

## 4. Templates are first-class

Templates are a **registered layer** between ViewModels and UI — not hidden inside product PDP code or scattered block renderers.

Every EntityType preset declares its templates (card, detail, compare, …).

---

## 5. ViewModel boundary

Templates receive **ViewModels only** — never Prisma rows, `payload`, or raw `attributes` JSON.

```text
Entity → Resolver → ViewModel → Template
```

**Test:** [Fitness Test 4](./platform-boundaries.md#fitness-test-4--viewmodel-boundary)

---

## 6. Presets extend; Modules add capabilities

| | Preset | Module |
|---|--------|--------|
| Adds | Schema, templates, admin defaults, validation | Runtime behavior, workflows, services, infrastructure |
| Does not add | Workers, search engines, portal nav trees | — |

---

## 7. Single Ownership Rule

Each cross-cutting Core concern has **one owner**. Presets and Modules **consume** — they do not re-implement.

| Concern | Owner |
|---------|--------|
| SEO | `seo/` |
| Translation / localization | `localization/` |
| Media | `media/` |
| URL / routing policy | `cms/` + routing |
| Entity schema | `entities/` |
| ViewModel resolution | `entities/` resolvers |
| Template registry | `templates/` |
| Page composition | `builder/` |
| Lead capture | `leads/` |

**Forbidden:** product-specific SEO pipelines, partner-specific translation registries, knowledge-specific media storage.

**Test:** [Fitness Test 2](./platform-boundaries.md#fitness-test-2--single-ownership)

---

## 8. Capability Ownership Rule

Shared Capabilities have single owners. Presets and Modules consume via public APIs.

| Capability | Owner |
|------------|--------|
| Search | `capabilities/search/` |
| Workflow | `capabilities/workflow/` |
| Versioning | `capabilities/versioning/` |
| AI | `capabilities/ai/` |
| Personalization | `capabilities/personalization/` |
| Analytics | `capabilities/analytics/` |

**Test:** [Fitness Test 3](./platform-boundaries.md#fitness-test-3--capability-ownership)

---

## 9. Evolution Rule

> No new top-level concept may be introduced unless it cannot be expressed using: **Page, Post, Entity, EntityType, Template, Block, Collection, Lead, Capability, Preset, Module**.

Before proposing `SmartEntity`, `ContentAsset`, or similar:

1. List existing concepts considered.
2. Explain why each is insufficient.
3. Pass [Fitness Tests](./platform-boundaries.md#architecture-fitness-tests).

Most systems fail from **concept drift** after 2–3 years — not from v1 design.

---

## 10. User Language Rule

| Audience | Language |
|----------|----------|
| Admin user | Services, Projects, Team, Products, Partners |
| Developer / RFC | EntityType, Entity, ViewModel, Preset, Module |

**Wrong:** Admin nav titled "Entities."  
**Right:** Content → Services, Projects, Team.

See [glossary.md](./glossary.md#user-language-admin-ui).

---

## 11. Every feature serves a core concept

Every RFC must name the primary [core concept](./domain-model.md) it serves. If none fit, apply Evolution Rule.

No feature may exist only as "admin convenience" without a domain concept.

---

## 12. No duplicate storage / search / translation paths

One Entity engine. One search indexing path per entity profile. One translation path for entity fields.

Parallel implementations (Product search + Content search + Knowledge search) are **technical debt** to eliminate — not patterns to copy.

---

## 13. Preset Creep → Module promotion

When a Preset requires **new infrastructure or runtime services**, evaluate promotion to **Module**.

| Preset creep signal | Action |
|---------------------|--------|
| Background workers | Module or Capability review |
| Dedicated public navigation tree | Module |
| Cross-entity approval workflow | Workflow Capability or Module |
| Separate search index implementation | Reject — use Search Capability |
| Standalone admin product area | Module if vertical UX; else unify Entity admin |

**Test:** [Fitness Test 5](./platform-boundaries.md#fitness-test-5--preset-creep)

---

## 14. Composable deployments

Not every installation enables every Preset, Module, or Capability. Use [deployment profiles](./deployment-profiles.md).

**Test:** [Fitness Test 8](./platform-boundaries.md#fitness-test-8--deployment-profile)

---

## 15. Stabilization over Architecture Inflation

The layer model is **complete**. Further architectural work is documentation, migration, and enforcement — not new layers.

Solve complexity by applying the Constitution, not by adding theoretical frameworks.

---

## RFC gate checklist

Before approving any feature:

- [ ] Core concept named ([Principle 11](#11-every-feature-serves-a-core-concept))
- [ ] Preset / Module / Capability-only classification ([Principle 6](#6-presets-extend-modules-add-capabilities))
- [ ] Fitness Tests 1–4 passed
- [ ] Tests 5–8 when applicable
- [ ] Evolution Rule satisfied if new vocabulary proposed
- [ ] User Language Rule applied for admin IA
- [ ] Single Ownership + Capability Ownership respected

Template: [platform-boundaries.md § Feature proposal](./platform-boundaries.md#feature-proposal-template)

---

## Related documents

- [platform-boundaries.md](./platform-boundaries.md)
- [domain-model.md](./domain-model.md)
- [azura-v2.md](./azura-v2.md)
