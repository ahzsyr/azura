# AZURA Application Platform — Executive Implementation Plan

**Purpose:** Provide the reviewed, implementation-ready direction for evolving AZURA’s existing Modules and package system. This plan consolidates the current-system audit, target architecture, lifecycle and integration requirements, administration and security work, feature extraction, and delivery order.

**Planning decision:** Continue with **build-time-distributed Modules (Option A)** and **declarative runtime contributions (Option C)**. Do not execute arbitrary code uploaded in package ZIPs. New executable behavior ships through the repository, manifest registry, deployment profile, and deployment.

**Relationship to existing plans:** This executive plan summarizes and sequences the work. Detailed implementation history and acceptance criteria remain in [the application platform upgrade plan](../../azura-v2/plans/application-platform-upgrade-plan.md), the [Modules Manager operator doc](../../azura-v2/plans/modules-manager.md), and the [Modules v2 reference](../README.md). Phase 0 artifacts: [baseline register](./phase-0-baseline-register.md) · [decisions freeze](./phase-0-decisions-freeze.md) · [working-tree disposition](./phase-0-working-tree-disposition.md) · [doc authority map](./phase-0-doc-authority-map.md). Where older material conflicts with current source or newer phase reports, verify source and use the latest phase report as evidence; do not start duplicate work.

## 1. Executive finding

AZURA already has the foundations of an application platform, but it is not a hot-pluggable plugin host. Its current model combines a build-time Deployment Profile ceiling, static Module manifests, installation-wide `SiteFeature` flags, a `PackageInstallation` lifecycle ledger, a package installer, and the Admin → Modules management screen. Package ZIPs can carry validated metadata and selected declarative artifacts; they cannot add runnable JavaScript, TypeScript, React pages, or server handlers to a running build.

The working tree currently shows substantial uncommitted changes across package lifecycle and UI, runtime guards, authorization, profile generation, deployment tooling, and documentation. The plan therefore starts by establishing which changes are the intended current baseline and what has actually been verified. Treating the current working tree as a released or production-proven state would overstate the evidence.

### Current architecture, in practical terms

| Concern | Current owner / mechanism | Current limit |
|---|---|---|
| Build availability | YAML profile → generated profile → route/navigation gates | Cannot load code missing from the build; bundle exclusion is not established by route omission |
| Runtime availability | `SiteFeature` plus package lifecycle status | Controls only profile-included modules/presets; read behavior and mutation ingress intentionally have different outage policies |
| Application registry | Static `ModuleManifest` entries in `MODULE_MANIFESTS` | A new executable Module requires code and a deployment |
| Package lifecycle | Installer and `PackageInstallation` / `PackageMigration` records | A `pending` package is metadata awaiting a compatible build, not a running app |
| Integrations | Declared route, nav, block, dependency, theme, and overlay surfaces | Some contribution fields remain declarative-only; integration patterns and ingress enforcement are not uniform across all features |
| Data | Shared Prisma schema and Core migrations; limited allowlisted package SQL | Applications do not own isolated database schemas; destructive package SQL is restricted and must not be inferred from deactivation |
| Authorization | Core authentication and admin-section grants | Manifest `permissions` are labels, not an application ACL |
| Admin experience | `/admin/modules`, plus each Module’s own settings/admin area | Manager capabilities and per-Module configuration are not yet one consistent settings and access-control model |

The repository currently registers four built-in Modules: Documentation, Status Page, Marketing, and Advanced SEO. AZURA also has a broad Core and feature surface (56 top-level `src/features` directories and 138 API route files were found in the working tree). Those counts show extraction opportunity, not a mandate to convert every feature into a Module.

## 2. Target outcome

Deliver a dependable, project-integrated Module platform in which:

1. Administrators can understand availability, dependencies, compatibility, settings, and lifecycle state from a consistent management experience.
2. Each Module has an explicit, reviewable contract for its routes, navigation, blocks, data and migrations, settings, permissions, dependencies, and Core integrations.
3. Deactivation reliably stops the Module’s protected behavior while preserving its content and schema.
4. Updates, rollback, uninstall, and data-retention decisions are explicit, auditable, and recoverable.
5. Core, Modules, Presets, and Capabilities follow AZURA’s Constitution and single-owner rules; feature extraction does not duplicate shared services or create a new architecture layer.
6. Package imports remain constrained to validated declarative content and approved assets/migrations; no package ZIP can execute arbitrary server or client code.
7. Product copy accurately explains the difference between a build-included Module, an active Module, a pending package, and a theme or extension overlay.

