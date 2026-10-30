# Phase 6 — Deployment boundary evidence

**Status:** Complete (finished inconclusive) — durable Node twin measure recorded; profile-gating lane green; exclusion CI gate remains docs-only  

**Parent:** [executive-application-platform-implementation-plan.md](./executive-application-platform-implementation-plan.md) Phase 6  
**Locks:** [phase-0-decisions-freeze.md](./phase-0-decisions-freeze.md) §7  
**Prior:** [phase-5-modules-manager-ux.md](./phase-5-modules-manager-ux.md)  
**Lineage (not current authority):** [azura-v2 Phase 6](../../azura-v2/phases/06-profile-bundle-boundary.md), M8 / M8.1 / M8.2 under `docs/azura-v2/plans/`

## Objective

State accurately what profiles remove and what builds actually contain — without claiming middleware 404 equals client/server Module excision.

## Dual evidence lanes

| Lane | Answers | Hardness | This execute |
|------|---------|----------|--------------|
| `profileGating` | Access / nav / prefix ceiling after compile + assert | Hard (CI) | **Done** — [../inventories/profile-gating-evidence.json](../inventories/profile-gating-evidence.json) |
| `bundleEvidence` | Marker / path hits in Hostinger twin `.next` buckets | Soft / limited | **Complete / inconclusive** — [../inventories/profile-boundary-summary.json](../inventories/profile-boundary-summary.json) (R1 durable Node; no interpretable primary-marker delta) |

These lanes are **separate properties**. A green gating lane never implies Module code is absent from bundles.

## Profile pair

`enterprise` vs ephemeral `enterprise-minus-marketing` (Marketing-only delta from `docs/profiles/enterprise.yaml`). Not the shipped `marketing.yaml` profile.

## Verdict taxonomy

| Exit | Meaning |
|------|---------|
| **Complete** | Durable Node E0 pass + both Hostinger builds + both scans finish → finished `conclusive` *or* finished `inconclusive` |
| **Blocked** | No durable Node / SWC fail / abort mid-measure; abort-path summary ≠ finished baseline |
| **Finished inconclusive** | Builds+scans finished; no interpretable executable-chunk marker delta (accepted coupling or erased strings) |
| **Conclusive marker-delta** | Enterprise-only executable-chunk marker delta under stated method — **not** an exclusion proof |

Ephemeral Codex/CUA/dsh session Node is never a Complete toolchain.

## Report shape (checked-in + local)

See [profile-boundary-summary.json](../inventories/profile-boundary-summary.json). Local twin reports (when unblocked) under `performance-reports/profile-boundary/`.

## Release-gate decision (locked)

```json
{ "exclusionCiGate": false, "decision": "docs-only" }
```

DG7: measure first; do **not** add a dual-profile exclusion ship gate in Phase 6.

## Executive Phase 6 mapping

| Ask | Disposition |
|-----|-------------|
| Matched-profile measurement with reproducible artifacts | **Done** — twin Hostinger Complete path finished under durable Node (R1); verdict **inconclusive** |
| Profile source / generated provenance | **Done** (hashes + M2.2 asserts + gating pack) |
| Route/nav behavior evidence | **Done** (`profileGating` lane) |
| Client/server bundle contents with robust evidence | **Done as finished inconclusive** (boundary markers + substring; no exclusion claim) |
| Treat substring absence as inconclusive | **Done** |
| Decide whether measured exclusion is a release requirement | **Done** → **docs-only / no CI gate** |
| Exclusion CI gate | **Deferred** (explicit non-goal) |

## Non-goals

- Dual-profile exclusion CI ship gate
- Full YAML-byte Hostinger tripwire
- Option B / marketplace / signing
- Advanced SEO ownership moves (Phase 7)
- Claiming “Module code gone” from marker absence alone
- Pretending Complete on ephemeral session Node

## Implementation status

| Slice | Status | Evidence |
|-------|--------|----------|
| P6.1 | **Done** | This file |
| P6.2 | **Done** | `scripts/platform/preflight-measure-toolchain.mjs` |
| P6.3 | **Done** | Expanded summary schema + dual lanes + `releaseGate` |
| P6.4 | **Done** | `AZURA_MODULE_BOUNDARY:<id>` markers + primary/secondary scan |
| P6.5 | **Done** | R1 durable Node (`~/.local/node-v24`); twin builds+scans finished; `verdict: inconclusive` |
| P6.6 | **Done** | `profile-gating-evidence.mjs` → inventory JSON |
| P6.7 | **Done** | modules-v2 + deployment-profiles + azura-v2 authority note |
| P6.8 | **Done** | Exit below; `npm run test:phase6-boundary` |

## Exit gate evidence

| Gate | Evidence |
|------|----------|
| Reproducible report shape | [profile-boundary-summary.json](../inventories/profile-boundary-summary.json) (`status: complete`, `verdict: inconclusive`) |
| Dual lanes separate | Gating pack green; bundle lane finished inconclusive independently |
| No false exclusion claim | `releaseGate.exclusionCiGate: false`; marker absence ≠ exclusion |
| Contract tests | `npm run test:phase6-boundary` |
| R1 verification record | [r1-verification-results.json](../inventories/r1-verification-results.json) (`processGateSatisfied: true`) |

**Phase 6 exit status: Complete (finished inconclusive).** Profile-gating lane green; bundle lane Complete with inconclusive marker delta; docs-only release-gate decision unchanged. Do not re-open P6.1–P6.4; do not treat inconclusive as Module excision.

## Commands (when unblocked)

```bash
npm run preflight:measure-toolchain
# same durable execPath:
"$EXEC_PATH" -e 'require("@next/swc-darwin-arm64"); console.log("swc-ok")'   # or linux/win package
test -f node_modules/next/dist/bin/next
"$EXEC_PATH" scripts/platform/measure-profile-boundary.mjs
npm run evidence:profile-gating
```

## Next

Phase 7 — Extract selected product areas incrementally. Do not reopen Phase 1–6 contracts automatically. A later Complete twin measure updates inventories only — it does not reopen the docs-only release-gate decision without a new product RFC.
