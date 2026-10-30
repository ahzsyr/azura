# Modules Manager Upgrade — Phase M7.2 (Approved theme assets)

> **Status:** Complete — M7.2 done → **M7.3 done** → execute **M8**  
> **Prerequisite:** [modules-manager-m7.1-contribution-overlays-phase.md](./modules-manager-m7.1-contribution-overlays-phase.md) exit  
> **Parent:** [application-platform-upgrade-plan.md](./application-platform-upgrade-plan.md) §7 M7 / M7.2  
> **Handoff:** **M7.3** complete — see [modules-manager-m7.3-rich-theme-fields-phase.md](./modules-manager-m7.3-rich-theme-fields-phase.md); next **M8**  
> **Cursor plan:** `.cursor/plans/m7.2_theme_assets_35cf08c3.plan.md`  
> **CI:** `test:theme-assets` under bare `tsx` (pure validators + injectable materialize orchestrator)

## Goal

Theme ZIPs may ship approved logo/favicon/font binaries → CMS `MediaAsset` on import. Activate resolves `package:` refs onto published `SiteTheme` (`logoUrl` / `faviconUrl` / schema-backed `typography.fontFaces`). Rich SiteTheme keys stay forbidden.

## Locks

| Topic | Choice |
|-------|--------|
| Scope | A+1 assets only; `FORBIDDEN_TOP` untouched for rich fields |
| Storage | CMS MediaAsset; fonts = `DOCUMENT` (no `MediaType.FONT`) |
| Schema | `typographySchema.fontFaces` so Zod cannot strip |
| Resolve | `package:` refs at **activate**, not import |
| ZIP | Two-pass limits before any upload |
| Export | Tokens + manifest only (no binary re-emit) |
| Prior assets | GC only after successful activate of new envelope |
| Cleanup debt | `deleteStoredAsset` false → log/count; no reconciler |

## Acceptance

See plan. Exit → **M7.3**.
