# Architecture overview — current Modules system

## 1. What the system is

AZURA Modules are **optional product applications** that ship inside the same Next.js codebase as Core. A Deployment Profile decides which Modules a build is allowed to run. Modules Manager decides which of those included Modules are on for a given installation.

```text
docs/profiles/*.yaml          AZURA_PROFILE
        │  scripts/build/generate-deployment-profile.mjs
        │  (+ scripts/deploy/prebuild.mjs)
        ▼
src/generated/deployment-profile.json
        │
        ├── middleware / proxy: disabled admin / public / API prefixes   PROFILE CEILING
        ├── admin nav: enabledNavItemIds
        └── isModuleEnabled / isPresetEnabled / isCapabilityEnabled
                │
MODULE_MANIFESTS (route-registry.ts)  ←── src/modules/<id>/manifest.ts
                │
                ├── SiteFeature (DB)          RUNTIME ON/OFF (module | preset)
                ├── PackageInstallation      LIFECYCLE LEDGER
                ├── PackageMigration         ALLOWLISTED SQL HISTORY
                └── Admin Modules screen     /admin/modules
```

## 2. Layers (must not be confused)

| Layer | Source of truth | Operator action that changes it |
|-------|-----------------|----------------------------------|
| **Deployment Profile** | Compiled JSON from YAML + `AZURA_PROFILE` | Rebuild / redeploy with different profile |
| **Module registry** | Static `MODULE_MANIFESTS` in TypeScript | Code change + deploy |
| **SiteFeature** | Installation DB | Modules Manager toggle / installer activate·deactivate |
| **PackageInstallation** | Installation DB | Installer install / activate / deactivate / update / uninstall / ZIP import |
| **App Router + features** | `src/app`, `src/modules`, `src/features` | Code change + deploy |

No layer can enable executable Module behavior that another layer omitted:

- Profile cannot invent a Module not in `MODULE_MANIFESTS`.
- SiteFeature cannot enable a Module the profile omitted.
- ZIP import cannot inject new React routes or server handlers into a running process.

## 3. Request-time behavior (conceptual)

### Profile-omitted Module

1. Prefixes for that Module appear in `disabledAdminPrefixes` / `disabledPublicPrefixes` / `disabledApiPrefixes`.
2. Middleware / proxy returns **404** for matching paths.
3. Modules Manager shows the Module as not included (no enable toggle for that id as a profile-included builtin).
4. Node handlers that call `resolveModuleIngressAccess` see `profile_omitted`.

### Profile-included, runtime-inactive

1. Middleware **does not** re-check `SiteFeature` (by design — no Edge Prisma).
2. Admin layouts / actions / Node ingress should refuse via `isModuleActive` or fail-closed `resolveModuleIngressAccess`.
3. Nav items contributed by the Module are hidden when inactive.
4. Builder treats contributed block types as unavailable; saved block JSON is retained.

### Profile-included, runtime-active

1. Admin routes, public routes, and APIs serve normally (subject to Core auth).
2. Package status should be `active` and SiteFeature `enabled: true` (kept in sync by `updateSiteFeatures` / installer).

## 4. Package kinds

| Kind | Role today |
|------|------------|
| `app` | A Module — built-in product application (`packageKind: "app"` on ModuleManifest). |
| `extension` | Declarative overlay ZIP that can arm/close shipped nav/block contribution ids (M7.1). No new executable routes. |
| `theme` | Token (+ optional asset) ZIP applied to published `SiteTheme` on activate (M7 / M7.2 / M7.3). |

## 5. Integration surfaces Modules use today

| Surface | Mechanism |
|---------|-----------|
| Admin pages | App Router under Module `adminRoutes`; layouts call availability guards |
| Admin nav | `navItemIds` → profile `enabledNavItemIds` + inactive contribution hide + overlay locks |
| Public pages | `publicRoutes` → profile disabled prefixes; App Router files remain on disk |
| APIs | Paths under `publicRoutes` starting with `/api/` → `disabledApiPrefixes` when omitted |
| Builder blocks | `contributedBlockTypes` → `getModuleForContributedBlock` → `isBlockTypeEnabled` |
| Dashboard cards | `listActivePackageSections` from built-in manifests only |
| DB schema | Core Prisma for Module entities; optional package SQL via allowlisted migrations |
| Auth | Core `requireAdmin` / section guards + Phase 3 `requireModulePermission` (`{id}.read` / `{id}.manage`) |
| Events / jobs | Module-owned (e.g. Marketing jobs) with Node ingress checks |

## 6. What Core still owns

- Authentication and admin authorization sections
- Deployment Profile compile and middleware path disabling
- Prisma schema for shared entities
- Theme Studio / SiteTheme persistence (theme *packages* write into that Core store)
- Builder registry shell (Modules contribute block types into it)
- Presets and capabilities as profile composition units

## 7. Mental model for operators

> **Profile = what this server build can ever run.**  
> **Modules Manager = which of those apps are on for this site right now.**  
> **ZIP = metadata, SQL ups, theme tokens, or extension overlays — not a plugin runtime.**
