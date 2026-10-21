# Apple Design backlog

Findings noticed during Phase B gates that are out of scope for the active gate. Do not fix here — pick up in a later gate or dedicated pass.

## Noticed during Gate 1

- `src/capabilities/search/components/search-page-view.tsx` (~508): search input uses bare `outline-none` without a `focus-visible` ring (same pattern as Gate 1 finding 5, which only named `global-search-panel.tsx`).
- `src/features/navigation/components/header/header-builder.css` `.mnav-actions .icon-btn[data-preview-action-type="search"]`: still `42px` square — adjacent to the 44px mobile search control but not in the approved hit-target list.
- Mega-menu keyboard traversal / focus trap behavior not verified (needs browser); do not refactor in Gate 2 unless a named finding requires it.
