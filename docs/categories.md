# Categories (unification)

Canonical taxonomy primitive for AZURA. See the authoritative implementation plan and [glossary.md](./glossary.md) / [domain-model.md](./domain-model.md).

## Contracts (immutable)

| | |
|--|--|
| **Category** | Source of truth |
| **CategoryMembership** | Materialized membership index |
| **MANUAL** | Durable |
| **RULE** | Derived / rebuildable |
| **HYBRID** | Manual OR rule; MANUAL wins on overlap |
| **Empty rules** | Zero matches |
| **Root rule** | Always a `RuleGroup` |
| **Product category strings** | Compatibility / derived only |
| **Collections** | Legacy terminology only |

## Module

- Runtime contracts: `src/features/categories/`
- Matching Rules: `src/features/categories/matching/`
- Match preview API: `POST /api/categories/match-preview`
- Legacy collection engine delegates matching to the unified engine (`src/features/collections/engine.ts`)

## Identity

DB unique key: `(scope, scopeOwnerId, slug)` where PRODUCT uses `scopeOwnerId = ""` (empty string) so uniqueness is enforced without nullable unique pitfalls.
