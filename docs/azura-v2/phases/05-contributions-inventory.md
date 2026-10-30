# Phase 5 — Contribution Inventory (applied)

**Mode:** Implementation (groundwork).

## Objective

Single inventory of allowed contribution keys; reject unknown keys (including themeTokens as package contribution — theme ownership stays SiteTheme / theme studio).

## Focus

- Contribution inventory + manifest validation reject unknown keys  
- No new marketplace; no extension/theme activation host  
- **M7.1:** `kind: extension` overlays gate shipped `adminNavItemIds` / `blockTypes` via ledger (Open/Close); `adminRoutePrefixes` / `dashboardSections` stay empty on extensions this slice  
- **M7.2:** theme ZIP approved media/fonts → CMS MediaAsset; `themeTokens` still not-in-contract under contributions  

**Next:** Phase 6 profile/bundle boundary verification (read-only). M7.3 = rich theme fields.