“WordPress-like” is the product-management inspiration, not a claim of equivalent runtime behavior. AZURA’s supported workflow for executable features remains **develop → register → include in profile → build/deploy → activate**.

## 3. Architecture and contract direction

Retain the current AZURA vocabulary and constitutional boundaries. Do not add an App layer parallel to Module, a second extension runtime, or a competing package registry.

### Ownership model

- **Core Platform** owns shared infrastructure and security: authentication, admin authorization, routing policy, CMS and builder shells, localization, media, SEO foundations, shared database schema, profile compilation, and the package manager.
- **Capabilities** own reusable cross-cutting services such as search, workflow, versioning, AI, personalization, and analytics. Modules and Presets consume these through defined APIs.
- **Presets** package domain schemas, templates, defaults, and related blocks for an existing Core concept. They do not own separate infrastructure or shared service implementations.
- **Modules** own coherent product areas that require their own runtime behavior, workflows, services, or standalone admin/public experience. They consume Core and Capabilities through stable contracts.
- **Extensions** remain declarative contributions that affect only registered, already-shipped surfaces. They do not provide new executable routes or handlers.
- **Themes** contribute validated presentation tokens and approved assets to the Core-owned `SiteTheme` store. Theme packages do not replace Theme Studio or provide runtime components.
- **Deployment Profiles** define the build-time maximum set. Runtime flags may disable included units but cannot add omitted code.

### Required Module contract

Treat the existing `ModuleManifest` and `PackageManifest` as the starting point, then document and enforce a versioned contract for:

- Stable identity, package kind, version, AZURA compatibility, and profile membership.
- Required packages, presets, and capabilities; dependency ordering, conflict detection, and clear failure explanations.
- Admin, public, and API route ownership, including exceptional bindings outside the Module route tree.
- Admin navigation and builder/block contributions, including which contribution types are operational and which are informational only.
- Settings schema, defaults, secret handling, validation, migration, and reset/retention behavior.
- Data ownership, use of Core repositories/services, migrations, backup compatibility, and uninstall retention/purge semantics.
- Required permissions expressed as enforceable authorization keys, distinct from Core administrator access and descriptive labels.
- Lifecycle hooks/events only where a concrete use case justifies a shared contract; avoid an unrestricted generic plugin bus.
- Failure behavior for inactive Modules, unavailable ledgers, missing dependencies, profile omission, and failed activation/update.

Contract changes must be backward-compatible or explicitly migrated. Persisted manifests need a schema version and deterministic validation. Unsupported or unknown keys must fail safely with actionable explanations.

## 4. Implementation sequence

The phases below are implementation work, unlike the earlier analysis prompts. Complete and review each phase’s exit gate before advancing. Do not combine unrelated feature extraction with foundational lifecycle or security changes.

### Phase 0 — Reconcile the baseline and freeze decisions

**Objective:** Establish the actual starting point before new implementation.

**Work:** Inventory committed code, existing documentation, working-tree changes, and applicable phase reports. For each claimed completed milestone, link source, release evidence, and acceptance results. Identify stale or duplicate plans and resolve contradictions among the older master plan, package upgrade plan, and `docs/modules-v2`. Record the accepted Option A + C boundary, profile behavior, outage policy, update/rollback expectations, and data-retention policy.

**Exit gate:** A reviewed baseline register distinguishes shipped, present-but-unverified, partially implemented, and not started work. The current extensive uncommitted changes are either intentionally accepted as the base for implementation or isolated/reconciled by the project owner before implementation branches from them.

### Phase 1 — Close runtime availability and ingress guarantees

**Objective:** Make active/inactive/profile-omitted behavior predictable across every surface owned by a Module.

**Work:** For all four Modules, inventory pages, layouts, server actions, API routes, jobs, webhooks, OAuth callbacks, short links, public tracking, builder rendering, and navigation. Verify profile omission and runtime deactivation separately. Apply consistent Node-side guards before any protected mutation or side effect. Keep edge middleware independent from Prisma-backed runtime flags. Make ledger-unavailable behavior explicit by operation type, and ensure exceptional paths (such as Marketing `/a`) are included in the manifest/profile binding model or documented as explicit bindings.

