# Modules Manager Upgrade — Phase M2.2 (Profile source integrity)

> **Status:** Complete — M2.2 done → **M8.2** blocked (SWC Node) → next **M9** deferred  
> **Prerequisite:** [modules-manager-m2.1-hostinger-profile-hardpath-phase.md](./modules-manager-m2.1-hostinger-profile-hardpath-phase.md)  
> **Parent:** [application-platform-upgrade-plan.md](./application-platform-upgrade-plan.md) DG1 / M2 residual  
> **Handoff:** [modules-manager-m8.2-twin-measure-baseline-phase.md](./modules-manager-m8.2-twin-measure-baseline-phase.md)  
> **CI:** `test:profile-source-integrity`

## Goal

Close the M2.1 residual: YAML-self-declared `profileId` alone cannot catch module-set shrink. Production assert compares compiled modules to a **reviewed expectations** snapshot that ships with deploy scripts.

## Trust model (say out loud)

| Mechanism | Role |
|-----------|------|
| Expectations (`scripts/deploy/profile-source-expectations.json`) | **Real shrink guard** |
| `--write-expectations` | Legitimate **reviewable** bypass — trust = PR review of the diff |
| `profileSourceModules` / `profileSourceHash` on artifact | **Provenance** only — hash is **not** a Hostinger hard-fail |
| Twin measure path | Generate via `AZURA_PROFILE_FILE` + `scripts/platform` twin assert — **no** expectations |

Shrink is made **visible**, not impossible.

## Twin vs production

| Path | PROFILE_FILE | Validation |
|------|--------------|------------|
| Hostinger ensure / production assert | Rejected | Expectations on modules |
| Measure twin | Direct generate | Twin `assertArtifact` — no expectations |

Reachability pin: `hostinger-build` import graph must not reference the twin helper under `scripts/platform/`.

## Node / SWC preflight (for M8.2)

Record at execute start whether `@next/swc-darwin-arm64` loads under `process.execPath`. If not, M8.2 is **blocked** with evidence — do not discover only after generator edits.

## Execution

| Step | Work |
|------|------|
| E0 | This doc + links + Node/SWC note |
| E1 | Generator provenance; expectations; production assert |
| E2 | Twin assert promote; reachability pin; tests; regenerate artifact |
| Exit | Handoff M8.2 |

## Acceptance

- Production assert catches module shrink without YAML / without `docs/`
- Twin path does not use expectations; Hostinger rejects PROFILE_FILE
- Dup module IDs hard-fail at generate; six profiles verified clean
- Docs state trust = review of expectations diff
