# Phase 3 — Honest Package Platform Architecture

**Baselines:** [01](./01-existing-system-audit.md) · [02](./02-p0-runtime-deactivation-plan.md)  
**Decision:** **Option A + Option C** (approved direction for upgrade)

## Executive recommendation

- **Primary:** Option A — build-time-distributed Modules; SiteFeature for runtime on/off.  
- **Overlay:** Option C — declarative runtime contributions (tokens, settings, already-shipped blocks/nav).  
- **Reject as default:** Option B — genuine runtime plugin host for arbitrary uploaded executables on Hostinger + Next.js App Router.  
- ZIP remains **metadata + approved SQL** (and under C, approved non-code assets).  
- `pending` = ledger reservation until a deploy includes code — not install-complete.

Phase 2 Node ingress gates are a **dependency of honesty** for Option A (“deactivate stops handling”), not a path into Option B.

## Concepts to keep distinct

| Concept | Is | Is not |
|---------|----|--------|
| Deployment Profile | Build-time ceiling | Per-site plugin loader |
| SiteFeature | Runtime on/off for included ids | Permission to run omitted code |
| PackageInstallation | Ledger | Proof executables exist in process |
| pending | ZIP accepted; await deploy | Runnable install |
| Metadata ZIP | Manifest + SQL | JS/TS/React upload |
| Profile-omitted | Edge 404 for declared prefixes | Same as runtime-inactive |
| Runtime-inactive | Profile includes; SiteFeature off | Same as omitted |

## Structural constraints

1. Routes live under `src/app`, not Module folders — activate cannot invent App Router files without rebuild.  
2. Registration in `MODULE_MANIFESTS` is release engineering (PR + generate + deploy).  
3. Hostinger = single Node artifact; no plugin sandbox fleet.

## Package-kind matrix (intent)

| Kind | Operational today | Target under A+C |
|------|-------------------|------------------|
| `app` (Module) | Yes (3 modules) | Full lifecycle + ingress honesty |
| `extension` | Manifest/contract | Declarative contributions on shipped code |
| `theme` | Manifest/docs | Tokens runtime; React components need deploy |

## Non-goals

- Marketplace as near-term deliverable  
- Arbitrary code ZIP execution  
- Edge middleware DB SiteFeature checks  
- Claiming profile omission = proven bundle exclusion without measurement  

## Owner approvals before expanding UI/distribution

1. Confirm A+C (done as direction).  
2. P0 inactive response policy (beacons, `/a`, ledger null).  
3. When to expose update/uninstall/purge.  
4. When extension/theme appear in Modules UI.  
5. Soft vs hard profile generate failure in CI.
