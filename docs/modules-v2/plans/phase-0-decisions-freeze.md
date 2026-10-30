# Phase 0 — Decisions freeze

**Status:** Locked inputs for Phases 1–8  
**Parent:** [executive-application-platform-implementation-plan.md](./executive-application-platform-implementation-plan.md)  
**Register:** [phase-0-baseline-register.md](./phase-0-baseline-register.md)

These are **accepted product/architecture locks**, not aspirational redesign. Changing them requires an explicit decision record that supersedes this file.

## 1. Option A + C (security boundary)

| Lock | Statement |
|------|-----------|
| Primary | **Option A** — build-time-distributed Modules. New executable behavior requires repo code + `MODULE_MANIFESTS` + profile include + deploy. |
| Overlay | **Option C** — declarative runtime contributions (tokens, overlays, allowlisted SQL/assets) without arbitrary server/client code execution from ZIP. |
| Rejected | **Option B** — genuine runtime plugin host for uploaded executables — out of scope on current Hostinger + Next.js App Router stack. |
| Pending | `PackageInstallation.status = pending` means metadata awaiting a compatible build — **not** a running app. |
| ZIP | Must not execute JS/TS/TSX/React/WASM handlers; allowlist rejects executable payloads. |

**Cite:** [module-manifest.ts](../../../src/modules/module-manifest.ts), [manifest.ts](../../../src/platform/packages/manifest.ts), [installer.ts](../../../src/platform/packages/installer.ts), azura-v2 audits/03.

## 2. Profile ceiling vs runtime flags

| Lock | Statement |
|------|-----------|
| Deployment Profile | Build-time maximum set (`docs/profiles/*.yaml` → `src/generated/deployment-profile.json`). |
| SiteFeature | Runtime on/off for **profile-included** modules/presets only. |
| Middleware / proxy | Uses **profile** disabled prefixes only — **no** Edge Prisma `SiteFeature` reads. |
| Cannot | Runtime flags cannot enable code omitted from the build. |

**Cite:** [load-profile.ts](../../../src/config/deployment-profile/load-profile.ts), [site-features.ts](../../../src/config/deployment-profile/site-features.ts), [route-registry.ts](../../../src/config/deployment-profile/route-registry.ts).

## 3. Outage policy

| Operation class | Policy | API |
|-----------------|--------|-----|
| Availability UI / saved blocks | Fail-**open** on ledger read failure | `isModuleActive` / `isPresetActive` / `getEffectiveAvailabilityProfile` |
| Mutation-capable Node ingress | Fail-**closed** on ledger unavailability | `resolveModuleIngressAccess` (+ Module decide helpers) |
| Profile omitted | Deny (profile helpers / middleware 404 for compiled prefixes) | `isModuleEnabled` + disabled prefixes |

Do not collapse these policies. Do not move SiteFeature into Edge without a separately proven design.

**Cite:** [site-features.ts](../../../src/config/deployment-profile/site-features.ts), modules-v2 `04-runtime-availability.md`.

## 4. Data retention

| Event | Lock |
|-------|------|
| Deactivate Module | Retain Module-owned content and schema; flags/status only; **no** SQL down |
| Soft uninstall (builtin) | Equivalent to deactivate + keep ledger row |
| Destructive Remove | **Refused** for every builtin before down SQL |
| Pending non-builtin Remove | May delete ledger row; must **not** claim content/schema purge |
| Purge / retention product policy | Separate future decision — not implied by deactivate |

**Cite:** installer deactivate/uninstall paths; modules-v2 `05`, `09`.

## 5. Update and rollback

| Lock | Statement |
|------|-----------|
| Update (builtin included) | Re-apply allowlisted **up** SQL / version bump; refuse pending/omitted/ungenerated-profile cases per installer |
| Rollback | **Not** a universal down-SQL product. Phase 2 must define constraints before broad third-party/update claims. |
| Failed lifecycle | Must not leave ambiguous “looks active but isn’t” state (SiteFeature ↔ status sync) |

## 6. Permissions and auth

| Lock | Statement |
|------|-----------|
| Phase 3+ | Manifest `permissions` are registered ACL keys `{id}.read` / `{id}.manage` enforced via `requireModulePermission` (composes with section grants) |
| Authority | Core `requireAdmin` / `requireAdminSection(...)` + `requireModulePermission(...)` |
| Capabilities | Profile ceiling / display — **not** Modules Manager toggles; **not** activate-enforced as ACL |

## 7. Bundle exclusion

| Lock | Statement |
|------|-----------|
| Today | Profile route/nav gating and **bundle exclusion** are separate properties |
| Claims | **No product claim** that profile omission removes Module code from client/server bundles until Phase 6 reproducible evidence |
| M8.2 | Twin baseline measurement is **blocked** on operator Node install — docs-only instrument |

## 8. Vocabulary (operator vs repo)

| Operator speech | Repository term |
|-----------------|-----------------|
| Application / App | Module (`packageKind` / `kind: app`) |
| Extension / plugin overlay | `kind: extension` (declarative) |
| Theme package | `kind: theme` (tokens/assets → SiteTheme) |
| Install (WordPress sense) | Profile include + deploy + installer — ZIP alone ≠ executable install |
| Profile-omitted | Not in compiled `modules[]` |
| Runtime-inactive | Included but SiteFeature off / status inactive |
| Pending | Ledger metadata awaiting build that includes code + registry |

## 9. Non-negotiables for later phases

1. No marketplace in Phases 1–7 without a separate trust/RFC decision (Phase 8+).  
2. No bulk “convert all features to Modules.”  
3. No Phase 1 implementation that weakens ZIP allowlists, signature-free executable loading, or Edge Prisma SiteFeature checks.  
4. First implementation slice after Phase 0 = one agreed gap with acceptance criteria (executive §7).
