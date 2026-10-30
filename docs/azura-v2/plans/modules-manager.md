# Modules Manager

> **Admin route:** `/admin/modules`  
> **Upgrade roadmap:** [application-platform-upgrade-plan.md](./application-platform-upgrade-plan.md)  
> **Startup Phase:** [modules-manager-startup-phase.md](./modules-manager-startup-phase.md)  
> **Related living docs:** [deployment-profiles.md](../../deployment-profiles.md) · [glossary.md](../../glossary.md) · [platform-boundaries.md](../../platform-boundaries.md)  
> **Per-module docs:** [documentation.md](../../modules/documentation.md) · [status-page.md](../../modules/status-page.md) · [marketing.md](../../modules/marketing.md) · [advanced-seo.md](../../modules/advanced-seo.md)

The Modules Manager is the admin surface that lets an installation **activate, deactivate, import, and export** optional product apps (Modules) that the current Deployment Profile includes. It does not compile profiles, and it does not add code that the build omitted.

---

## Purpose

AZURA ships as a composable platform. A Deployment Profile is the **build-time ceiling**: which Core slices, Capabilities, Presets, and Modules a server build carries. The Modules Manager is the **runtime switchboard** for Modules (and the Presets those Modules require) on one installation.

| Question | Answered by |
|----------|-------------|
| Can this build ever run Documentation? | Deployment Profile (`modules` list) |
| Is Documentation on for this site right now? | Modules Manager → `SiteFeature` + package status |
| Does turning Documentation off delete its pages? | No — flags only; data and block JSON stay |

Enabling an app also enables the presets it requires. Deactivating an app removes its admin links from the *effective* surface. Middleware and the compiled profile still define the hard ceiling for paths the build never included.

---

## Admin UI

| Piece | Path |
|-------|------|
| Server page | `src/app/admin/(dashboard)/modules/page.tsx` |
| Client screen | `src/app/admin/(dashboard)/modules/module-screen.tsx` |
| Display model | `src/modules/module-screen.ts` → `listModulesForAdmin()` |
| Types | `src/modules/module-screen-types.ts` |
| Toggle action | `src/modules/module-screen-actions.ts` → `setSiteFeatureEnabled` |
| ZIP import/export | `src/platform/packages/actions.ts` |

### What the screen shows

1. **Header** — Modules for this deployment.
2. **Profile warning** — If `profile.generated === false`, toggles are read-only.
3. **Import package** — Upload ZIP (manifest + optional allowlisted SQL). Unknown ids stay `pending`. Import may run **up** migrations; it does not hot-load code.
4. **One card per Module** — status lifecycle labels, enable toggle (when included), required capabilities (read-only), required presets, export metadata ZIP (`exportZip: true` on all lifecycle states, including pending/unavailable).

### Locked UX defaults

| Default | Behavior |
|---------|----------|
| Export on pending/unavailable | Kept — metadata/SQL backup |
| Confirm on toggle | Phase 5 — preflight dialog before Enable/Disable/Update/Apply/Open; blockers hard-stop |
| Ungenerated profile | Banner stays; **section visible / rows disabled** — `requiredPresetToggles: true`, `enableToggle: false`, module/preset `writable: false` (requires `profileGenerated`) |
| ZIP import | Allowed — allowlisted **up** SQL only |

### Update / Uninstall / Remove (M5)

Server-enforced (`system` section). UI matrix mirrors installer — not a substitute.

| Control | When | Behavior |
|---------|------|----------|
| **Update** | Included builtin + generated profile | Re-applies ship-time **up** SQL / version bump. Refused if omitted, ungenerated, or pending. |
| **Uninstall** (soft) | Included builtin (generated) **or** pending/unavailable | Included builtin → deactivate + keep ledger (code stays in build; data retained; can enable again). Pending/non-builtin → delete ledger row. Dialog confirm (no typed phrase). |
| **Remove** (typed) | Pending or unavailable (non-builtin) only | Type package id. Clears ledger row; does **not** claim schema/content deletion. **Any builtin** (included or omitted) → hidden + installer refuses `destructive: true` before down SQL. Profile omit + redeploy removes an app from the product. Includes **`advanced-seo`** (M6 builtin). |

### Advanced SEO operator note (M6)

- Module id `advanced-seo` — enterprise profile by default. Soft Uninstall deactivates Advanced admin surfaces; Basic SEO + public head/llms/indexnow remain.
- Advanced pages 404 when inactive/omitted; Advanced APIs/actions refuse non-`active` ingress.
- Shared Search Engines page stays; Advanced configure tab soft-disables when the module is off.
- Physical `features/seo/platform` relocate is **not** required for gating — see [seo-app-migration.md](../packages/seo-app-migration.md).

### Theme token packages (M7) + approved assets (M7.2)

