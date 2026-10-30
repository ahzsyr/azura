# Modules Manager Upgrade — Phase M4 (Contribution contract polish)

> **Status:** Complete — M4 done → execute **M5**  
> **Prerequisite:** [modules-manager-m3-lifecycle-phase.md](./modules-manager-m3-lifecycle-phase.md) exit  
> **Parent:** [application-platform-upgrade-plan.md](./application-platform-upgrade-plan.md) §7 M4 / U4  
> **Handoff:** **M5** (update / uninstall / purge UI) — not M6  
> **Cursor plan:** `.cursor/plans/m4_contributions_phase_d03ec4e3.plan.md`  
> **CI:** `npm run test:package-contract` (wired into `"ci"`). Compile-time contribution key completeness via `PACKAGE_CONTRIBUTION_KEY_COMPLETE`.

## Goal

Finish parent **M4 / U4**: one contribution contract, unknown keys rejected, field semantics documented, inventory + first-prefix dashboard-link policy pinned in CI. This is a **re-verify-and-close** phase — most validation and inventory already landed in Extensibility Phases 4–5.

**Success metric:** `npm run test:package-contract` is in `"ci"`; compile-time `PackageContributions` completeness passes typecheck; inventory reverse sync + uniqueness + first-prefix/order pins are green; docs state built-in-manifest-only dashboard links.

**Non-goals:** M5 update/uninstall/purge UI; M6 extractions; M7 theme/token applicator / ledger-driven contribution applicator; multi-link-per-prefix dashboard; public renderer availability gating.

```text
C0  Author this phase doc + README pending row
C1  First green run of contribution-inventory + package-contract (previously unregistered)
C2  Compile-time key completeness + runtime inventory reverse/uniqueness + first-prefix/order pins
C3  Register test:package-contract in package.json ci
C4  Honest docs + mark M4 complete → M5
Exit M4 → M5
```

### Decisions locked

| Topic | Choice |
|-------|--------|
| Dashboard links | **One link per active built-in package**, href = `adminRoutePrefixes[0]`. `dashboardSections` stays declared-only / unused. Does **not** emit one link per prefix. |
| Code path truth | `listActivePackageSections` iterates **`getModuleManifests()` only** — no `PackageInstallation` ledger read. Imported/pending packages cannot appear; profile-omitted / inactive filtered by `isModuleEnabled` / `isModuleActive`. |
| Field semantics | Match `manifest.ts`: `requiredCapabilities` = profile ceiling **and** Modules display (not activate-enforced); `permissions` = labels; `requiredPackages` = activate graph **and** disable graph (`blockingEnabledModuleDependents`). |
| Keys completeness | Compile-time `Record<keyof PackageContributions, true>` (enforced by **typecheck**). Runtime: inventory reverse direction + uniqueness. Do **not** use array `satisfies`. |

---

## Already built (do not rebuild)

| Area | Evidence |
|------|----------|
| Unknown contribution key reject | `validatePackageManifest` + `themeTokens` tests |
| Inventory SoT | `CONTRIBUTION_INVENTORY` + `PACKAGE_CONTRIBUTION_KEYS` |
| Dashboard sections pure helper | `resolveActivePackageSections` uses `[0]` |
| Runtime list | `listActivePackageSections` → built-in manifests only |
| Field semantics JSDoc | `manifest.ts` PackageManifest / PackageContributions |
| Most contract tests | `package-contract.test.ts`, `contribution-inventory.test.ts` (unregistered until C3) |

---

## Remaining holes

### C0 — Phase doc + README

This file. README: add M4 pending row; clear M3 “next execute M4” dangling pointer.

### C1 — Re-verify

```bash
tsx --test src/platform/packages/__tests__/contribution-inventory.test.ts
tsx --test src/platform/packages/__tests__/package-contract.test.ts
```

Fix latent failures before C3. Do not rebuild validators if green.

### C2 — Pins

1. Compile-time `PACKAGE_CONTRIBUTION_KEY_COMPLETE: Record<keyof PackageContributions, true>` next to keys; derive or sync `PACKAGE_CONTRIBUTION_KEYS`. Enforced by typecheck.
2. Runtime (distinct test names): inventory reverse (no extra in-contract keys); inventory key uniqueness; `themeTokens` not-in-contract and not in KEYS.
3. Forward contract (synthetic multi-prefix — shipped modules have one prefix): two prefixes → one section, first href, second never emitted. Do not re-test empty prefixes.
4. Order: `packageManifestFromModule` preserves `adminRoutes` → `adminRoutePrefixes` with a two-element fixture.

### C3 — CI

`test:package-contract` → both suites; append to `"ci"` next to `test:modules-lifecycle`. No new workflow.

### C4 — Docs

- `modules-manager.md`: built-in-manifest-only + first prefix; complete `requiredPackages` (activate + disable graphs). Do not rewrite already-correct capabilities/permissions rows.
- Parent plan: fix M4 capabilities wording; mark M4 complete; restructure §14 Completed (M0–M4) / Next (M5…).
- Phase 9: replace “Deferred backlog only” for M4.
- Skip Phase 5 optional churn.
- README: flip M4 row to done → M5.
- Inventory JSDoc: built-in-manifest-only + first prefix.

---

## Acceptance

- C1 suites green; typecheck green with completeness Record
- `npm run test:package-contract` in `"ci"`
- First-prefix + order + inventory reverse/uniqueness pinned
- Docs honest; Phase 9 fixed; §14 restructured; handoff M5

## Rollback

Revert C2–C3 code/scripts freely. Keep C4 doc honesty unless code restores old claims.

## Out of M4

| Id | Topic |
|----|--------|
| M5 | Update / uninstall / purge UI |
| M6 | Core→Module extractions |
| M7 | Option C theme / contribution applicator |

## Implementation order

```text
C0  Phase doc + README pending
C1  Re-verify (first CI-bound discovery)
C2  Completeness Record + pins
C3  npm script + ci
C4  Docs + mark complete → M5
```
