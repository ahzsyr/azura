# Modules Manager Upgrade — Phase M3 (Lifecycle consistency)

> **Status:** Complete — M3 done → execute **M4**  
> **Prerequisite:** [modules-manager-startup-phase.md](./modules-manager-startup-phase.md) exit (M0 + M1 + M2 complete)  
> **Parent:** [application-platform-upgrade-plan.md](./application-platform-upgrade-plan.md) §7 M3 / U3  
> **Handoff:** **M4** (contribution contract polish) — not M5  
> **Cursor plan:** `.cursor/plans/m3_lifecycle_phase_ceb03513.plan.md`  
> **CI:** `npm run test:modules-lifecycle` (wired into `"ci"`). Keep `AZURA_PROFILE: enterprise` in CI — `profiles:verify` restores enterprise in `finally`; non-enterprise CI profiles would leave a fragile artifact before prebuild.

## Goal

Finish parent **M3 / U3**: Admin UI and installer tell one Option A + C truth, with **pinned tests in CI**. This is a **re-verify-and-close** phase — most UX and lifecycle helpers already landed in Extensibility Phases 2/7/8.

**Success metric:** Operators see honest lifecycle states/controls; cascade / installer SQL asymmetry / screen import contract are covered by npm scripts that CI runs; deferred `packages/*.md` wording matches **actual** editor vs public behavior.

**Non-goals:** Uninstall/update/purge UI (M5); public renderer gating on block availability; changing `requiredPresetToggles` API; Core→Module extractions (M6); theme tokens host (M7); marketplace (M9); Edge Prisma SiteFeature; executable ZIP beyond allowlisted up SQL on import.

```text
L0  Re-verify existing suite (module-screen-ui + package-lifecycle + package-ui-copy)
L1  Pin same-save cascade + installer SQL asymmetry + screen import contract
L2  Register lifecycle tests in package.json + note CI profile ordering
L3  Apply deferred packages/*.md honesty (match code; no public-unavailable claim)
L4  Lock Phase 7 UX defaults as-is (section visible / rows disabled) + toggle SQL asymmetry
Exit M3 → M4
```

### Decisions locked (audit pass 2)

| Topic | Choice |
|-------|--------|
| Public blocks when module off | Document truth: editor Inactive badge; **public still renders** from stored JSON. Renderer change out of M3. |
| `requiredPresetToggles` when `!profileGenerated` | **Document-as-is:** section visible, rows disabled via `writable: false`. Do not change `moduleControlsForState`. |
| ZIP import on Modules screen | **Allowed** (`PackageTransfer` → allowlisted **up** SQL). Forbidden UI = Update / Uninstall / Purge only. |
| Installer static test | Parse named function bodies; never file-wide `"down"` grep. |

---

## Already built (do not rebuild; L1 extends)

| Area | Evidence |
|------|----------|
| Lifecycle labels / control availability | `src/modules/module-screen-ui.ts` + Modules screen |
| Pending / ZIP honest copy | `src/platform/packages/package-ui-copy.ts` |
| SiteFeature ↔ package sync | `lifecycle.ts` + `site-features.ts` + `planPackageStatusSync` |
| Preset cascade (module-off via preset-off) | `expandFeatureToggles` + existing lifecycle tests |
| `requiredPackages` / pending-sync / deactivate-blocked | Already in `package-lifecycle.test.ts` — **extend, do not duplicate** |
| Export + import ZIP on cards | `module-screen.tsx` `PackageTransfer` + `actions.ts` `importInstalledPackage` |
| No Update/Uninstall/Purge UI | Screen has no those labels; still has live import path |

---

## Remaining holes (actual M3 work)

### L0 — Re-verify

Run and confirm green:

- `tsx --test src/modules/__tests__/module-screen-ui.test.ts`
- `tsx --test src/platform/packages/__tests__/package-lifecycle.test.ts`
- `tsx --test src/platform/packages/__tests__/package-ui-copy.test.ts`

Document any failures as bugs to fix in L1 — do not rewrite green helpers. L0 baseline must stay valid under L4 (no `requiredPresetToggles` behavior change).

### L1 — Pin tests (extend, do not duplicate)

| # | Behavior | Notes / home |
|---|----------|--------------|
| 1 | **Same-save precedence:** one request with `module:documentation=true` + `preset:knowledge=false` → knowledge ends **enabled** | New pin. Complementary to existing “turning a required preset off also turns off the app” (keep that test; different request shape). `package-lifecycle.test.ts` |
| 2 | Enable documentation with `includedPresets: []` → no `preset:knowledge` write | **Regression guard** for included-only expansion (not a newly discovered hole) |
| 3 | **Installer SQL asymmetry** — parse function bodies in `installer.ts`: `deactivatePackage` has no `applyPackageSql`; `activatePackage` calls `applyPackageSql(..., "up")`; only `uninstallPackage` + `destructive` owns `applyPackageSql(..., "down")`. Do not grep file-wide for `"down"` (`updatePackage` error text contains that word). | Source-contract test |
| 4 | **Screen import contract:** `module-screen.tsx` may import `exportInstalledPackage` / `importInstalledPackage` from `platform/packages/actions.ts`; must not import `updatePackage` / `uninstallPackage`; no Update / Uninstall / Purge labels. Document that ZIP import runs allowlisted **up** SQL. | Source assert scoped to what the screen imports |
| 5 | `formatModuleActionError` — skip if green | — |

