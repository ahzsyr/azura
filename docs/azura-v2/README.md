# AZURA v2 — Architecture, Modules & Application Platform

Index for AZURA 2.0 planning, Modules Manager / package-platform audits, phase reports, and the application-platform upgrade roadmap.

## Current status

**Modules Manager Option A + C implementation track closed** — [plans/modules-manager-track-close-phase.md](./plans/modules-manager-track-close-phase.md) (implemented + gated, **not** measured).  
**M8.2** phase report blocked on install — twin baseline **not** complete. **M9** deferred.  
Register: [phases/09-release-roadmap.md](./phases/09-release-roadmap.md).

Primary roadmap: [plans/application-platform-upgrade-plan.md](./plans/application-platform-upgrade-plan.md) (§14 → track close / out-of-band).  
Operator reference: [plans/modules-manager.md](./plans/modules-manager.md).

## Completed phase docs

| Doc | Note |
|-----|------|
| [master-plan.md](./master-plan.md) | Original AZURA 2.0 master plan |
| [plans/modules-manager-startup-phase.md](./plans/modules-manager-startup-phase.md) | Startup M1 → M2 → M0 |
| [plans/modules-manager-m3-lifecycle-phase.md](./plans/modules-manager-m3-lifecycle-phase.md) | M3 |
| [plans/modules-manager-m4-contributions-phase.md](./plans/modules-manager-m4-contributions-phase.md) | M4 |
| [plans/modules-manager-m5-lifecycle-ux-phase.md](./plans/modules-manager-m5-lifecycle-ux-phase.md) | M5 |
| [plans/modules-manager-m6-advanced-seo-phase.md](./plans/modules-manager-m6-advanced-seo-phase.md) | M6 |
| [plans/modules-manager-m7-theme-tokens-phase.md](./plans/modules-manager-m7-theme-tokens-phase.md) | M7 |
| [plans/modules-manager-m7.1-contribution-overlays-phase.md](./plans/modules-manager-m7.1-contribution-overlays-phase.md) | M7.1 |
| [plans/modules-manager-m7.2-theme-assets-phase.md](./plans/modules-manager-m7.2-theme-assets-phase.md) | M7.2 |
| [plans/modules-manager-m7.3-rich-theme-fields-phase.md](./plans/modules-manager-m7.3-rich-theme-fields-phase.md) | M7.3 |
| [plans/modules-manager-m8-boundary-evidence-phase.md](./plans/modules-manager-m8-boundary-evidence-phase.md) | M8 (inconclusive lineage) |
| [plans/modules-manager-m2.1-hostinger-profile-hardpath-phase.md](./plans/modules-manager-m2.1-hostinger-profile-hardpath-phase.md) | M2.1 |
| [plans/modules-manager-m8.1-twin-measure-repair-phase.md](./plans/modules-manager-m8.1-twin-measure-repair-phase.md) | M8.1 inconclusive |
| [plans/modules-manager-m2.2-profile-source-integrity-phase.md](./plans/modules-manager-m2.2-profile-source-integrity-phase.md) | M2.2 partial YAML integrity |
| [plans/modules-manager-m2.3-nonprofile-prebuild-hardfail-phase.md](./plans/modules-manager-m2.3-nonprofile-prebuild-hardfail-phase.md) | M2.3 hard non-profile prebuild |
| [plans/modules-manager-doc-hygiene-phase.md](./plans/modules-manager-doc-hygiene-phase.md) | Doc hygiene |
| [plans/modules-manager-track-close-phase.md](./plans/modules-manager-track-close-phase.md) | Track close (implementation) |

## Phase reports with blocked / pending diagnostics

| Doc | Note |
|-----|------|
| [plans/modules-manager-m8.2-twin-measure-baseline-phase.md](./plans/modules-manager-m8.2-twin-measure-baseline-phase.md) | M8.2 blocked on install — twin baseline **not** complete |

## Audits & architecture decisions

| Doc | Purpose |
|-----|---------|
| [audits/01-existing-system-audit.md](./audits/01-existing-system-audit.md) | Phase 1 — Existing Modules / package platform audit |
| [audits/02-p0-runtime-deactivation-plan.md](./audits/02-p0-runtime-deactivation-plan.md) | Phase 2 — P0 route/API deactivation remediation plan |
| [audits/03-honest-package-platform-architecture.md](./audits/03-honest-package-platform-architecture.md) | Phase 3 — Option A + C architecture decision |

## Applied / planning phase reports (Extensibility Clean Restart)

| Doc | Purpose |
|-----|---------|
| [phases/00-baseline.md](./phases/00-baseline.md) | Phase 0 baseline |
| [phases/01-p0-runtime-guards.md](./phases/01-p0-runtime-guards.md) | Phase 1 — P0 Node runtime guards (applied) |
| [phases/02-lifecycle-sync.md](./phases/02-lifecycle-sync.md) | Phase 2 — SiteFeature ↔ package lifecycle |
| [phases/03-zip-pending-ui.md](./phases/03-zip-pending-ui.md) | Phase 3 — Honest ZIP / pending UI |
| [phases/04-manifest-validation.md](./phases/04-manifest-validation.md) | Phase 4 — PackageManifest hardening |
| [phases/05-contributions-inventory.md](./phases/05-contributions-inventory.md) | Phase 5 — Contributions inventory |
| [phases/06-profile-bundle-boundary.md](./phases/06-profile-bundle-boundary.md) | Phase 6 — Profile vs bundle verification |
| [phases/07-operator-ux.md](./phases/07-operator-ux.md) | Phase 7 — Operator UX |
| [phases/08-capabilities-dependencies.md](./phases/08-capabilities-dependencies.md) | Phase 8 — Capabilities / dependencies |
| [phases/09-release-roadmap.md](./phases/09-release-roadmap.md) | Phase 9 — Release roadmap + status register |
| [phases/10-documentation-update-plan.md](./phases/10-documentation-update-plan.md) | Phase 10 — Documentation update plan |

## Packages / migrations

See [packages/](./packages/) (themes, SEO app, ecommerce, presets — “later” where marked).

See [audits/03-honest-package-platform-architecture.md](./audits/03-honest-package-platform-architecture.md) and the [upgrade plan](./plans/application-platform-upgrade-plan.md).
