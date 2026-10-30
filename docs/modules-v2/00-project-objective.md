# Project objective — Application & extension platform

> Source intent for evolving the existing Modules system. This document captures the product goal; it does **not** claim these capabilities are fully implemented. See [11-capability-gap-matrix.md](./11-capability-gap-matrix.md) for current vs target.

## 1. Background and current situation

The original ask was an application and extension installation system similar to WordPress Themes and Plugins. What landed is a **Modules system**: profile-bounded, build-time-distributed apps with a runtime switchboard and a package ledger — not a complete hot-pluggable application platform.

The evolution goal is to turn this into a fully integrated, extensible platform that can:

- Treat selected parts of the project as independently manageable **applications**.
- Install, enable, disable, configure, update, extend, and uninstall them through a **centralized management interface** (today: Modules Manager).
- Integrate with pages, layouts, components, APIs, database, authentication, permissions, and related Core subsystems through **well-defined interfaces**.

## 2. Expected capabilities

| # | Capability | Intent |
|---|------------|--------|
| 1 | **Application management** | Install, activate, deactivate, configure, update, and uninstall applications through the administration dashboard. |
| 2 | **Modular architecture** | Convert selected existing features into independently manageable applications without unnecessarily duplicating Core. |
| 3 | **Project-wide integration** | Apps integrate with pages, layouts, navigation, dashboards, APIs, DB entities, events, and other system components via defined interfaces. |
| 4 | **Extension support** | Apps (and extensions) can extend existing functionality and introduce features without modifying Core for every change. |
| 5 | **Lifecycle management** | Predictable install, activate, deactivate, upgrade, rollback, and removal procedures. |
| 6 | **Dependency management** | Identify dependencies, compatibility, conflicts, and installation order before applying changes. |
| 7 | **Configuration and permissions** | Centralized settings, access control, and permission management for applications. |
| 8 | **Data integrity** | Disabling or uninstalling must not damage Core or delete data that should be preserved. |
| 9 | **Security** | Validate packages, enforce permissions, prevent unauthorized code execution, protect Core from unsafe extensions. |
| 10 | **Backward compatibility** | Preserve existing functionality, routes, data, authentication, and user workflows wherever possible. |

These capabilities must use AZURA’s existing architecture and conventions wherever practical — not introduce unnecessary infrastructure or rebuild working subsystems.

## 3. Architecture direction already decided

From prior audits ([`docs/azura-v2/audits/03-honest-package-platform-architecture.md`](../azura-v2/audits/03-honest-package-platform-architecture.md)):

| Option | Meaning | Status |
|--------|---------|--------|
| **A** | Build-time-distributed Applications (Modules). New executable behavior requires repo code + registry + profile + deploy. | **Primary** |
| **C** | Declarative runtime contributions (tokens, overlays, allowlisted SQL/assets) without arbitrary server code execution. | **Overlay** |
| **B** | Genuine runtime plugin host for uploaded executables. | **Rejected as default** on current Hostinger + Next.js App Router stack |

## 4. Development discipline

Work proceeds in sequenced phases. Each phase has a specific objective, investigation scope, deliverables, and implementation boundaries.

Rules:

1. Complete each phase before starting the next.
2. Do **not** begin implementation merely because a phase has been analyzed or documented.
3. Prefer extending the current Modules / package platform over inventing a parallel system.
4. Keep operator copy honest: ZIP import ≠ hot-loading executable app code.

Phase prompts and reports for prior work live under [`docs/azura-v2/`](../azura-v2/README.md). New phase prompts for the next evolution wave should be added beside this objective when authored.

## 5. Non-goals (near term)

1. Arbitrary executable code inside package ZIPs.
2. Edge/proxy middleware Prisma `SiteFeature` checks without a proven cache design.
3. Public marketplace / catalogue.
4. Claiming profile omission equals proven client/server **bundle exclusion** without measurement.
5. Treating manifest `permissions` strings as an ACL (admin auth remains Core).
6. Capability toggles on the Modules screen (capabilities remain a profile ceiling).