**Exit gate:** A route/surface matrix has verified outcomes for active, runtime-inactive, profile-omitted, and ledger-unavailable states. Inactive Modules cannot mutate, create cookies, enqueue work, or accept privileged callbacks. Deactivation preserves Module-owned data.

### Phase 2 — Harden package contracts and lifecycle consistency

**Objective:** Make the package ledger, runtime flags, migrations, and visible lifecycle controls agree.

**Work:** Reconcile manifest validation and contribution inventory with actual consumers. Make lifecycle operations idempotent and transactionally safe where possible. Specify migration ordering, checksum behavior, partial-failure recovery, update compatibility, and rollback constraints. Distinguish activate/deactivate, soft uninstall, remove, and destructive data purge. Define dependency and conflict checks before mutations. Keep unknown executable packages pending and incapable of activation. Review ZIP size, path, entry, compression, asset, SQL, and theme-token validation limits against the implementation.

**Exit gate:** A state-transition table and failure-recovery policy cover every package kind. UI copy matches actual effects. No destructive action can be mistaken for deactivation, and failed lifecycle operations do not leave an ambiguous active status.

### Phase 3 — Establish application settings and permission contracts

**Objective:** Give Modules a consistent, enforceable way to manage settings and user access.

**Work:** Define a Core-owned settings registry and persistence strategy, including typed schemas, defaults, validation, secrets, audit events, import/export handling, and versioned migrations. Extend Core’s authorization model deliberately: preserve admin-section grants, define Module permission identifiers and role/user assignment semantics, and enforce permissions at server actions, APIs, background jobs, and UI boundaries. Never rely on hidden navigation or client checks as authorization. Migrate current Module admin guards consistently.

**Exit gate:** One permission flow is documented and enforced server-side; representative read/manage permissions are tested at every ingress type. Settings can be safely read, updated, migrated, and reset without exposing secrets.

### Phase 4 — Complete project-wide integration interfaces

**Objective:** Ensure Modules integrate consistently with AZURA instead of coupling directly to unrelated internals.

**Work:** Standardize route and nav ownership, builder contributions, dashboard sections, events/jobs, Core service access, and profile/runtime availability checks. Convert declared-only package contribution fields into either real supported behavior with owners and validation or remove/defer them. Define stable APIs for Core services used by Modules. Add ownership and dependency checks to prevent Core/Capability/Module dependency cycles. Keep shared auth, SEO, media, localization, search, entity, and builder systems single-owned.

**Exit gate:** An integration matrix identifies one supported mechanism per surface, and every shipped Module conforms or has an explicit migration path. No contribution is presented as operational when its consumer does not exist.

### Phase 5 — Improve Modules Manager operator workflows

**Objective:** Make package operations safe and comprehensible to site administrators.

**Work:** Align the Modules screen with the agreed lifecycle and permissions model. Show what is build-included, active, pending, incompatible, blocked by dependency, or awaiting deployment. Provide preflight results before activation/update, explain required profile changes, expose migration and failure status, and separate deactivate, soft uninstall, and destructive purge. Link to per-Module settings consistently. Provide audit history and recovery guidance for failed operations. Preserve profile generation as a build/release operation, not a runtime toggle.

**Exit gate:** Administrators can complete supported lifecycle tasks without implying ZIP uploads execute code, without hiding required deployment steps, and without accidentally deleting retained data.

### Phase 6 — Measure deployment boundaries and release evidence

**Objective:** State accurately what profiles remove and what builds actually contain.

**Work:** Complete the outstanding matched-profile measurement with reproducible, environment-valid artifacts. Verify profile source and generated artifact provenance, route/nav behavior, and client/server bundle contents using robust evidence. Treat substring scans and absence of a text marker as inconclusive. Decide whether measured exclusion is a release requirement; do not make exclusion claims until evidence supports them.

**Exit gate:** A reproducible report records the profile pair, build inputs, toolchain, artifact hashes, findings, and limitations. Profile gating and bundle exclusion are reported as separate properties.

### Phase 7 — Extract selected product areas incrementally

**Objective:** Convert appropriate existing features into Modules only after the shared platform contracts are ready.

