# Contributions, extensions, and themes

Option **C** = declarative runtime contributions **without** loading new executable server/UI code from a ZIP.

Canonical inventory: `src/platform/packages/contribution-inventory.ts`.  
Integration matrix (Phase 4): [plans/phase-4-integration-matrix.md](./plans/phase-4-integration-matrix.md).

## 1. Contribution key inventory

| Key | Status | Consumer / notes |
|-----|--------|------------------|
| `adminNavItemIds` | **Operational** | Inactive Module nav hidden via `listInactiveContributedNavItemIds` → AdminSidebar; M7.1 unions armed-closed extension overlay nav ids |
| `adminRoutePrefixes` | **Operational** | Dashboard: one link per active **built-in** Module from `adminRoutePrefixes[0]` via `listActivePackageSections` / `getModuleManifests` only. Admin 404 gating uses Module/profile `adminRoutes`. Extensions must leave empty. |
| `blockTypes` | **Operational** | `getModuleForContributedBlock` → `isBlockTypeEnabled`; overlay locks on admin builder |
| `themeTokens` (as contribution) | **Not-in-contract** | Rejected by `validatePackageManifest`. Theme tokens live in SiteTheme / `theme-tokens.json` artifact, not under `contributions`. |
| `publicRoutePrefixes` | **Removed (Phase 4)** | Rejected if present. Public/API gating uses `ModuleManifest.publicRoutes` → `MODULE_ROUTE_REGISTRY` only. |
| `dashboardSections` | **Removed (Phase 4)** | Rejected if present. Dashboard uses `label` + `adminRoutePrefixes[0]`. |

Unknown contribution keys (including removed keys) are rejected at validation time.

## 2. Built-in Module contributions

Built-ins declare contributions implicitly through ModuleManifest fields, projected by `packageManifestFromModule`:

| ModuleManifest field | Package contribution |
|----------------------|----------------------|
| `navItemIds` | `adminNavItemIds` |
| `adminRoutes` | `adminRoutePrefixes` |
| `contributedBlockTypes` | `blockTypes` |
| `publicRoutes` | **Not** a package contribution — route registry only |
| `label` | Package `label` (dashboard card title; not a contribution key) |

## 3. Extension overlays (M7.1)

| Topic | Behavior |
|-------|----------|
| ZIP | `kind: extension`, `azura-package.json` only |
| Import | Inert — does not hide features until activated/closed per product rules |
| Open (`active`) | Overlay armed open |
| Close (`inactive`) | Hides/locks listed **admin** nav and builder block ids owned by shipped Modules |
| Remove | Unarms; Module-only gating remains |
| Public pages | Saved blocks keep rendering; overlay is not a public kill switch |

Helpers: `extension-package.ts`, `overlay-resolve.ts`, `contributions.ts`.

## 4. Theme token packages (M7 / M7.2 / M7.3)

| Topic | Behavior |
|-------|----------|
| ZIP | `kind: theme` + `theme-tokens.json` (+ optional logo/favicon/fonts) |
| Validation | Strict schemas; SVG external refs rejected; customCss reject-only policy for **package** CSS |
| Activate | Applies to **published** SiteTheme; refuses dirty draft |
| Deactivate | Clears applied-source provenance; appearance remains until Studio/other source changes it |
| Assets | Materialized as CMS media; export does not re-ship binaries |

Important boundary: Theme Studio save paths may still differ in sanitization from package-applied CSS — package path is the policy-guaranteed one.

## 5. Dashboard package sections

`listActivePackageSections` iterates **built-in Module manifests only**. Imported/pending packages never appear as dashboard cards through this path.

## 6. What is still not a contribution

- New App Router pages or API handlers from ZIP
- New React admin screens loaded from package code
- Arbitrary server jobs registered from ZIP (jobs are **Module-owned** under Option A — see Phase 4 matrix)
- Capability registration at runtime
- ACL / permission grants from package ZIP (Phase 3 ACL keys ship in repo manifests)
- Generic Module event / plugin bus (**deferred** / **R3-gated** — [plans/r3-follow-on-decision-gates.md](./plans/r3-follow-on-decision-gates.md); Module-private buses OK)

Those require Option A (code in repo + profile + deploy) or a future platform bet outside Option C.
