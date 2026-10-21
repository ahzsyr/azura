# Apple Design backlog

Findings noticed during Phase B gates that are out of scope for the active gate. Do not fix here — pick up in a later gate or dedicated pass.

## Noticed during Gate 1

- `src/capabilities/search/components/search-page-view.tsx` (~508): search input uses bare `outline-none` without a `focus-visible` ring (same pattern as Gate 1 finding 5, which only named `global-search-panel.tsx`).
- `src/features/navigation/components/header/header-builder.css` `.mnav-actions .icon-btn[data-preview-action-type="search"]`: still `42px` square — adjacent to the 44px mobile search control but not in the approved hit-target list.
- Mega-menu keyboard traversal / focus trap behavior not verified (needs browser); do not refactor in Gate 2 unless a named finding requires it.
- Bottom-nav label density: ~55px cell with 11px type — four items across 320px may still clip; needs browser check (Gate 1 carry-forward).

## Noticed during Gate 2

- `src/components/layout/locale-switcher.tsx`: soft `useRouter().replace` for locale switch was evaluated and rejected (cookie + server-rendered next-intl). Revisit only if locale can be negotiated without a document navigation.

## Noticed during Gate 3

- **Card style storage rename (migration):** `data-card-style` values `liquid-glass` / `glassmorphism` still stored; Theme Studio labels rewritten to "Soft surface (opaque)" / "Lifted surface (opaque)" so the UI matches reality. A proper rename needs a data migration for user presets (`agency`/`saas` map to glassmorphism) — do not flip the stored value without migration.
- A1 browser check still open: Reduce Motion on, resize across 968px with menu closed — panel must appear without entrance animation.
- Residual partner hex kept intentionally: Trustpilot `#00b67a` (`.prd-trust*`), WhatsApp `#25d366`, overlay `#fff`/`#000` on media chrome, star `#ffc107`.

## Noticed during Gate 4 (Commit 1)

- **Indonesian copy completion** — nine English-held keys from the approved Commit 1 set still need a translator with context (do not overwrite native `id` strings elsewhere). Enumerated:
  - `contact.success` — `messages/id.json:148`
  - `contact.error` — `messages/id.json:149`
  - `common.loading` — `messages/id.json:322`
  - `common.backToHome` — `messages/id.json:329`
  - `common.pageNotFoundBody` — `messages/id.json:333`
  - `locale.selectLanguageHint` — `messages/id.json:350`
  - `compare.drawerEmpty` — `messages/id.json:360`
  - `compare.empty` — `messages/id.json:361`
  - `product.stock.tipLabel` — `messages/id.json:435`
- **Arabic copy review** — `locale.selectLanguageHint` (`messages/ar.json:350`, native) and the other Commit 1 meaning-preserving edits need a native reviewer. Do not route translation through English copy fixes.
- **Storefront i18n debt (not polish)** — of ~28 storefront strings flagged in the Gate 4 copy audit, Commit 1 fixed 9 in `messages/en.json`. The rest live outside `messages/` (`search-copy.ts`, `load-pdp-labels.ts`, listing labels, component aria literals) and need a dedicated i18n pass, not absorption into “Gate 4 complete.”
