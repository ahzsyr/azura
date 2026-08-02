# Release preset package (`release`)

**Status:** Physical package only (entity preset deferred)

## Classification

| Layer | Value |
|-------|-------|
| Package | `src/presets/release/` |
| Admin | `/admin/releases` (Catalog group) |
| Entity preset | Not activated — changelog block uses `releaseSetService` directly |

## Contents

- `releaseSetService` — admin CRUD + public reads
- `resolveReleasesForBlock` — changelog block data
- Admin UI under `admin/`

## Deferred

- Entity preset `release` + portal adapter
- ViewModel path for changelog block
