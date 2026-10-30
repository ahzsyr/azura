# Modules Manager — Doc hygiene (reconcile open decisions)

> **Status:** Complete — reconciliation only  
> **Parent:** [application-platform-upgrade-plan.md](./application-platform-upgrade-plan.md) §14 → Phase 9 register  
> **Handoff:** Implementation track closed — [modules-manager-track-close-phase.md](./modules-manager-track-close-phase.md). **M8.2** twin baseline remains out-of-band (blocked on install); **M9** deferred.  
> **Non-goals:** No new policy, gates, DG resolutions, M8.2 retry, or M9 RFC

## Goal

Scrub living docs so status claims match what was built. Every status cites a phase doc or code path. Open items get an owner without inventing deadlines.

## Status register (Phase 9 dump as of execute)

Dump re-read from [`../phases/09-release-roadmap.md`](../phases/09-release-roadmap.md) “Open decisions” at execute time.

| Item | Status | Cite |
|------|--------|------|
| Soft vs hard non-profile prebuild (`middleware:manifest`, `prisma-metadata`) | **Closed by M2.3** (also added to ship path) | [`run-build-generators.mjs`](../../../scripts/deploy/run-build-generators.mjs); [M2.3](./modules-manager-m2.3-nonprofile-prebuild-hardfail-phase.md) |
| `/a` in disabled-public (DG2) | **Closed** | [`generate-deployment-profile.mjs`](../../../scripts/build/generate-deployment-profile.mjs) `MODULE_EXTRA_DISABLED_PUBLIC`; Startup [DG2](./modules-manager-startup-phase.md) |
| Capabilities at activate | **Closed** | [`manifest.ts`](../../../src/platform/packages/manifest.ts): `requiredCapabilities` = profile ceiling, not installer-enforced; [`installer.ts`](../../../src/platform/packages/installer.ts) `assertDependenciesActive` → `requiredPackages` only |
| Export/confirm UX | **Closed** | [M5](./modules-manager-m5-lifecycle-ux-phase.md) typed Remove + builtin refuse; [M7.1](./modules-manager-m7.1-contribution-overlays-phase.md) Open/Close; operator [modules-manager.md](./modules-manager.md) (metadata ZIP export honesty; soft Uninstall dialog ≠ typed Remove) |
| Bundle exclusion as gate vs docs-only | **Closed (docs-only)** | DG7 / [M8](./modules-manager-m8-boundary-evidence-phase.md); no exclusion CI gate |
| YAML content-integrity pin | **Partly closed (M2.2)** | Module-set expectations [`scripts/deploy/profile-source-expectations.json`](../../../scripts/deploy/profile-source-expectations.json); hash = provenance; full-byte tripwire **deferred**; trust = review of expectation diffs ([M2.2](./modules-manager-m2.2-profile-source-integrity-phase.md)) |

### DG1–DG5 (one-line)

| DG | Status | Cite |
|----|--------|------|
| DG1 | **Closed** (Hostinger + npm profile hard-fail) | M2 / [M2.1](./modules-manager-m2.1-hostinger-profile-hardpath-phase.md); middleware/prisma-metadata hard as of [M2.3](./modules-manager-m2.3-nonprofile-prebuild-hardfail-phase.md) |
| DG2 | **Closed** | `/a` omit → `disabledPublicPrefixes` |
| DG3/DG4 | **Closed** | Startup S1 / Marketing ingress (beacons, fail-closed mutation) |
| DG5 | **Closed** | [M5](./modules-manager-m5-lifecycle-ux-phase.md): Purge/Remove hidden/refused for **all builtins**; Remove ≠ soft Uninstall |

## Scrubs applied

1. Phase 9 → this register; P0–P3 refreshed.
2. Startup S1 hole #1 (`/a` inject) → **closed**.
3. M2.2 wording → partial module-set; `scripts/deploy/` path.
4. M8 living docs → M8.1 **inconclusive** ≠ M8.2 **blocked**; **87 production + 3 test (90 total)**.
5. Phase 6 → behavior via file cites.
6. Parent §14 → pointer to Phase 9 register.
7. README → Current status + compact completed list.

## Citation pass (E3)

| Cite | Verified |
|------|----------|
| `scripts/deploy/prebuild.mjs` softFail set for middleware/prisma-metadata; hard abort `profile:generate` | Yes |
| `scripts/deploy/hostinger-build.mjs` → `ensureSelectedDeploymentProfile`; no middleware/prisma-metadata | Yes |
| `MODULE_EXTRA_DISABLED_PUBLIC` marketing `["/a"]` in `generate-deployment-profile.mjs` | Yes |
| `manifest.ts` `requiredCapabilities` = profile ceiling, not activate; `installer.ts` `assertDependenciesActive` → `requiredPackages` | Yes |
| M5 DG5 / Remove refuse builtins; M7.1 Open/Close; modules-manager export honesty | Yes |
| M8 / DG7 docs-only exclusion; inventory **87 production + 3 test (90)** | Yes |
| `scripts/deploy/profile-source-expectations.json` (not under `docs/`) | Yes |
| Relative markdown links from hygiene / Phase 6 / 9 / README / deployment-profiles / §14 | 0 missing |

## Acceptance

Reconciliation only; M8.2 blocked; M9 deferred; no new normative policy.