### L2 — CI registration

1. Add `test:modules-lifecycle`:  
   `tsx --test src/modules/__tests__/module-screen-ui.test.ts src/platform/packages/__tests__/package-lifecycle.test.ts src/platform/packages/__tests__/package-ui-copy.test.ts` (+ any L1 file).
2. Append `npm run test:modules-lifecycle` to `package.json` `"ci"` (near `test:marketing-ingress`).
3. No new GH workflow — [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) already runs `npm run ci` with `AZURA_PROFILE: enterprise`.

**Ordering caveat (document here):** `profiles:verify` inside `ci` restores enterprise in `finally`. Safe while CI stays enterprise; fragile if CI ever uses a non-enterprise profile (verify could leave a non-selected artifact before prebuild). Keep enterprise unless redesigned.

### L3 — Deferred package migration docs

Apply honesty edits under [`../packages/`](../packages/) only — **match code**:

| File | Edit |
|------|------|
| `presets-migration.md` | JSON retained; **editor** may mark Inactive; **public still renders** from stored JSON until a later milestone changes the renderer. Do **not** claim public unavailable. |
| `catalog-ecommerce-migration.md` | Same precision as presets. Status: later; not a plugin host / no hot-load ZIP. |
| `themes-migration.md` | Status: later. Today’s ZIP = metadata + allowlisted SQL only. **Planned** Option C: token-only apply without rebuild once implemented; React themes deploy-gated. Demote “can apply without a rebuild” as current. |
| `seo-app-migration.md` | Status: later; **add** one line: not a plugin host / no hot-load ZIP. |

Do **not** invent public-unavailable behavior or new migration steps.

### L4 — Lock Phase 7 UX (docs + assert as-is)

Record in this file + `modules-manager.md`:

| Question | Locked default for M3 |
|----------|----------------------|
| Export ZIP on all cards | **Keep** (`exportZip: true`), including pending/unavailable |
| ZIP import | **Keep** — allowlisted **up** SQL via `importInstalledPackage` |
| Confirm dialog on toggle | **Keep** immediate toggle + `role="alert"` errors |
| Ungenerated profile | Banner remains; **section visible / rows disabled**: `requiredPresetToggles: true`, `enableToggle: false`, `writable: false` for module and presets |
| Toggle off | SiteFeature + status only — **no** SQL down |
| Toggle on | `activatePackage` re-runs allowlisted **up** migrations (checksum-idempotent) |
| Update / uninstall / purge | Deferred to **M5** |

**Verify** in `module-screen-ui.test.ts` (already partly covered — keep green assertions; do not invert `requiredPresetToggles`):

- `profileGenerated: false` → `enableToggle === false`, `requiredPresetToggles === true` for included states.
- Document that preset/module `writable` requires `profileGenerated` so rows are disabled while the section may still show.

---

## Acceptance

- L0 suites green (baseline compatible with L4).  
- L1 pins green (same-save, regression guard, installer asymmetry, screen import contract).  
- `npm run test:modules-lifecycle` exists and is in `"ci"`; AZURA_PROFILE caveat recorded.  
- Package docs honest **without** claiming public unavailable.  
- No Update/Uninstall/Purge UI; ZIP import allowed and named.  
- Toggle SQL asymmetry documented for operators.  
- Parent M3 marked complete; handoff → “M3 done → execute M4”.

## Rollback

- Revert L1 test code and L2 npm script freely.  
- **Do not** revert L3/L4 doc honesty alone — those edits describe current code. Revert docs only with code that would restore the old (false) claims.

## Out of M3 (explicit)

| Id | Topic |
|----|--------|
| M4 | Contribution inventory CI drift, `listActivePackageSections` multi-root, field-semantics doc polish |
| M5 | Update / uninstall / purge UI |
| — | Public renderer gating on `availability` / `isBlockRequirementMet` |
| M8 | Dual-profile bundle measurement |

## Implementation order

```text
L0  Re-verify existing tests
L1  Extend pins (same-save, installer bodies, screen import contract)
L2  npm script + ci wire-up + profile caveat note
L3  packages/*.md honesty (editor vs public; themes planned)
L4  modules-manager.md UX locks + toggle-on up SQL; mark M3 complete → M4
```
