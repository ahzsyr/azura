# Documentation module (`documentation`)

**Status:** Active (Phase 5 Slice 4)

## Classification

| Layer | Value |
|-------|-------|
| Module ID | `documentation` |
| Package | `src/modules/documentation/` |
| Admin | `/admin/documentation` (Modules group) |
| Block | `documentationNav` via `builder/blocks/portal/` |

## Availability

| Layer | Behavior |
|-------|----------|
| Profile | Must list `documentation` in `modules` (requires preset `knowledge` and capabilities search, versioning, workflow at generate time) |
| Runtime | Modules Manager toggle → `SiteFeature` + package status; deactivate retains pages/entities/block JSON |
| Omitted | `/admin/documentation` and `/docs` disabled via compiled prefixes |

## Notes

Documentation is a **Module** (Preset Creep rule) — portal-scale navigation, not a thin entity preset.

Resolver: `resolveDocumentationForBlock`.
