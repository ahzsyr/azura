# Modules Manager Upgrade — Phase M8.2 (Twin measure — new baseline)

> **Status:** **Blocked on install** — no usable system/nvm Node candidate on this machine  
> **Prerequisite:** [modules-manager-m2.2-profile-source-integrity-phase.md](./modules-manager-m2.2-profile-source-integrity-phase.md), [modules-manager-m2.3-nonprofile-prebuild-hardfail-phase.md](./modules-manager-m2.3-nonprofile-prebuild-hardfail-phase.md)  
> **Parent:** [application-platform-upgrade-plan.md](./application-platform-upgrade-plan.md) §7 M8  
> **Handoff:** Implementation track closed ([track close](./modules-manager-track-close-phase.md)); this baseline remains **out-of-band** until operator Homebrew/nvm Node → Complete path. **M9** deferred.  
> **Inventory:** [../inventories/profile-boundary-summary.json](../inventories/profile-boundary-summary.json)

## Goal

After M2.2 / M2.3 artifact and Hostinger-path changes, start a **new** matched-twin measurement baseline. This execute documents **blocked-on-install** evidence only — **no twin measure** (not a finished inconclusive).

## Exit taxonomy

| Exit | Meaning |
|------|---------|
| **Complete** | E0 pass on a real candidate **and** both Hostinger builds + both substring scans **finish** → `conclusive` or finished `inconclusive` |
| **Blocked** | No candidate / SWC fail / mid-measure **abort**. Abort-path local `inconclusive` ≠ completed baseline |
| **This execute** | **Blocked on install** — empty candidate enumeration + structural SWC signature evidence |

## E0 — Candidate enumeration (2026-10-29)

### Step 0 — Enumerate

| Source | Result |
|--------|--------|
| `command -v node` / PATH | **empty** |
| `/opt/homebrew/bin/node` | **missing** |
| `/usr/local/bin/node` | **missing** |
| `~/.nvm/versions/node` | **absent** |
| `~/.fnm` | **absent** |
| `/opt/homebrew/Cellar/node*` | **absent** |
| Codex `cua_node` | Present but **non-candidate** (hardened-runtime / Team-ID mismatch with adhoc SWC) |

**Usable candidates: none.** Block reason: `no-candidate-binary`.

### Session runtime (not a system/Homebrew install)

| Check | Result |
|-------|--------|
| `cua_node` `execPath` | `/Users/alizahedah/Library/Application Support/Codex/artifact-sessions/runtime-generations/generation-TppSEO/runtime/bin/node` |
| version | v24.22.1 |
| `require("@next/swc-darwin-arm64")` this session | **ok** (simple require probe) |
| Prior M8.1 / early M8.2 Next builds | Team ID / code-signature mismatch under same runtime class |

**This execute still does not measure** (plan lock: blocked-on-install evidence only; no twin run). Durable Complete requires an **operator-installed** Homebrew/nvm Node on a known path, re-run E0, then finished builds+scans. Do not treat ephemeral `cua_node` as the shipping unblock.

### Native SWC signature (structural)

Path: `node_modules/@next/swc-darwin-arm64/next-swc.darwin-arm64.node`

| Field | Value |
|-------|--------|
| CodeDirectory flags | `0x20002` (`adhoc`, `linker-signed`) |
| TeamIdentifier | **not set** |
| `codesign --verify` | valid on disk; satisfies Designated Requirement |

A hardened-runtime loader with its own Team ID cannot map that adhoc library → mismatch is **structural**, not stale state. Fix: operator-installed Homebrew/nvm Node — **not** resigning SWC under `cua_node`.

## Spawn / execPath audit (future Complete)

Verified in tree:

- [`measure-profile-boundary.mjs`](../../../scripts/platform/measure-profile-boundary.mjs) `runNode` → `spawnSync(process.execPath, …)` for generate / assert / hostinger-build / restore.
- Hostinger Next primary: `process.execPath` + `node_modules/next/dist/bin/next` (**present** on this machine).
- Hostinger generators: [`runBuildGenerators`](../../../scripts/deploy/run-build-generators.mjs) → `defaultRunNode` → `process.execPath`.
- Middleware restore in measure `finally` **landed** (M2.3) alongside `deployment-profile.json`.

**Pin for future Complete:** invoke `"$EXEC_PATH" scripts/platform/measure-profile-boundary.mjs` with the E0-passing binary; **require** `nextBin` exists so Hostinger never takes the `npx` PATH fallback (silent runtime split).

## M2.3 discontinuity

Under `AZURA_MEASURE_NO_DB=1`, Hostinger measure regenerates tracked `middleware-manifest.json` (often fallback); measure restores it in `finally`. Pre-/post-M2.3 twin baselines are **not** continuous — together with M2.2 profile provenance this is a **dual** baseline discontinuity.

## Commands (when unblocked — operator Node installed)

```bash
# E0 must pass on this same binary first
"$EXEC_PATH" -e 'require("@next/swc-darwin-arm64"); console.log("swc-ok")'
test -f node_modules/next/dist/bin/next
"$EXEC_PATH" scripts/platform/measure-profile-boundary.mjs
```

Twin: `assertTwinDeploymentProfile`. Enterprise: production assert. Both builds + both scans must **finish**; abort ≠ Complete.

## Instrument limits

Matched twin + no-DB Hostinger/Next + substring scan cannot prove Marketing **exclusion**. A future `conclusive` is a marker-delta claim only. Parent **DG7**: measure first; gate only if product requires — this instrument stays **docs-only** (no exclusion CI gate).

## Acceptance (this execute)

- Empty candidate enumeration recorded — **met**
- Blocked on install + structural codesign — **met** (not a finished measure)
- Dual discontinuity (M2.2 + M2.3) in inventory — **met**
- No twin measure run — **met**
- Next: operator Homebrew/nvm Node → Complete path; **M9 deferred**
