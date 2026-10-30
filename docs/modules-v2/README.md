# Modules v2 — Current Modules System Reference

Detailed reference for AZURA’s **current** Modules / package platform as implemented in the repository today.

This folder documents **what exists now**, how it integrates with Core (profiles, admin, APIs, DB, auth), and how that baseline maps to the product goal of an application-and-extension platform. It is intentionally separate from historical phase reports under [`docs/azura-v2/`](../azura-v2/README.md).

## Honest summary

AZURA today has a **Modules system**, not a WordPress-style hot-pluggable plugin host.

| Layer | Role | Can enable code omitted from the build? |
|-------|------|----------------------------------------|
| Deployment Profile | Build-time availability ceiling | No |
| `SiteFeature` | Runtime on/off for *included* modules/presets | No |
| `PackageInstallation` | Lifecycle ledger (`installed` / `active` / `inactive` / `pending`) | `pending` = metadata only |
| ZIP import | Manifest + allowlisted SQL / theme tokens / extension overlays | **No** executable JS/TS/React |

**Operator surface:** Admin → Modules (`/admin/modules`).

**Architecture decision in force:** Option **A** (build-time-distributed Applications) + Option **C** (declarative runtime contributions). Arbitrary uploaded executables (Option B) are out of scope.

## Implementation plans (Phase 0+)

| Doc | Contents |
|-----|----------|
| [plans/executive-application-platform-implementation-plan.md](./plans/executive-application-platform-implementation-plan.md) | Executive sequence (Phases 0–8) |
| [plans/phase-0-baseline-register.md](./plans/phase-0-baseline-register.md) | Phase 0 exit artifact — claim statuses vs HEAD/WT |
| [plans/phase-0-decisions-freeze.md](./plans/phase-0-decisions-freeze.md) | Locked A+C / outage / retention / auth decisions |
| [plans/phase-0-working-tree-disposition.md](./plans/phase-0-working-tree-disposition.md) | Dirty-tree classification + owner disposition |
| [plans/phase-0-doc-authority-map.md](./plans/phase-0-doc-authority-map.md) | Doc tiers and conflict rules |
| [plans/phase-1-runtime-ingress-matrix.md](./plans/phase-1-runtime-ingress-matrix.md) | Phase 1 four-state surface matrix + exit evidence |
| [plans/phase-2-state-transitions.md](./plans/phase-2-state-transitions.md) | Phase 2 lifecycle state transitions + failure recovery |
| [plans/phase-3-settings-and-permissions.md](./plans/phase-3-settings-and-permissions.md) | Phase 3 Module settings registry + permission ACL |
| [plans/phase-4-integration-matrix.md](./plans/phase-4-integration-matrix.md) | Phase 4 integration matrix + contribution honesty |
| [plans/phase-5-modules-manager-ux.md](./plans/phase-5-modules-manager-ux.md) | Phase 5 Modules Manager operator UX + exit evidence |
| [plans/phase-6-boundary-evidence.md](./plans/phase-6-boundary-evidence.md) | Phase 6 profile gating vs bundle evidence (docs-only exclusion gate) |
| [plans/phase-7-extraction-advanced-seo.md](./plans/phase-7-extraction-advanced-seo.md) | Phase 7 Advanced SEO ownership RFC (Approved; relocate deferred) |
| [plans/phase-7-candidate-dispositions.md](./plans/phase-7-candidate-dispositions.md) | Phase 7 Fitness not-now for catalog / translation / booking |
| [plans/phase-8-operational-maturity-release-policy.md](./plans/phase-8-operational-maturity-release-policy.md) | Phase 8 release policy, matrix, diagnostics, marketplace deferral |
| [plans/current-code-audit-and-remaining-work.md](./plans/current-code-audit-and-remaining-work.md) | **Working-tree audit (not a release certification)** — plan/report discrepancies + R0–R3 remaining work; R1 evidence in [inventories/r1-verification-results.json](./inventories/r1-verification-results.json) |

## Document index

| Doc | Contents |
|-----|----------|
| [00-project-objective.md](./00-project-objective.md) | Product objective and expected capabilities for the evolution |
| [01-architecture-overview.md](./01-architecture-overview.md) | End-to-end architecture, layers, request flow |
| [02-vocabulary-and-contracts.md](./02-vocabulary-and-contracts.md) | ModuleManifest, PackageManifest, kinds, statuses |
| [03-deployment-profiles.md](./03-deployment-profiles.md) | Profile YAML → compile → middleware / nav / route ceiling |
| [04-runtime-availability.md](./04-runtime-availability.md) | SiteFeature, fail-open vs fail-closed, effective builder profile |
| [05-lifecycle-and-installer.md](./05-lifecycle-and-installer.md) | Install, activate, deactivate, update, uninstall, ZIP |
| [06-modules-manager-admin.md](./06-modules-manager-admin.md) | Admin UI, actions, auth, operator checklist |
| [07-contributions-extensions-themes.md](./07-contributions-extensions-themes.md) | Contributions inventory, extension overlays, theme packages |
| [08-shipped-modules.md](./08-shipped-modules.md) | Registry of the four built-in Modules |
| [09-data-model.md](./09-data-model.md) | Prisma models and retention rules |
| [10-security-boundaries.md](./10-security-boundaries.md) | ZIP allowlist, permissions vs ACL, ingress safety |
| [11-capability-gap-matrix.md](./11-capability-gap-matrix.md) | Expected capabilities vs current implementation |
| [12-source-map.md](./12-source-map.md) | Canonical file paths |

### Per-module deep dives

| Module | Doc |
|--------|-----|
| `documentation` | [modules/documentation.md](./modules/documentation.md) |
| `status-page` | [modules/status-page.md](./modules/status-page.md) |
| `marketing` | [modules/marketing.md](./modules/marketing.md) |
| `advanced-seo` | [modules/advanced-seo.md](./modules/advanced-seo.md) |

## Related living docs (outside this folder)

- [`docs/deployment-profiles.md`](../deployment-profiles.md) — profile compile & runtime consumers
- [`docs/glossary.md`](../glossary.md) — platform vocabulary
- [`docs/platform-boundaries.md`](../platform-boundaries.md) — Core vs Module fitness tests
- [`docs/modules/*.md`](../modules/) — shorter per-module notes (kept for compatibility)
- [`docs/azura-v2/`](../azura-v2/README.md) — audits, phase reports, upgrade plan history

## Shipped built-in Modules

| ID | Label | Package path |
|----|-------|--------------|
| `documentation` | Documentation | `src/modules/documentation/` |
| `status-page` | Status Page | `src/modules/status-page/` |
| `marketing` | Marketing | `src/modules/marketing/` |
| `advanced-seo` | Advanced SEO | `src/modules/advanced-seo/` |

All four are registered in `MODULE_MANIFESTS` (`src/config/deployment-profile/route-registry.ts`).