- Import a `kind: theme` ZIP with `azura-package.json` + `theme-tokens.json` (no SQL), optionally `assets/logo.*`, `assets/favicon.*`, `fonts/*`. Valid tokens → `installed`; missing tokens → `pending`. Binaries become CMS media (fonts listed under Documents). SVG with external refs is rejected.
- Tokens may set `logoUrl` / `faviconUrl` / `typography.fontFaces` via `package:` refs (resolved on activate), plus rich fields (`customCss`, brand/header/footer, effects, mobile browser) with **strict complete objects** (whole-object replace; no Studio schema defaults).
- Package `customCss` is reject-only validated (postcss + detection escape decode). **Only package-applied CSS is policy-guaranteed** — Theme Studio save remains unsanitized until a follow-up.
- **Activate** applies tokens + resolved URLs/`@font-face`/rich fields to published SiteTheme (refuses dirty Theme Studio draft) and re-stamps provenance. **Deactivate** only clears “applied source” — the look stays.
- Export re-emits tokens (with `package:` refs) but **not** binaries — re-attach on re-import. See [themes-migration.md](../packages/themes-migration.md).

### Contribution overlays (M7.1)

- Import a `kind: extension` ZIP (`azura-package.json` only) that gates **shipped** module nav/block ids. Import is **inert** (does not hide features).
- **Open overlay** / **Close overlay** (not “Deactivate”): Open arms open; Close arms closed and hides listed **admin** nav/picker entries; **Remove** unarms (module-only again). Theme Deactivate still leaves live appearance unchanged — different meaning.
- Public saved blocks keep rendering; overlay locks are admin-builder only via `BlockAvailabilityProfile.overlayLockedBlockTypes`.

### Toggle behavior

- Module enable → `activatePackage(id)` — re-runs allowlisted **up** migrations (checksum-idempotent). Schema is not a pure flag flip on turn-on.
- Module disable → `deactivatePackage(id)` — SiteFeature + status only; **no** SQL down / no table drop.
- Preset toggles → `updateSiteFeatures` with dependency expansion.
- Feature toggles: `requireAdmin`. ZIP / Update / Uninstall / Remove: `requireAdminSection("system")`.

---

## Two-layer availability model

```text
Deployment Profile (compiled JSON, build-time)
  isModuleEnabled / isPresetEnabled / isCapabilityEnabled
        │ AND
SiteFeature rows (installation DB, runtime)
  isModuleActive / isPresetActive
```

- Profile: never rewritten by Modules Manager.
- SiteFeature: kinds `module` | `preset`; missing included rows seeded enabled.
- Availability reads fail **open** on ledger outage; mutation ingress should fail **closed**.
- Deactivate updates flags only — does not delete pages, entities, block JSON, or run SQL downs.
- Activate re-runs allowlisted up migrations when the operator turns a module back on.
- Effective builder profile: modules/presets with disabled rows removed; capabilities stay profile-only.

---

## Module manifests

Canonical: `src/modules/<id>/manifest.ts` → `MODULE_MANIFESTS` in `route-registry.ts`.

| Field | Role |
|-------|------|
| `requiredPackages` | **Activate graph:** must be `active` before activate. **Disable graph:** `blockingEnabledModuleDependents` blocks turning off a Module still required by other enabled Modules. |
| `requiredCapabilities` | Profile generate ceiling; display-only on Modules screen (not activate-enforced) |
| `requiredPresets` | Auto-enabled with Module; turning off can cascade Module off |
| `publicRoutes` | Public **and** `/api/…` prefixes |
| `permissions` | App ACL keys `{id}.read` / `{id}.manage` (Phase 3 `requireModulePermission`); still listed on Modules cards as display-only — not capability toggles |

### Dashboard package links

`listActivePackageSections` iterates **built-in Module manifests only** (`getModuleManifests`) — no `PackageInstallation` ledger read. Imported/pending packages never appear. For each active + profile-included Module it emits **one** link: package label + `adminRoutePrefixes[0]`. `dashboardSections` is declared-only and unused for these links.

### Shipped Modules

| ID | Required presets | Required capabilities |
|----|------------------|----------------------|
| `documentation` | `knowledge` | search, versioning, workflow |
| `status-page` | — | — |
| `marketing` | — | analytics |

Note: Marketing short-link `/a` is outside `/api/marketing` in the manifest; when Marketing is profile-omitted, `/a` is injected into `disabledPublicPrefixes` via `MODULE_EXTRA_DISABLED_PUBLIC` (DG2 / Startup).

---

## Package installer (Option A + C)

ZIP = `azura-package.json` + allowlisted `migrations/*.sql` only — **never** executable JS/TS/React.

| Status | Meaning |
|--------|---------|
| `installed` | Row + migrations; not necessarily serving |
| `active` | Serving; SiteFeature on |
| `inactive` | Installed but off |
| `pending` | ZIP accepted; code not in this build |

`updatePackage` / `uninstallPackage` are exposed via `actions.ts` (`updateInstalledPackage`, `uninstallInstalledPackage`, `removeInstalledPackage`) with M5 guards. ZIP import/export remains (up SQL only on import). Destructive Remove is refused for every builtin before any down SQL.

---

## What Modules Manager does **not** do

- Change `AZURA_PROFILE` or regenerate `deployment-profile.json`
- Enable a Module the profile omitted
- Uninstall Module source from the repository
- Purge Module data on deactivate
- Toggle Capabilities
- Hot-load executable package code from ZIP

---

## Operator checklist

1. Confirm profile includes the Module (`AZURA_PROFILE`, YAML, `npm run profile:generate`).
2. Open **Admin → Modules** and enable; confirm required presets flip on.
3. Confirm nav/routes; verify writes via `assertModuleActive`.
4. Disable; confirm admin 404 / actions refuse; data remains.
5. Optional: export metadata ZIP; import only across environments sharing the same build contract.
