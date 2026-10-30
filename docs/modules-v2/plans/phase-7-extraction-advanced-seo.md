# Phase 7 — Extraction: Advanced SEO ownership clarification

**Status:** Complete (Approved RFC; physical relocate deferred)  
**Parent:** [executive-application-platform-implementation-plan.md](./executive-application-platform-implementation-plan.md) Phase 7  
**Locks:** [phase-0-decisions-freeze.md](./phase-0-decisions-freeze.md) · [platform-boundaries.md](../../platform-boundaries.md) Fitness Tests  
**Prior:** [phase-6-boundary-evidence.md](./phase-6-boundary-evidence.md) · [phase-4-integration-matrix.md](./phase-4-integration-matrix.md)  
**Inventory:** [../inventories/advanced-seo-ownership.json](../inventories/advanced-seo-ownership.json)

## Objective

Clarify Basic vs Advanced SEO ownership for the existing `advanced-seo` Module — **without** bulk directory moves or approving catalog/translation/booking Modules.

## Scope lock

| In scope | Out of scope |
|----------|--------------|
| Advanced SEO inventory + **Approved** RFC | Wholesale move of `src/features/seo` or `search-intelligence` |
| Guard/ingress parity for Advanced-owned surfaces | New Modules for catalog / translation / booking |
| Fitness **not-now** dispositions for candidates 2–4 | Option B, marketplace, exclusion CI gate |
| Search Intelligence classified as Advanced Module *surface* | Fifth Module id for Search Intelligence |

## Ownership vocabulary

| Owner | Meaning |
|-------|---------|
| `core-basic` | Survives Advanced profile omit; Basic SEO admin / public reads |
| `advanced-seo` | Manifest-listed Advanced admin prefixes + Advanced mutations/APIs |
| `shared-shell` | Core page with soft Advanced configure (e.g. integrations) |
| `search-intelligence-as-advanced` | Admin under Advanced prefixes; impl may stay in `features/search-intelligence` |

## Approved RFC — Advanced SEO

**Decision:** Approve logical ownership clarification. Defer physical relocate until URL/data parity gates in a follow-on RFC.

### Dependency map

```text
Advanced admin pages (src/app/admin/.../seo/{templates,metadata,...})
  → modules/advanced-seo/guard (requireAdvancedSeoPage)
  → features/seo/* UI & services (implementation remains in place)

Search Intelligence admin (…/search-intelligence/**, …/search-operations/**)
  → modules/advanced-seo/guard
  → features/search-intelligence/* (implementation remains)
  → features/seo/google-platform (connectors)

features/seo/actions + google-platform/actions
  → modules/advanced-seo/guard (Phase 4/7 bridge allowlist)

Core Basic SEO + public APIs
  → features/seo only (no advanced-seo guard)
```

Bridge call sites documented in inventory (`kind: lib`, `guardKind: bridge-allowlist`).

### Migration plan

| Step | This phase | Follow-on |
|------|------------|-----------|
| Inventory + owner labels | Done | Keep regenerating via `inventory-advanced-seo-ownership.mjs` |
| Guard parity | Done (Search Intelligence mutations) | Extend pins if new Advanced surfaces land |
| Physical move of Advanced-only trees under `modules/advanced-seo` | **Deferred** | Allowed only when: route parity checklist green, no Core callers of moved files, import-boundary exceptions removed |

### Rollback

- Soft Uninstall / Enable-off: deactivate + retain data (Phase 2/5).  
- Profile omit: Advanced prefixes 404; Basic SEO remains.  
- No Prisma schema split this phase — nothing to roll back at DB layer.

### Profile behavior

- `adminRoutes`: enumerated Advanced prefixes only — **never** `/admin/seo`.  
- Default on **enterprise** among current profiles.  
- Basic SEO and public head/llms/indexnow-class reads remain Core.

### Authorization

- Pages: `requireAdvancedSeoPage` → ingress + `advanced-seo.read`.  
- Mutations/APIs: `assertAdvancedSeoMutationAllowed` / `advancedSeoApiGuardResponse` → ingress + `advanced-seo.manage`.  
- Compose with admin `seo` section where `requireAdminSection("seo")` already applies.  
- Modules Manager ZIP/update/remove stay `system` (unchanged).

### Route parity criteria

| Criterion | Evidence |
|-----------|----------|
| Every manifest `adminRoutes` prefix has ≥1 inventory page | `prefixCoverageOk: true` |
| Advanced pages call `requireAdvancedSeoPage` | inventory + `guard-static-pins` |
| Advanced mutations assert before side effects | inventory gaps = 0 |
| Basic samples lack Advanced assert | pins + inventory |
| Never claim whole `/admin/seo` | manifest contract test |

### Fitness Tests

| Test | Result |
|------|--------|
| 1 Concept decomposition | Pass — Advanced is vertical UX + gated admin infra already modeled as Module |
| 2 Single Ownership | Pass — Core keeps Basic SEO foundation; Advanced does not fork meta/schema pipelines |
| 3 Capability Ownership | Pass — does not re-implement Search Capability; SI is Advanced surface, not new Capability |
| 4 ViewModel boundary | N/A for this RFC (no template storage imports introduced) |
| 5 Preset Creep | N/A — not promoting a Preset |

## Candidate dispositions (2–4) — not-now

See [phase-7-candidate-dispositions.md](./phase-7-candidate-dispositions.md).

## Implementation status

| Slice | Status | Evidence |
|-------|--------|----------|
| P7.1 | **Done** | This contract |
| P7.2 | **Done** | [advanced-seo-ownership.json](../inventories/advanced-seo-ownership.json) |
| P7.3 | **Done** | RFC Approved (above) |
| P7.4 | **Done** | candidate dispositions |
| P7.5 | **Done** | SI action asserts; inventory gaps=0 |
| P7.6 | **Done** | docs updates |
| P7.7 | **Done** | guard-static-pins + inventory pin |
| P7.8 | **Done** | Exit below |

## Exit gate evidence

| Gate | Evidence |
|------|----------|
| Approved RFC + maps | This file |
| No bulk moves | No `features/seo` relocate in diff |
| Candidates ordered | Advanced approved; 2–4 not-now |
| Tests | `npm run test:advanced-seo`; inventory script exit 0 |

## Commands

```bash
node scripts/platform/inventory-advanced-seo-ownership.mjs --write
npm run test:advanced-seo
npm run check:module-import-boundaries
```

## Next

Phase 8 — Operational maturity and release policy (recorded complete). **Physical Advanced SEO relocate is R3-gated** — requires a new RFC meeting the migration criteria above; see [r3-follow-on-decision-gates.md](./r3-follow-on-decision-gates.md). Candidates 2–4 remain not-now per [phase-7-candidate-dispositions.md](./phase-7-candidate-dispositions.md).
