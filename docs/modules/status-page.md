# Status Page module (`status-page`)

**Status:** Active (Phase 5 Slice 4)

## Classification

| Layer | Value |
|-------|-------|
| Module ID | `status-page` |
| Package | `src/modules/status-page/` |
| Admin | `/admin/status` (Modules group) |
| Block | `statusDashboard` via `builder/blocks/portal/` |
| Public API | `/api/status-boards/[slug]` |

## Availability

| Layer | Behavior |
|-------|----------|
| Profile | Must list `status-page` in `modules` (no required presets/capabilities today) |
| Runtime | Modules Manager toggle → `SiteFeature` + package status; deactivate retains data; public API soft-fails empty/404 when inactive |
| Omitted | `/admin/status`, `/status`, and `/api/status-boards` disabled via compiled prefixes |

## Notes

Status is a **Module** — subscriber UX and incident workflow beyond a single entity card template.

Resolver: `resolveStatusBoardForBlock`.
