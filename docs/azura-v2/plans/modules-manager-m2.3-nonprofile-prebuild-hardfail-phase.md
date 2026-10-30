# Modules Manager Upgrade — Phase M2.3 (Hard-fail non-profile prebuild)

> **Status:** Complete — M2.3 done → **M8.2** blocked (SWC); **M9** deferred  

> **Prerequisite:** [modules-manager-doc-hygiene-phase.md](./modules-manager-doc-hygiene-phase.md)  
> **Parent:** [application-platform-upgrade-plan.md](./application-platform-upgrade-plan.md) / Phase 9 register  
> **Handoff:** **M8.2** remains blocked (SWC); **M9** deferred  
> **Non-goals:** No M8.2 retry; no YAML-byte tripwire; no allow-flag; no live-DB requirement for middleware success; no npm prebuild reorder

## Goal

Close the last Open register item (“soft vs hard non-profile prebuild”) by:

1. Hard-failing `middleware:manifest` and `prisma-metadata:generate` on npm prebuild (softFail removed).
2. **Also adding** both generators to the Hostinger ship path (closing the row requires this — Hostinger previously skipped them).

## Hard-fail meaning (middleware)

**Hard-fail = generator process exit 0** (completed and wrote a file). Not “DB connection required.”  
[`generate-middleware-manifest.mjs`](../../../scripts/build/generate-middleware-manifest.mjs) catches DB errors, writes a fallback, exits 0. Only unexpected failures exit nonzero.

## Sequences (intentional asymmetry)

| Path | Order | Why |
|------|-------|-----|
| npm `runPrebuildManifestSteps` | middleware → profile(+assert) → prisma-metadata | **Preserve** prior prebuild loop; profile stays sandwiched so assert runs immediately after generate |
| Hostinger `runBuildGenerators` | ensure → **prisma-metadata → middleware** → standalone → engines → DB → Prisma/Next | Metadata is schema-only (no DB); middleware is DB best-effort / fallback OK. Different from npm on purpose |

Insertion: after ensure / skip-ensure, **before** `OUTPUT_STANDALONE`, `ensurePrismaEnginesExecutable`, DB probe, Prisma/Next.

## Extraction

[`scripts/deploy/run-build-generators.mjs`](../../../scripts/deploy/run-build-generators.mjs) mirrors `ensureSelectedDeploymentProfile`:

- `runBuildGenerators({ runNode, env })` — Hostinger pair
- `runPrebuildManifestSteps({ runNpm, runNode, env })` — npm triad + assert

Entrypoints stay thin; tests cover helpers (+ narrow wiring asserts + no-DB middleware pin).

## Measure-twin note

Measure sets `AZURA_MEASURE_NO_DB=1` and will regenerate tracked `src/generated/middleware-manifest.json` (often fallback). **Restore that file in `finally`** alongside `deployment-profile.json`. Pre-/post-M2.3 twin baselines are not directly comparable without noting middleware regeneration under no-DB.

## Register closure wording

**Closed by M2.3**, which **also added** these generators to the Hostinger ship path — not softFail removal alone.

## Acceptance

- Helpers hard-fail; npm order unchanged; Hostinger order + insertion as above — **met**
- No-DB middleware test: unset `DATABASE_URL` → exit 0 + manifest written — **met** (`run-build-generators.test.mjs`)
- Measure restores `middleware-manifest.json` — **met**
- Register: **Closed by M2.3 (also added to ship path)**; M8.2 blocked; M9 deferred — **met**
- CI: `test:profile-source-integrity` includes generator helper tests
