# Module: Status Page (`status-page`)

## Classification

| Field | Value |
|-------|-------|
| Module ID | `status-page` |
| Package kind | `app` |
| Source | `src/modules/status-page/` |
| Manifest | `src/modules/status-page/manifest.ts` |
| Label | Status Page |
| Version | `1.0.0` |
| Compatibility | `>=0.1.0` |

## Manifest summary

| Field | Value |
|-------|-------|
| `requiredPackages` | `[]` |
| `requiredPresets` | `[]` |
| `requiredCapabilities` | `[]` |
| `adminRoutes` | `/admin/status` |
| `publicRoutes` | `/status`, `/api/status-boards` |
| `navItemIds` | `status-page` |
| `contributedBlockTypes` | `statusDashboard` |
| `permissions` (ACL keys) | `status-page.read`, `status-page.manage` |

## Why it is a Module

Status boards involve subscriber-facing UX and incident workflow beyond a single entity card template.

## Availability

| Layer | Behavior |
|-------|----------|
| Profile | Must list `status-page` in `modules` |
| Runtime active | Admin `/admin/status`, public `/status`, API `/api/status-boards` |
| Runtime inactive | Nav/admin gated; public API soft-fails empty/404 when inactive; **data retained** |
| Profile omitted | `/admin/status`, `/status`, `/api/status-boards` disabled via compiled prefixes |

## Key code

| Concern | Path |
|---------|------|
| Actions | `src/modules/status-page/actions.ts` |
| Service | `src/modules/status-page/service.ts` |
| Admin UI | `src/modules/status-page/admin/*` |
| Block resolve | `src/modules/status-page/resolve-status-board-for-block.ts` |
| Profile helper | `src/modules/status-page/module-profile.ts` |

## Integration notes

- No required presets/capabilities today — profile list membership is the ceiling.
- Builder block `statusDashboard` is Module-owned.
- API prefix is declared on `publicRoutes` (split into `apiPrefixes` by the route registry).

## Operator notes

1. Include `status-page` in the Deployment Profile and redeploy.
2. Enable under Admin → Modules.
3. Create boards under Admin → Status.
4. Disable to take the public status product offline without deleting board records.