**Work:** Apply AZURA’s Fitness Tests to candidate areas. Start with features whose ownership is cohesive and whose dependencies can be expressed through established Core APIs. For each approved extraction, inventory routes, navigation, API ingress, components, jobs, schemas, shared imports, profile entries, permissions, and rollback path. Preserve existing URLs, data, and user workflows. Keep domain schemas and templates that fit Presets as Presets; do not promote a feature solely to reduce folder size.

**Candidate review order (not automatic approval):**

1. **Advanced SEO** — already represented as a Module, but some pages and services remain in shared SEO trees; clarify the Basic/Advanced boundary and remove hidden coupling only when ownership is explicit.
2. **Catalog and commerce areas** — evaluate product/catalog vertical workflows separately from the existing Product/Entity/Content model; retain domain types as Presets when they add no independent runtime infrastructure.
3. **Translation operations** — keep localization and shared AI translation services in Core/Capabilities; consider a Module only for a distinct enterprise workflow/product area.
4. **Booking or similar vertical systems** — evaluate as future Module candidates only when they own meaningful infrastructure or workflows, not just entity schemas and blocks.

**Exit gate:** Each extraction has an approved RFC, dependency map, migration and rollback plan, profile behavior, authorization plan, and route parity criteria. No bulk directory moves or one-shot “convert all features” project.

### Phase 8 — Operational maturity and release policy

**Objective:** Support predictable long-term maintenance of Modules and declarative packages.

**Work:** Define release/version compatibility policy, signing/provenance needs for imported declarative packages, update channel and rollback behavior, migration observability, support diagnostics, retention/export policy, and compatibility matrix across deployment profiles. Add marketplace/catalogue only as a separate product decision after the package trust and support model exists.

**Exit gate:** Operators can diagnose package state and version incompatibility; maintainers can publish compatible updates and recover from failed upgrades; support claims match the security boundary.

## 5. Cross-phase acceptance criteria

Before calling the platform ready for broad feature conversion, confirm all of the following:

- The selected profile is generated, validated, and matches the deployed build.
- Profile omission, runtime deactivation, and package-pending behavior are distinct in code and UI.
- All Module-owned mutation ingress is protected server-side, including APIs, actions, jobs, callbacks, and exceptional bindings.
- Dependencies and compatibility are checked before activation or upgrade, and failures are recoverable.
- Settings and permissions have versioned contracts and server-side enforcement.
- Deactivation retains data; uninstall and purge have separately documented, auditable behavior.
- Package ZIP validation cannot admit executable payloads; allowed contributions have actual consumers.
- Core-owned services remain single-owned and Module dependencies follow the project Constitution.
- Existing URLs, data, routes, and workflows have migration or compatibility coverage.
- Boundary and bundle claims are based on reproducible evidence.
- Administrator-facing documentation describes the implemented behavior without WordPress-equivalence claims.

## 6. Decisions and risks to keep visible

| Topic | Plan direction | Remaining decision / risk |
|---|---|---|
| Runtime executable packages | Out of scope; retain Option A + C | Revisit only with a separate sandboxing, hosting, supply-chain, and operational proposal |
| Permission model | Core-owned, server-enforced Module permissions | Choose exact role/user grant semantics and migration path from current admin-section grants |
| Rollback | Required before broad third-party/update claims | Define what can be rolled back for schema and data changes; SQL down scripts alone are not a safe universal rollback |
| Package authenticity | Validate inputs; do not imply a trusted marketplace | Decide whether imported declarative packages require signatures/provenance before external distribution |
| Bundle exclusion | No claim until measured | Current working-tree notes report previous measurement blocked/inconclusive; resolve toolchain and reproducibility first |
| Shared database | Retain Core-owned schema and migration authority initially | Define Module data ownership, deletion/retention, and tenant/install boundaries before destructive uninstall support |
| Documentation drift | Establish one current executive entry point | Several historical plans overlap; preserve history but label superseded decisions clearly |
| Uncommitted changes | Reconcile before implementation starts | The repository contains broad uncommitted changes; do not accidentally overwrite, stage, or assume their release status |

## 7. Immediate implementation starting point

**Phase 0 baseline reconciliation is documented** — see [phase-0-baseline-register.md](./phase-0-baseline-register.md). Owner disposition: **Accept** (default) in [phase-0-working-tree-disposition.md](./phase-0-working-tree-disposition.md).

