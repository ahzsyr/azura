# Phase 6 — Bundle and Profile Boundary Verification (historical azura-v2 label)

> **Current authority:** [modules-v2 Phase 6 boundary evidence](../../modules-v2/plans/phase-6-boundary-evidence.md). This file is lineage for M8/M2.x behavior cites.

**Mode:** Consistency check against recorded build behavior. See [modules-manager-m8-boundary-evidence-phase.md](../plans/modules-manager-m8-boundary-evidence-phase.md), [modules-manager-m2.1-hostinger-profile-hardpath-phase.md](../plans/modules-manager-m2.1-hostinger-profile-hardpath-phase.md), [modules-manager-m2.2-profile-source-integrity-phase.md](../plans/modules-manager-m2.2-profile-source-integrity-phase.md), [modules-manager-m2.3-nonprofile-prebuild-hardfail-phase.md](../plans/modules-manager-m2.3-nonprofile-prebuild-hardfail-phase.md).

## Guaranteed today

- Profile compile → nav, disabled admin/public/API prefixes, blocks, `modules[]`
- Middleware/nav/SiteFeature consumers use that JSON
- Generator throws on missing required caps/presets for enabled modules
- `profiles:verify` in main `ci`
- Module source folders intentionally retained when omitted
- Shared-import **inventory snapshot** in CI (`inventory:marketing-shared-edges`)
- Hostinger shipping path: `ensureSelectedDeploymentProfile` then `runBuildGenerators` (prisma-metadata → middleware) before standalone/engines/DB/Next ([`scripts/deploy/hostinger-build.mjs`](../../../scripts/deploy/hostinger-build.mjs)); rejects `AZURA_PROFILE_FILE`
- Module-set expectations: production assert vs [`scripts/deploy/profile-source-expectations.json`](../../../scripts/deploy/profile-source-expectations.json) (M2.2)

## Soft vs hard (behavior via file cites)

| Task | npm `prebuild` ([`runPrebuildManifestSteps`](../../../scripts/deploy/run-build-generators.mjs)) | Hostinger ([`runBuildGenerators`](../../../scripts/deploy/run-build-generators.mjs)) |
|------|---------------------------|-----------|
| `profile:generate` + selected assert + module expectations | **Hard** (order: middleware → profile+assert → prisma-metadata) | **Hard** (`ensureSelectedDeploymentProfile`) |
| `middleware:manifest` | **Hard** (exit 0 = complete; DB fallback OK) | **Hard** after ensure, before standalone/engines (after prisma-metadata) |
| `prisma-metadata:generate` | **Hard** | **Hard** after ensure (before middleware) |

npm vs Hostinger generator order differs on purpose: Hostinger runs schema-only metadata first, then middleware (DB best-effort / fallback).

## Not proven (and not claimed)

- Bundle exclusion of omitted Module code
- Full YAML-byte integrity on Hostinger (hash is provenance; module-set expectations are the shrink guard; full-byte tripwire deferred)
- Marketing-attributable client/server chunk delta under the M8 substring instrument

## M8 matched-twin measurement

| Field | Value |
|-------|--------|
| Pair | `enterprise` vs ephemeral `enterprise-minus-marketing` |
| M8.1 | **Inconclusive** (env / instrument lineage) |
| M8.2 | **Blocked on install** (no system Node candidate; dual M2.2/M2.3 discontinuity) — [../inventories/profile-boundary-summary.json](../inventories/profile-boundary-summary.json) |
| Edges | See refreshed [../inventories/marketing-shared-edges.json](../inventories/marketing-shared-edges.json); modules-v2 Phase 6 inventory summaries under `docs/modules-v2/inventories/` |
| Exclusion CI gate | None (`releaseGate.decision: docs-only`) |

Absence of a marker (or of a completed scan) is **not** evidence of absence from the bundle.

## Accepted coupling

**87 production + 3 test (90 total)** static edges into `src/modules/marketing` from outside that tree: [../inventories/marketing-shared-edges.json](../inventories/marketing-shared-edges.json).

## Build-time guarantee statement

Profile = **access / nav / ceiling** for the selected `AZURA_PROFILE` artifact on Hostinger and npm prebuild. Not a proven bundler boundary. Module-set shrink vs reviewed expectations is gated (M2.2); full YAML-byte tripwire is not.

## CI checks

1. Fail if `profileId` ≠ `AZURA_PROFILE` (assert after generate)
2. Fail if `generated !== true` after prebuild / Hostinger ensure
3. `profiles:verify` in `ci`
4. `inventory:marketing-shared-edges` snapshot contract
5. `test:profile-source-integrity` — ensure pin + expectations / twin / reachability
6. Dual-profile exclusion assertion — **deferred**

**Next:** Operator installs Homebrew/nvm Node → re-run M8.2 Complete path (same `execPath`, `nextBin` present, both builds+scans finish); **M9** deferred. Status register: [../plans/modules-manager-doc-hygiene-phase.md](../plans/modules-manager-doc-hygiene-phase.md).
