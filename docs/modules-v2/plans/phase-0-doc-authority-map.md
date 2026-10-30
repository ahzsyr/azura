# Phase 0 — Documentation authority map

**Parent:** [executive-application-platform-implementation-plan.md](./executive-application-platform-implementation-plan.md)  
**Register:** [phase-0-baseline-register.md](./phase-0-baseline-register.md)

## 1. Authority tiers

| Tier | Role | Paths |
|------|------|-------|
| **A — Current executive** | Sequencing, hard lines, phase exit gates | [executive-application-platform-implementation-plan.md](./executive-application-platform-implementation-plan.md) |
| **B — Current system reference** | What the Modules system is today | [docs/modules-v2/](../README.md) (`00`–`12`, per-module docs) |
| **C — Phase 0 freeze artifacts** | Baseline truth for Phases 1+ kickoff | This folder: `phase-0-*.md` |
| **D — Historical evidence** | Audits, M* reports, extensibility restart phases — keep; do not treat as live status without register check | [docs/azura-v2/](../../azura-v2/README.md) |
| **E — Living ops docs** | Day-to-day ops; may lag modules-v2 | `docs/deployment-profiles.md`, `docs/glossary.md`, `docs/platform-boundaries.md`, `docs/modules/*.md`, Constitution / architecture principles |

### Conflict rule

1. **Source code** wins for “what runs.”  
2. Among docs: **Tier C register/freeze** > **Tier A executive** (for Phase 0 outcomes) > **Tier B modules-v2** (for current-system description) > **Tier E living ops** > **Tier D historical**.  
3. Historical “Complete” without HEAD evidence is demoted via the baseline register to **present-but-unverified** or **blocked**.

## 2. Superseded / closed planning decisions

| Topic | Status | Cite |
|-------|--------|------|
| Option B runtime executable ZIP host | **Rejected / out of scope** | azura-v2 audits/03; executive plan; decisions freeze |
| Marketplace / catalogue in this roadmap (M9) | **Deferred** — separate RFC (**not** automatic Phase 9); see [r3-follow-on-decision-gates.md](./r3-follow-on-decision-gates.md) | track-close; Phase 8 P8.7; R3 |
| Capability toggles on Modules screen | **Rejected** | track-close / Phase 9 |
| Bundle exclusion as CI ship gate | **Closed as docs-only** until Phase 6 evidence | DG7 / M8 |
| Claiming working tree = production-proven | **Forbidden** | executive §1; Phase 0 |

## 3. Historical map (Tier D) — keep, label

| Area under `docs/azura-v2/` | Use as |
|----------------------------|--------|
| `audits/` | Architecture decision evidence |
| `phases/00`–`10` | Extensibility clean-restart reports |
| `plans/modules-manager*.md` | M* implementation reports |
| `plans/application-platform-upgrade-plan.md` | Detailed historical upgrade plan |
| `plans/modules-manager.md` | Operator reference (may drift vs modules-v2 `06`) |
| `packages/` | Later migration notes (themes, SEO, ecommerce, presets) |
| `inventories/` | JSON inventories / boundary notes |
| `master-plan.md` | Older AZURA 2.0 master plan — historical |

Stub redirects under `docs/modules/` (`application-platform-upgrade-plan.md`, `modules-manager.md`) point into azura-v2; prefer modules-v2 executive + Phase 0 artifacts for new work.

## 4. Living ops drift notes (Tier E)

| Doc | Drift risk vs modules-v2 / WT |
|-----|------------------------------|
| `docs/deployment-profiles.md` | Modified in WT; must stay aligned with fail-open vs fail-closed and `/a` extra binding |
| `docs/glossary.md` | Modified in WT; Module / SiteFeature / pending vocabulary |
| `docs/platform-boundaries.md` | Modified in WT; Fitness Test wording for SiteFeature |
| `docs/modules/*.md` | Shorter notes; modules-v2 per-module docs are richer |

Do not bulk-rewrite Tier E in Phase 0 beyond what is required for link honesty. Phase 10-style living-doc scrub remains backlog unless a factual contradiction blocks Phase 1.

## 5. Link targets from the executive plan

Correct targets from `docs/modules-v2/plans/`:

| Intent | Correct relative path |
|--------|------------------------|
| Upgrade plan | `../../azura-v2/plans/application-platform-upgrade-plan.md` |
| Modules Manager operator doc | `../../azura-v2/plans/modules-manager.md` |
| Track close | `../../azura-v2/plans/modules-manager-track-close-phase.md` |
| Audits | `../../azura-v2/audits/01-existing-system-audit.md` (etc.) |
| Phase 9 roadmap | `../../azura-v2/phases/09-release-roadmap.md` |
| Modules v2 README | `../README.md` |
| Constitution / principles / boundaries / profiles | `../../constitution.md`, `../../architecture-principles.md`, `../../platform-boundaries.md`, `../../deployment-profiles.md` |

Broken forms that must not be used from this folder: `./application-platform-upgrade-plan.md`, `../audits/…`, `../../modules-v2/README.md` (wrong depth).