**Phase 1 runtime availability / ingress** — complete: [phase-1-runtime-ingress-matrix.md](./phase-1-runtime-ingress-matrix.md). Mutations for Documentation, Status Page, Marketing admin/jobs, and residual Advanced SEO writes are fail-closed; availability UI remains fail-open.

**Phase 2 package contracts / lifecycle** — complete: [phase-2-state-transitions.md](./phase-2-state-transitions.md). Activate coherence, migration down/checksum policy, Remove copy honesty, theme Apply/Deactivate + provenance clear, ZIP caps, and dependency error readability are landed.

**Phase 3 settings / permissions** — complete: [phase-3-settings-and-permissions.md](./phase-3-settings-and-permissions.md). Module `{id}.read`/`{id}.manage` ACL composed with admin sections; `ModuleSetting` registry with secret redaction; Documentation + Marketing pilots; assignment UI.

**Phase 4 project-wide integration** — complete: [phase-4-integration-matrix.md](./phase-4-integration-matrix.md). Removed declared-only contribution keys; ModuleManifest route SoT + extra public bindings; builder/jobs policy; Core import allowlist + boundary script; four-Module conformance (Advanced SEO migration → Phase 7).

**Phase 5 Modules Manager operator workflows** — complete: [phase-5-modules-manager-ux.md](./phase-5-modules-manager-ux.md). Display overlays, preflight before activate/update/apply/open, purge labeled unavailable, settings links for all four Modules, lifecycle audit + recovery hints. Profile generate remains build/release only.

**Phase 6 deployment boundary evidence** — exit recorded: [phase-6-boundary-evidence.md](./phase-6-boundary-evidence.md). Dual lanes (`profileGating` vs `bundleEvidence`); toolchain preflight rejects ephemeral Node; boundary markers + expanded report; **exclusion CI gate = no** (docs-only release-gate decision). **Profile-gating lane recorded green**; **bundle lane finished Complete with `verdict: inconclusive`** under durable Node (R1 — [../inventories/r1-verification-results.json](../inventories/r1-verification-results.json)). Gating green does not prove bundle exclusion.

**Phase 7 extraction (incremental)** — complete: [phase-7-extraction-advanced-seo.md](./phase-7-extraction-advanced-seo.md). Advanced SEO ownership RFC **Approved** (inventory + guard parity; physical relocate deferred). Catalog/translation/booking **not-now** ([phase-7-candidate-dispositions.md](./phase-7-candidate-dispositions.md)). No bulk directory moves.

**Phase 8 operational maturity / release policy** — complete: [phase-8-operational-maturity-release-policy.md](./phase-8-operational-maturity-release-policy.md). Compatibility matrix, signing stance (same-trust-zone vs external), Manual update channel + rollback Classes A–D, retention/export matrix, support diagnostics script, marketplace **deferred**. No Option B, purge product, or signing implementation.

**Executive sequence finished (Phases 0–8).** Phase 6 twin measure is Complete (finished inconclusive) per R1; exclusion remains docs-only. Follow-ons are separate RFCs (signing/provenance implementation, marketplace, purge, Advanced SEO physical relocate). Do not reopen Phases 0–8 contracts automatically.

## 8. Source references reviewed

- [Modules v2 current-system reference](../README.md), including its architecture, lifecycle, manager, security, data, and capability-gap references.
- [Existing-system audit](../../azura-v2/audits/01-existing-system-audit.md), [package architecture decision](../../azura-v2/audits/03-honest-package-platform-architecture.md), and [P0 runtime deactivation plan](../../azura-v2/audits/02-p0-runtime-deactivation-plan.md).
- [Modules Manager upgrade plan](../../azura-v2/plans/application-platform-upgrade-plan.md), [track-close report](../../azura-v2/plans/modules-manager-track-close-phase.md), and [release roadmap](../../azura-v2/phases/09-release-roadmap.md).
- [Architecture Constitution](../../constitution.md), [architecture principles](../../architecture-principles.md), [platform boundaries](../../platform-boundaries.md), and [deployment profiles](../../deployment-profiles.md).
- Source contracts and enforcement reviewed: `src/modules/module-manifest.ts`, `src/config/deployment-profile/route-registry.ts`, `src/config/deployment-profile/site-features.ts`, `src/platform/packages/manifest.ts`, `src/platform/packages/installer.ts`, `src/platform/packages/zip-store.ts`, `src/features/auth/guards.ts`, and `prisma/schema/mysql/platform.prisma`.

