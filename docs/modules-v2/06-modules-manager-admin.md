# Modules Manager — admin surface

> **Route:** `/admin/modules`  
> **Nav:** Admin group `modules` → `navItemId: "installed-modules"` (`src/config/admin-nav.ts`)  
> **Phase 5 operator UX:** [plans/phase-5-modules-manager-ux.md](./plans/phase-5-modules-manager-ux.md)

Profile generation remains a **build/release** step (`profile:generate` / prebuild) — never a runtime toggle on this screen.

## 1. File map

| Piece | Path |
|-------|------|
| Server page | `src/app/admin/(dashboard)/modules/page.tsx` |
| Client screen | `src/app/admin/(dashboard)/modules/module-screen.tsx` |
| Display model | `src/modules/module-screen.ts` → `listModulesForAdmin()` |
| Types | `src/modules/module-screen-types.ts` (overlays: deps, compat, migrations, lastFailureHint) |
| UI helpers / copy | `src/modules/module-screen-ui.ts` |
| Toggle + module preflight | `src/modules/module-screen-actions.ts` |
| ZIP / update / uninstall / system preflight | `src/platform/packages/actions.ts` |
| Preflight dry-run | `src/platform/packages/package-preflight.ts` |
| Lifecycle audit | `src/platform/packages/package-lifecycle-audit.ts` |
| Shared package UI copy | `src/platform/packages/package-ui-copy.ts` |

## 2. What the screen shows

1. **Header** — Modules for this deployment.
2. **Profile warning** — If `profile.generated === false`, toggles are read-only; banner points to edit YAML → `profile:generate` → redeploy (never a Generate button here).
3. **Import package** — Upload ZIP (manifest + allowlisted payloads). Unknown ids stay `pending`. Import may run **up** migrations; it does not hot-load code.
4. **One card / row per Module or ledger package** — lifecycle labels, **computed overlays** (pending / incompatible / blocked-by-deps / migrations-pending / profile-omitted), enable toggle (when included), required capabilities (read-only), required presets, Module settings link, export, update / uninstall / remove per matrix.
5. **Preflight confirm** — Enable / Disable / Update / Apply theme / Open overlay run a dry-run first; blockers hard-stop, warnings allow confirm.

Builtin Modules come from `getModuleManifests()`. Non-builtin `PackageInstallation` rows (pending themes/extensions/unknown apps) are appended with no enable toggle that pretends they are profile-included builtins.

## 3. Control matrix (operator-facing)

| Control | Typical when | Behavior |
|---------|--------------|----------|
| **Enable toggle** | Included builtin + generated profile | `activatePackage` / `deactivatePackage` |
| **Preset toggles** | Required presets of a Module | `updateSiteFeatures` with cascade |
| **Import ZIP** | System section | Allowlisted payloads only; honest pending messaging |
| **Export ZIP** | Any lifecycle state including pending | Metadata / tokens / SQL — not a full code export |
| **Update** | Included builtin + generated profile | Re-apply ship-time **up** SQL / version bump |
| **Uninstall** (soft) | Included builtin **or** pending/unavailable | Builtin → same effect as turning Enabled off (deactivate + keep ledger); pending → delete ledger |
| **Remove** (typed confirm) | Pending / unavailable non-builtin only | Delete ledger; may run down SQL; **refused** for every builtin |
| **Purge** | — | **Not available** in Modules Manager (**R3-gated** deferred product); UI states that explicitly — [plans/r3-follow-on-decision-gates.md](./plans/r3-follow-on-decision-gates.md) |

Capabilities listed on a card are **not** toggles. Lifecycle ops write `SecurityAuditLog` (`package.<op>.ok|fail`) without secret payloads.

## 4. Auth

| Action | Guard |
|--------|-------|
| Feature / Module toggles | `requireAdmin` |
| ZIP import/export, Update, Uninstall, Remove | `requireAdminSection("system")` |

## 5. Honest messaging (Option A + C)

The UI must not imply WordPress-style “upload plugin → new routes run now.” Pending packages are awaiting a **deployment that includes that package’s code and registry entry**. Install/activate controls that cannot succeed for pending apps are hidden or explained.

Theme deactivate vs extension “Close overlay” use different copy — deactivate does not mean “revert the entire site look,” and Close overlay is not the same as Module deactivate.

## 6. Operator checklist

1. Confirm profile includes the Module (`AZURA_PROFILE`, YAML, `npm run profile:generate` / prebuild).
2. Open **Admin → Modules** and enable; confirm required presets flip on.
3. Confirm admin nav and routes; verify writes via Module guards / `assertModuleActive` patterns.
4. Disable; confirm admin 404 or action refusal; confirm data remains.
5. Optional: export metadata ZIP; import only across environments that share the same build contract.

## 7. What Modules Manager does **not** do

- Change `AZURA_PROFILE` or regenerate `deployment-profile.json`
- Enable a Module the profile omitted
- Uninstall Module source from the repository
- Purge Module data on deactivate
- Toggle Capabilities
- Hot-load executable package code from ZIP
