# Phase 9 — Migration and Release Roadmap (read-only)

Consolidated remaining work after Phases 0–8. Full detail: [../plans/application-platform-upgrade-plan.md](../plans/application-platform-upgrade-plan.md).  
**Status register (reconciled):** [../plans/modules-manager-doc-hygiene-phase.md](../plans/modules-manager-doc-hygiene-phase.md).  
**Implementation track:** **Closed** — [../plans/modules-manager-track-close-phase.md](../plans/modules-manager-track-close-phase.md) (implemented + gated, not measured).

## Priority buckets (post-close backlog — **not** status-register rows)

Themes below are **out-of-band backlog** only. They are **not** open decisions and do not reopen the hygiene register. Canonical list: [track-close out-of-band](../plans/modules-manager-track-close-phase.md).

| Priority | Theme | Note |
|----------|--------|------|
| P0 | — | Profile hard-fail, `/a` omit, shared-import inventory: **done** |
| P1 | Operator claim scrub / UX open questions | Backlog; many UX items closed by M5/M7.1 |
| P2 | Contribution drift CI; semantics tests; cycle policy | Backlog; bundle measurement = docs-only (M8) |
| P3 | Marketplace; proven exclusion gate | Backlog; M9 deferred; no marketplace in this roadmap |

## Milestones

| Milestone | Focus |
|-----------|--------|
| M0–M8 | Complete (implementation) |
| M2.1 | Complete — Hostinger selected-profile hard-path |
| M8.1 | Complete — Twin measure repair (**inconclusive**) |
| M2.2 | Complete — Module-set expectations (partial YAML integrity) |
| M2.3 | Complete — Hard-fail non-profile prebuild (+ Hostinger ship path) |
| M8.2 | Phase report **blocked on install** — twin baseline **not** complete |
| M9 | **Deferred** — Distribution / catalogue (separate RFC) |
| Doc hygiene | Complete |
| Track close | Complete — [modules-manager-track-close-phase.md](../plans/modules-manager-track-close-phase.md) |

## Non-goals

No runtime plugin host; no arbitrary code ZIP; no marketplace in this roadmap; no capability SiteFeature toggles.

## Status register (was “Open decisions”)

| Item | Status | Cite / owner |
|------|--------|--------------|
| Soft vs hard non-profile prebuild (`middleware:manifest`, `prisma-metadata`) | **Closed by M2.3** (also added to ship path) | [`run-build-generators.mjs`](../../../scripts/deploy/run-build-generators.mjs); [M2.3](../plans/modules-manager-m2.3-nonprofile-prebuild-hardfail-phase.md) |
| `/a` in disabled-public (DG2) | **Closed** | `MODULE_EXTRA_DISABLED_PUBLIC` in `scripts/build/generate-deployment-profile.mjs`; Startup DG2 |
| Capabilities at activate | **Closed** | `src/platform/packages/manifest.ts` (profile ceiling); `installer.ts` `assertDependenciesActive` → `requiredPackages` only |
| Export/confirm UX | **Closed** | M5 typed Remove + builtin refuse; M7.1 Open/Close; `plans/modules-manager.md` |
| Bundle exclusion as gate vs docs-only | **Closed (docs-only)** | DG7 / M8; no exclusion CI gate |
| YAML content-integrity pin | **Partly closed (M2.2)** | Module-set expectations `scripts/deploy/profile-source-expectations.json`; full-byte tripwire deferred (out-of-band) |

### DG1–DG5

| DG | Status |
|----|--------|
| DG1 | Closed — Hostinger + npm profile hard-fail (M2 / M2.1); middleware/prisma-metadata hard as of M2.3 |
| DG2 | Closed — `/a` omit → `disabledPublicPrefixes` |
| DG3 / DG4 | Closed — Marketing ingress beacons / fail-closed mutation |
| DG5 | Closed — Purge/Remove hidden or refused for all builtins; Remove ≠ soft Uninstall (M5) |
