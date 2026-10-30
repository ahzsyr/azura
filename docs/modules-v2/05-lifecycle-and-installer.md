# Lifecycle and package installer

Canonical implementation: `src/platform/packages/installer.ts`  
Pure helpers: `src/platform/packages/lifecycle.ts`  
SQL: `src/platform/packages/package-migrations.ts`  
ZIP IO: `src/platform/packages/zip-store.ts`  
Admin actions: `src/platform/packages/actions.ts`

**State transitions and failure recovery (Phase 2):** [plans/phase-2-state-transitions.md](./plans/phase-2-state-transitions.md)

`requiredCapabilities` on manifests remain a **profile ceiling / Modules screen display** concern — they are **not** enforced at activate (only `requiredPackages` and preset cascade are).

## 1. Lifecycle operations

| Operation | Function | Effect |
|-----------|----------|--------|
| Seed builtins | `ensureBuiltinPackages` / `installIncludedProfilePackages` | Ensure ledger rows for profile-included Module manifests |
| Install | `installPackage` | Create ledger + apply **up** SQL for included builtin |
| Activate | `activatePackage` | Dependencies → up SQL → SiteFeature on → status `active` (themes/extensions diverge — see below) |
| Deactivate | `deactivatePackage` | Block if active dependents → SiteFeature off → status `inactive` (no SQL down for Modules) |
| Update | `updatePackage` | Re-apply ship-time **up** SQL / version bump for included builtin |
| Soft uninstall | `uninstallPackage(id, false)` | Builtin included → deactivate + keep row; pending/non-builtin → delete row |
| Destructive remove | `uninstallPackage(id, true)` | **Refused** for every builtin; else may run **down** SQL then delete row |
| Export ZIP | `exportPackageZip` | Manifest (+ theme tokens / builtin SQL); **not** theme binaries |
| Import ZIP | `importPackageZip` | Validate allowlist → install / pending / theme / extension paths |

## 2. Builtin Module activate / deactivate (kind `app`)

### Activate

1. Reject if not profile-included (`assertIncluded`).
2. Require a built-in manifest (else “pending until code is deployed”).
3. `assertDependenciesActive` — every `requiredPackages` entry must be status `active`.
4. Ensure `PackageInstallation` row exists with non-`active` status (`installed` / `inactive`) **before** enablement.
5. Apply allowlisted **up** migrations (`applyPackageSqlOrThrow(..., "up")`) — checksum-idempotent; mismatch **refuses**.
6. `updateSiteFeatures([{ module, enabled: true }])` (preset cascade + status sync to `active`). On SiteFeature failure, force status **not** `active` and throw.
7. Finalize version/manifest on the ledger row.

### Deactivate

1. `dependents(packageId)` — only **active** packages that list this id in `requiredPackages` block.
2. Prefer `updateSiteFeatures([{ module, enabled: false }])` so status syncs to `inactive` in one path.
3. **No** SQL down, **no** table drop, **no** content purge.

## 3. Theme packages (kind `theme`)

Import path accepts `azura-package.json` + `theme-tokens.json` (+ optional allowlisted assets). Missing tokens → `pending`. Valid tokens → `installed` then activatable.

| Action | Behavior |
|--------|----------|
| Activate | Merge tokens (+ resolved asset URLs / rich fields) onto **published** SiteTheme; refuse dirty Theme Studio draft; stamp provenance |
| Deactivate | Clears “applied source” bookkeeping — **live look stays** |
| Export | Re-emits tokens (with `package:` refs); **does not** re-emit binaries |

See also theme helpers under `src/platform/packages/theme-*.ts` and [`docs/azura-v2/packages/themes-migration.md`](../azura-v2/packages/themes-migration.md).

## 4. Extension packages (kind `extension`)

Import is **inert** (does not hide features until armed).

| Ledger sense | Operator language | Effect |
|--------------|-------------------|--------|
| `installed` | Inert | Overlay not applying |
| `active` | Open overlay | Contributions follow Module rules only (overlay open) |
| `inactive` | Closed overlay | Listed admin nav/block ids locked/hidden |

`adminRoutePrefixes` on extensions must be empty (M7.1). Public saved blocks keep rendering; overlay locks are admin-builder oriented via `overlayLockedBlockTypes`.

## 5. ZIP contract (Option A + C)

### Allowed (high level)

- `azura-package.json` (required)
- Allowlisted `migrations/*.sql` (up on import/activate/update; down only on destructive remove where permitted)
- Theme: `theme-tokens.json` + limited `assets/*` / `fonts/*`
- Extension: manifest-only contribution overlays

### Forbidden

- Executable JS / TS / TSX / JSX / WASM / etc. (ZIP entry allowlist rejects)
- Unknown contribution keys under `contributions`
- Declaring theme tokens as a PackageManifest contribution key

Import of an unknown Module id (no builtin manifest) yields **`pending`**: metadata stored; no enable toggle that would pretend code exists.

## 6. Dependency rules (summary)

| Check | Helper | When |
|-------|--------|------|
| Required packages active | `inactiveRequiredPackages` | Activate / graph assert |
| Active dependents block off | `blockingDependents` | Deactivate / uninstall |
| Enabled Module dependents (SiteFeature map) | `blockingEnabledModuleDependents` | Feature toggle expand / assert |
| Required presets stay on | Module manifests + `assertEnabledModulesKeepRequiredPresets` | After toggles |
| Compatibility | `isCompatibleWithCore` | ZIP import |

`requiredCapabilities` are **not** enforced at activate — they are a profile generate / display concern.

## 7. Data integrity guarantees (current)

| Event | Data / schema |
|-------|----------------|
| Deactivate Module | Content retained; schema retained |
| Soft uninstall builtin | Same as deactivate (+ ledger kept) |
| Remove pending non-builtin | Ledger row deleted; no claim of content purge |
| Destructive remove | May run down SQL for non-builtins only; builtins refused |
| Profile omit + redeploy | Product surface removed from build ceiling; DB rows may remain |

## 8. Auth on installer actions

Package ZIP / Update / Uninstall / Remove server actions use `requireAdminSection("system")`.  
Feature toggles use `requireAdmin`.

## 9. Update channel and rollback classes (Phase 8)

**Update channel:** **Manual / ship-time** only. Modules Manager **Update** re-applies allowlisted filesystem **up** SQL for included builtins. There is no beta/stable feed and no remote channel registry.

Maintainer publish path: ship Module code + migrations in-repo → deploy a profile-including build → operator **Update**.

| Class | Action | Recovers | Limit |
|-------|--------|----------|-------|
| **A** | Deactivate / soft uninstall | Runtime off; data kept | Not a schema/content undo |
| **B** | Re-activate / re-Update | Idempotent ups / enable | Checksum mismatch refuses |
| **C** | Typed Remove + optional down SQL | Non-builtin teardown | Builtins always refused |
| **D** | — | — | **Not supported:** universal downgrade via down SQL alone |

**Update ≠ rollback.** Full policy: [plans/phase-8-operational-maturity-release-policy.md](./plans/phase-8-operational-maturity-release-policy.md).
