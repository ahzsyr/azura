# Modules Manager Upgrade — Phase M8 (Boundary evidence & shared-import hygiene)

> **Status:** Complete — M8 done → **M2.1** / **M8.1** done → next **M9** deferred  
> **Prerequisite:** [modules-manager-m7.3-rich-theme-fields-phase.md](./modules-manager-m7.3-rich-theme-fields-phase.md) exit  
> **Parent:** [application-platform-upgrade-plan.md](./application-platform-upgrade-plan.md) §7 M8  
> **Handoff:** [M8.1](./modules-manager-m8.1-twin-measure-repair-phase.md) then **M9** deferred  
> **CI:** `inventory:marketing-shared-edges` (snapshot contract; **no** exclusion gate)

## Goal

Know what profile omission actually removes — with honest instruments. Document shared static imports into Marketing as **accepted coupling**. Do **not** claim bundle exclusion. Do **not** break the import graph this phase.

## Locks (A+1 + audit pass 2)

| Topic | Choice |
|-------|--------|
| Scope | Measure + docs only; no import-graph refactor; no CI fail-on-marketing-symbol |
| Twin pair | `enterprise` vs ephemeral `enterprise-minus-marketing` (Marketing-only delta) |
| Uncontrolled pair | As-shipped `marketing.yaml` must **not** be used for Marketing-only causation |
| Inventory | Full production edges + **imported symbols**; reviewed snapshot; re-snapshot command on CI fail |
| Build safety | Explicit `profile:generate` + assert (Hostinger skips npm `prebuild`); `AZURA_MEASURE_NO_DB=1`; restore artifact |
| Markers | `clientChunks` / `serverChunks` / `metadata`; absence = scan miss ≠ exclusion |
| Verdict | `conclusive` \| **`inconclusive`** — both are legitimate M8 exits |

## Instrument limits

Matched twin + no-DB Hostinger/Next build + substring scan cannot prove Marketing **exclusion**. Parent **DG7** (measure first; gate only if product requires): this instrument stays **docs-only** — no exclusion CI gate. Minification can erase path strings. Metadata hits are not shipped code. M8 does not add webpack module graphs or source-map symbol audits.

## Docs template (required sections)

1. Profile = access / nav / ceiling; middleware 404 ≠ exclusion.
2. Matched-twin run: date, commands, report paths.
3. **Verdict:** `conclusive` \| `inconclusive` + one-paragraph rationale (required).
4. Marker table by bucket; scan miss ≠ exclusion; metadata ≠ shipped code.
5. Production accepted-coupling list from snapshot (importer → symbols).
6. No exclusion CI gate; stronger instrumentation is future work, not M8 failure.

## Scripts

| Script | Role |
|--------|------|
| [`scripts/platform/inventory-shared-module-edges.mjs`](../../../scripts/platform/inventory-shared-module-edges.mjs) | Discover edges + symbols; diff snapshot |
| [`scripts/platform/measure-profile-boundary.mjs`](../../../scripts/platform/measure-profile-boundary.mjs) | Matched-twin build/scan; verdict |
| Snapshot | [`docs/azura-v2/inventories/marketing-shared-edges.json`](../inventories/marketing-shared-edges.json) |
| Checked-in summary | [`docs/azura-v2/inventories/profile-boundary-summary.json`](../inventories/profile-boundary-summary.json) |

Re-snapshot:

```bash
node scripts/platform/inventory-shared-module-edges.mjs --write-snapshot docs/azura-v2/inventories/marketing-shared-edges.json
```

Measure:

```bash
node scripts/platform/measure-profile-boundary.mjs
```

## Measured results (execute)

1. **Profile semantics:** Profile = access / nav / ceiling; middleware 404 ≠ bundle exclusion.
2. **Matched-twin run:** `2026-10-28T20:04:31.858Z` — `node scripts/platform/measure-profile-boundary.mjs` (explicit generate+assert, `AZURA_MEASURE_NO_DB=1`). Local paths under gitignored `performance-reports/profile-boundary/`; checked-in copy: [profile-boundary-summary.json](../inventories/profile-boundary-summary.json).
3. **Verdict: `inconclusive` (updated M8.1).** M8 aborted on missing `qrcode`; M8.1 repaired that gap and retried. New blocker: Next SWC binary failed to load under the execute Node runtime. Twin scan still incomplete — legitimate exit. See [profile-boundary-summary.json](../inventories/profile-boundary-summary.json).
4. **Markers:** No client/server/metadata table (build did not produce a scannable twin pair). When a future run completes, report buckets separately; scan miss ≠ exclusion; metadata ≠ shipped code.
5. **Accepted coupling:** See [deployment-profiles.md](../../deployment-profiles.md) and full snapshot (**87 production + 3 test = 90 total** edges including Marketing admin/API trees; cross-cutting production edges listed in docs). Runtime guards remain on Marketing ingress; static imports are accepted coupling for M8.
6. **CI:** `inventory:marketing-shared-edges` on `ci` only — **no** exclusion gate.

## Acceptance

- Snapshot includes importer, module path, imported symbols; CI fails on unreviewed add/remove/symbol change and prints re-snapshot command
- Measure script is safe and emits buckets + `verdict` (or inconclusive summary on abort)
- Docs use the template (**inconclusive** OK)
- No exclusion gate on `ci`
- Handoff **M9**
