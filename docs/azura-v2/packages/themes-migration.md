# Theme package migration

Status: **M7–M7.3 done** — token theme ZIPs (+ approved logo/favicon/fonts + rich fields with package `customCss` policy) apply to Core `SiteTheme`.

## Move

- Package kind `theme`.
- **Token packaging:** sibling ZIP file `theme-tokens.json` (not `contributions.themeTokens` — M4 freeze).
- **M7.2 assets:** optional `assets/logo.*`, `assets/favicon.*`, `fonts/*` → CMS `MediaAsset` (fonts as `DOCUMENT` under Documents). SVG must not reference external URLs.
- Empty contributions this slice; no migrations in theme ZIPs (M5 purge safety).
- Activating a token theme does not deactivate Core, apps, or extensions.
- **Option C:** tokens + approved assets may apply without a rebuild. New React components stay pending until deployed.

## Apply semantics (M7 / M7.2)

- Import: format-1 envelope (manifest + token artifacts + `themeAssets` inventory). `package:` refs stay unresolved. Appearance inert until activate.
- Two-pass ZIP limits before any upload; materialize uses injectable cleanup on failure.
- Activate resolves `package:` → MediaAsset URLs, merges onto **published** only (incl. schema-backed `typography.fontFaces` + escaped `@font-face`). Dirty draft → refuse.
- Re-import keeps prior media until a successful activate GCs them.
- Soft deactivate: ledger only; live look + media stay. Remove does not delete MediaAssets.
- Export: manifest + `theme-tokens.json` only (no binary re-emit — re-attach on re-import).
- **M7.3 rich fields:** strict package schemas (whole-object replace; null → Studio clear fallbacks); `customCss` reject-only via postcss (detection-only escape decode; stored CSS never rewritten). Package-applied CSS only is policy-guaranteed — Studio save is still unsanitized.

## Guards

- Switching themes does not rewrite page block JSON.
- Ledger commit failure after theme write restores the previous published snapshot (injected orchestrator in CI).
- Malformed tokens → import error; missing tokens on a theme → pending (deploy wait).
- `deleteStoredAsset` false on cleanup/GC is logged debt (no full reconciler this slice).
- Hostile/obfuscated package `customCss` (`@import`, remote `url()`, `expression`, `</style`) rejected at parse.
