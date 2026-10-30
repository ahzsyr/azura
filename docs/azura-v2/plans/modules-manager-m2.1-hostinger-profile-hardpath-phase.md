# Modules Manager Upgrade — Phase M2.1 (Hostinger selected-profile hard-path)

> **Status:** Complete — M2.1 done → **M8.1** done  
> **Prerequisite:** M2 / DG1 prebuild assert; M8 boundary evidence  
> **Parent:** [application-platform-upgrade-plan.md](./application-platform-upgrade-plan.md) §7 / DG1  
> **Handoff:** **M8.1** — [modules-manager-m8.1-twin-measure-repair-phase.md](./modules-manager-m8.1-twin-measure-repair-phase.md); next **M9** deferred  
> **CI:** `test:hostinger-profile` (injected-runner behavioral pin)

## Goal

Close the shipping-path hole: `build:hostinger` never ran npm `prebuild`, so `profile:generate` + selected-artifact assert did not protect the artifact that deploys. Import fail-closed ensure **before** engines / DB / Prisma / Next.

## Deploy policy (intentional)

Fail-closed is an **intentional Hostinger deploy-policy change**, not a bug fix. A typo’d or unknown `AZURA_PROFILE` that previously could ship a stale committed JSON now **blocks** the build.

**Rollback for a stuck deploy:** fix `AZURA_PROFILE` in hPanel (or unset → default `enterprise`). Do **not** bypass the gate. There is no allow-flag for `AZURA_PROFILE_FILE`.

## Guarantees vs residual

| Guaranteed | Residual (out of scope) |
|------------|-------------------------|
| Hostinger generate+assert for `AZURA_PROFILE` before DB/Prisma/Next | YAML **content** integrity vs the “named” profile |
| `AZURA_PROFILE_FILE` rejected (zero generate/assert calls) | Editing `docs/profiles/enterprise.yaml` while keeping `id: enterprise` still passes assert |
| Unknown profile hard-fails | Content snapshot / module-list pin |

`profileId` is self-declared by the YAML `id` field. Assert compares that to `AZURA_PROFILE`. Ensure logs a YAML SHA-256 prefix for observability only — **not** a content gate.

## Implementation

| Piece | Role |
|-------|------|
| [`scripts/deploy/ensure-selected-deployment-profile.mjs`](../../../scripts/deploy/ensure-selected-deployment-profile.mjs) | Pure imported helper + injected `runNode` |
| [`scripts/deploy/hostinger-build.mjs`](../../../scripts/deploy/hostinger-build.mjs) | Calls ensure after messages gate, before engines/DB/Prisma/Next |
| Standalone | Unchanged — delegates to hostinger-build |

Matched-twin measure continues to call `generate-deployment-profile.mjs` **directly** (may set `AZURA_PROFILE_FILE`); it must not use the production ensure helper for the minus-marketing twin.

## Soft vs hard (Phase 6 alignment)

| Path | Behavior |
|------|----------|
| Hostinger `profile:generate` + assert | **Hard** (M2.1) |
| npm `prebuild` `profile:generate` + assert | **Hard** (M2 / DG1) |
| npm `prebuild` `middleware:manifest`, `prisma-metadata:generate` | **Hard as of M2.3** (also on Hostinger ship path) — see [modules-manager-m2.3-nonprofile-prebuild-hardfail-phase.md](./modules-manager-m2.3-nonprofile-prebuild-hardfail-phase.md) |

## Execution

| Step | Work |
|------|------|
| E0 | This phase doc + README / Phase 9 / parent / Phase 6 |
| E1 | Imported ensure; wire hostinger-build; reject `AZURA_PROFILE_FILE` |
| E2 | Behavioral CI pin; living docs |
| Exit | Handoff **M8.1** |

## Acceptance

- Hostinger cannot proceed past ensure on PROFILE_FILE / generate / assert failure
- Behavioral pin: order + failure propagation + zero calls on PROFILE_FILE
- Residual self-id / content drift named; operator rollback documented
- Handoff M8.1
