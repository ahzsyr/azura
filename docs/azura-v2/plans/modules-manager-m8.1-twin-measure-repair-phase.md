# Modules Manager Upgrade — Phase M8.1 (Twin measure repair)

> **Status:** Complete — M8.1 done (verdict **inconclusive**, new SWC blocker) → next **M9** deferred  
> **Prerequisite:** [modules-manager-m2.1-hostinger-profile-hardpath-phase.md](./modules-manager-m2.1-hostinger-profile-hardpath-phase.md)  
> **Parent:** [application-platform-upgrade-plan.md](./application-platform-upgrade-plan.md) §7 M8  
> **Handoff:** **M9** deferred (catalogue RFC — not this phase)

## Goal

Capture the **verbatim** M8 Hostinger/Next failure, repair without postinstall migrate, re-run matched-twin measure, refresh summary + living docs.

## Locks

| Topic | Choice |
|-------|--------|
| Measure path | Calls generate directly; may set `AZURA_PROFILE_FILE` for twin — never production ensure |
| Repair | Install missing packages with `--ignore-scripts` (no migrate); targeted prisma generate only |
| Restore | `finally`-protected + pre-flight standard profile |
| Completion | Known gap repaired + measure retried; new inconclusive needs new blocker evidence |

## Measured results

1. **Prior M8 verbatim:** `Module not found: Can't resolve 'qrcode'` (`/tmp/m8-measure.log`).
2. **Repair:** `qrcode@1.5.4` installed with `--ignore-scripts --no-save --legacy-peer-deps` (`npm ci --ignore-scripts` failed ERESOLVE on next-auth/nodemailer peers). Confirmed `import('qrcode')` works. No migrate.
3. **Retry:** `node scripts/platform/measure-profile-boundary.mjs` — enterprise build aborted on **new** blocker.
4. **New verbatim:** `Failed to load SWC binary for darwin/arm64` (native binary Team ID / code-signature mismatch under execute Node; npm registry fallback also broken).
5. **Verdict: `inconclusive`** — see [profile-boundary-summary.json](../inventories/profile-boundary-summary.json). Artifact restore ran in `finally` (enterprise + marketing restored).
6. **Exclusion CI gate:** none.

## Acceptance

- Known `qrcode` gap verified repaired; measure retried
- Fresh inconclusive with new SWC evidence (not a restated qrcode miss)
- Summary + living docs updated
- Handoff **M9** deferred
