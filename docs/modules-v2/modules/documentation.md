# Module: Documentation (`documentation`)

## Classification

| Field | Value |
|-------|-------|
| Module ID | `documentation` |
| Package kind | `app` |
| Source | `src/modules/documentation/` |
| Manifest | `src/modules/documentation/manifest.ts` |
| Label | Documentation |
| Version | `1.0.0` |
| Compatibility | `>=0.1.0` |

## Manifest summary

| Field | Value |
|-------|-------|
| `requiredPackages` | `[]` |
| `requiredPresets` | `knowledge` |
| `requiredCapabilities` | `search`, `versioning`, `workflow` |
| `adminRoutes` | `/admin/documentation` |
| `publicRoutes` | `/docs` |
| `navItemIds` | `documentation` |
| `contributedBlockTypes` | `documentationNav` |
| `permissions` (labels) | `documentation.read`, `documentation.manage` |

## Why it is a Module

Documentation is portal-scale navigation and publishing — beyond a thin entity preset. Preset `knowledge` supplies related Core content surfaces; the Module owns the documentation portal product.

## Availability

| Layer | Behavior |
|-------|----------|
| Profile | Must list `documentation` in `modules` (generate also needs preset `knowledge` and the listed capabilities) |
| Runtime active | Admin `/admin/documentation`, public `/docs`, block `documentationNav` available |
| Runtime inactive | SiteFeature off; nav hidden; admin layout/actions should refuse; block unavailable; **data retained** |
| Profile omitted | `/admin/documentation` and `/docs` on disabled prefix lists → middleware 404 |

## Key code

| Concern | Path |
|---------|------|
| Actions | `src/modules/documentation/actions.ts` |
| Service | `src/modules/documentation/service.ts` |
| Admin UI | `src/modules/documentation/admin/*` |
| Block resolve | `src/modules/documentation/resolve-documentation-for-block.ts` |
| Profile helper | `src/modules/documentation/module-profile.ts` |
| Public/admin App Router | under `src/app` matching `/docs` and `/admin/documentation` |

## Integration notes

- Enabling Documentation via Modules Manager also keeps/enables required preset `knowledge` through the SiteFeature cascade.
- Turning `knowledge` off while Documentation is on is rejected by SiteFeature asserts.
- Builder block `documentationNav` is owned by this Module via `getModuleForContributedBlock`.

## Operator notes

1. Confirm profile includes `documentation`, `knowledge`, and capabilities search/versioning/workflow.
2. Enable under Admin → Modules.
3. Manage portals under Admin → Documentation.
4. Disable to hide product surfaces without deleting portal content.
