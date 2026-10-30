# Vocabulary and contracts

## 1. Operator language vs repository terms

| Operator / product language | Repository term | Notes |
|----------------------------|-----------------|-------|
| Application / App | Module (`packageKind: "app"`) | Admin group remains **Modules** |
| Plugin / Extension | `kind: "extension"` | Declarative overlays today; no hot-loaded code |
| Theme | `kind: "theme"` | Tokens/assets applied to SiteTheme |
| Install (WordPress sense) | Profile include + deploy + installer | ZIP alone ≠ executable install |
| Activate / Deactivate | SiteFeature + PackageInstallation | Data retained on deactivate |
| Soft Uninstall | Deactivate + keep ledger (builtin) or delete ledger (pending) | See lifecycle doc |
| Remove (destructive) | `uninstallPackage(..., destructive: true)` | Refused for every builtin |
| Pending | `PackageInstallation.status = pending` | Awaiting code + registry in a future build |
| Profile-omitted | Not in compiled `modules[]` | Cannot be enabled at runtime |
| Runtime-inactive | Included but SiteFeature disabled / status inactive | Node ingress should deny mutations |

## 2. ModuleManifest

Canonical type: `src/modules/module-manifest.ts`.

Each built-in Module exports a manifest from `src/modules/<id>/manifest.ts`. All are collected into `MODULE_MANIFESTS` in `src/config/deployment-profile/route-registry.ts`.

| Field | Type | Role |
|-------|------|------|
| `id` | slug | Stable Module id (`documentation`, `marketing`, …) |
| `version` | semver | Package version for ledger / update |
| `packageKind` | `app` \| `extension` \| `theme` | Built-ins are `app` |
| `azuraCompatibility` | `*` or `>=x.y.z` | Core compatibility gate on ZIP import |
| `requiredPackages` | string[] | Activate graph: must be `active`; disable blocked by enabled dependents |
| `requiredCapabilities` | string[] | Profile generate ceiling; display-only on Modules screen |
| `requiredPresets` | string[] | Auto-enabled with Module; turning off can cascade Module off |
| `adminRoutes` | path prefixes | Profile disabled-admin list when omitted |
| `publicRoutes` | path prefixes | Public **and** `/api/…` prefixes (split in route registry) |
| `navItemIds` | string[] | Admin nav contribution ids |
| `contributedBlockTypes` | BlockType[] | Builder block ownership |
| `permissions` | string[] | Registered ACL keys `{id}.read` / `{id}.manage` (Phase 3); enforced via `requireModulePermission` — see [phase-3-settings-and-permissions.md](./plans/phase-3-settings-and-permissions.md) |
| `label` | optional string | Human label (defaults to id) |

### Derived registries

From the same manifests:

```text
MODULE_ROUTE_REGISTRY[id] = {
  adminPrefixes: adminRoutes,
  publicPrefixes: publicRoutes without /api/,
  apiPrefixes: publicRoutes starting with /api/,
}
```

`getModuleForContributedBlock(blockType)` finds the owning Module id for builder gating.

## 3. PackageManifest

Canonical type: `src/platform/packages/manifest.ts`.

Stored in ZIP as `azura-package.json` and on `PackageInstallation.manifest` (possibly wrapped in an installation envelope for theme/extension artifacts).

| Field | Role |
|-------|------|
| `id`, `version`, `kind` | Identity |
| `azuraCompatibility` | Must be `*` or `>=major.minor.patch` |
| `requiredPackages` | Installer activation graph |
| `requiredPresets` | SiteFeature cascade |
| `requiredCapabilities` | Display / profile ceiling (not activate-enforced) |
| `permissions` | Registered `{id}.read` / `{id}.manage` ACL keys (Phase 3) |
| `label` | UI label |
| `contributions` | See [07-contributions-extensions-themes.md](./07-contributions-extensions-themes.md) |

`packageManifestFromModule(moduleManifest)` projects a ModuleManifest into PackageManifest form for the installer seed path. Public/API routes stay on `ModuleManifest` / `MODULE_ROUTE_REGISTRY` — they are **not** package contributions (Phase 4).

### Validation (`validatePackageManifest`)

- Rejects unknown `contributions.*` keys (including historical `themeTokens`, `publicRoutePrefixes`, `dashboardSections`).
- Operational contribution keys only: `adminNavItemIds`, `adminRoutePrefixes`, `blockTypes`.
- Enforces slug ids, semver version, kind enum, path prefixes starting with `/`.

## 4. PackageStatus

```ts
type PackageStatus = "installed" | "active" | "inactive" | "pending";
```

| Status | Meaning |
|--------|---------|
| `installed` | Row exists; migrations may have run; not necessarily serving |
| `active` | Serving / armed (Module SiteFeature on; theme applied; extension overlay open) |
| `inactive` | Installed but off (Module SiteFeature off; theme “source” cleared; overlay closed) |
| `pending` | ZIP accepted; executable Module code not in this build / registry |

SiteFeature module enablement maps to `active` ↔ enabled and `inactive` ↔ disabled. Pending rows are never rewritten by that sync.

## 5. SiteFeatureKind

```ts
type SiteFeatureKind = "module" | "preset";
```

Composite primary key: `(kind, featureId)`. Capabilities are **not** SiteFeature rows — they stay profile-only.

## 6. Core version constant

`AZURA_CORE_VERSION` in `src/platform/packages/manifest.ts` (currently `0.1.0`) is used with `azuraCompatibility` during ZIP import.
