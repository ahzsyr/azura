# Source map — canonical paths

## Contracts and registry

| Path | Role |
|------|------|
| `src/modules/module-manifest.ts` | `ModuleManifest`, `PackageKind` |
| `src/modules/documentation/manifest.ts` | Documentation ModuleManifest |
| `src/modules/status-page/manifest.ts` | Status Page ModuleManifest |
| `src/modules/marketing/manifest.ts` | Marketing ModuleManifest |
| `src/modules/advanced-seo/manifest.ts` | Advanced SEO ModuleManifest |
| `src/config/deployment-profile/route-registry.ts` | `MODULE_MANIFESTS`, `MODULE_ROUTE_REGISTRY`, presets |
| `src/platform/packages/manifest.ts` | `PackageManifest`, validation, projection |
| `src/platform/packages/contribution-inventory.ts` | Contribution inventory + pure resolvers |

## Profile and availability

| Path | Role |
|------|------|
| `docs/profiles/*.yaml` | Profile sources |
| `scripts/build/generate-deployment-profile.mjs` | Compile + `MODULE_EXTRA_DISABLED_PUBLIC` |
| `scripts/deploy/prebuild.mjs` | Deploy-time generate |
| `src/generated/deployment-profile.json` | Compiled ceiling |
| `src/config/deployment-profile/load-profile.ts` | Profile helpers |
| `src/config/deployment-profile/site-features.ts` | SiteFeature load/seed/update, ingress access |
| `src/config/deployment-profile/assert-route-enabled.ts` | Route assert helpers |
| `src/config/deployment-profile/types.ts` | Compiled profile types |
| `docs/deployment-profiles.md` | Living profile doc |

## Installer and packages

| Path | Role |
|------|------|
| `src/platform/packages/installer.ts` | Lifecycle operations |
| `src/platform/packages/lifecycle.ts` | Pure status/dependency helpers |
| `src/platform/packages/site-feature-changes.ts` | Toggle expansion |
| `src/platform/packages/actions.ts` | Server actions (ZIP/update/uninstall) |
| `src/platform/packages/seed.ts` | Builtin package seed |
| `src/platform/packages/package-migrations.ts` | Allowlisted SQL apply |
| `src/platform/packages/zip-store.ts` | ZIP read/write + allowlist |
| `src/platform/packages/contributions.ts` | Runtime contribution consumers |
| `src/platform/packages/extension-package.ts` | Extension import/activate decisions |
| `src/platform/packages/overlay-resolve.ts` | Overlay nav/block resolve |
| `src/platform/packages/theme-*.ts` | Theme token/asset/apply pipeline |
| `src/platform/packages/installation-envelope.ts` | Manifest envelope for artifacts |
| `src/platform/packages/active-package-sections.tsx` | Dashboard section UI |
| `src/platform/packages/package-ui-copy.ts` | Operator-facing copy |
| `scripts/platform/measure-profile-boundary.mjs` | Phase 6 matched-twin measure |
| `scripts/platform/preflight-measure-toolchain.mjs` | Durable Node / SWC E0 preflight |
| `scripts/platform/profile-gating-evidence.mjs` | profileGating evidence pack |
| `src/modules/*/boundary-marker.ts` | Intentional `AZURA_MODULE_BOUNDARY:<id>` markers |

## Modules Manager UI

| Path | Role |
|------|------|
| `src/app/admin/(dashboard)/modules/page.tsx` | Server page |
| `src/app/admin/(dashboard)/modules/module-screen.tsx` | Client UI |
| `src/modules/module-screen.ts` | `listModulesForAdmin` (deps/compat/migration overlays) |
| `src/modules/module-screen-types.ts` | Screen model types |
| `src/modules/module-screen-ui.ts` | Control availability / overlay badges / labels |
| `src/modules/module-screen-actions.ts` | Toggle + module preflight server actions |
| `src/platform/packages/package-preflight.ts` | Dry-run package ops (server) |
| `src/platform/packages/package-preflight-core.ts` | Pure preflight evaluation |
| `src/platform/packages/package-lifecycle-audit.ts` | SecurityAuditLog for lifecycle ops |
| `src/config/admin-nav.ts` | Admin nav (includes Modules) |

## Module packages

| Path | Role |
|------|------|
| `src/modules/documentation/**` | Documentation Module |
| `src/modules/status-page/**` | Status Page Module |
| `src/modules/marketing/**` | Marketing Module |
| `src/modules/advanced-seo/**` | Advanced SEO guards/manifest |

## Schema

| Path | Role |
|------|------|
| `prisma/schema/mysql/platform.prisma` | `SiteFeature`, `PackageInstallation`, `PackageMigration` |

## Tests (representative)

| Path | Role |
|------|------|
| `src/platform/packages/__tests__/package-lifecycle.test.ts` | Lifecycle sync |
| `src/platform/packages/__tests__/package-contract.test.ts` | Manifest contract |
| `src/platform/packages/__tests__/contribution-inventory.test.ts` | Contributions |
| `src/platform/packages/__tests__/contribution-overlays.test.ts` | Overlays |
| `src/platform/packages/__tests__/theme-*.test.ts` | Theme packages |
| `src/modules/marketing/__tests__/**` | Marketing ingress / core |
| `src/modules/advanced-seo/__tests__/**` | Advanced SEO guards / prune |
| `src/modules/__tests__/module-screen-ui.test.ts` | Modules UI helpers |

## Prior planning / audits

| Path | Role |
|------|------|
| `docs/azura-v2/README.md` | Index of prior phase work |
| `docs/azura-v2/audits/*.md` | Existing system audits |
| `docs/azura-v2/plans/modules-manager.md` | Operator reference (parallel) |
| `docs/azura-v2/plans/application-platform-upgrade-plan.md` | Upgrade roadmap |
