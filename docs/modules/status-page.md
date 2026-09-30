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

## Notes

Status is a **Module** — subscriber UX and incident workflow beyond a single entity card template.

Resolver: `resolveStatusBoardForBlock`.
