# Modules Manager Upgrade — Phase M7.3 (Rich theme fields)

> **Status:** Complete — M7.3 done → **M8** done  
> **Prerequisite:** [modules-manager-m7.2-theme-assets-phase.md](./modules-manager-m7.2-theme-assets-phase.md) exit  
> **Parent:** [application-platform-upgrade-plan.md](./application-platform-upgrade-plan.md) §7 M7 / M7.3  
> **Handoff:** **M8** complete — [modules-manager-m8-boundary-evidence-phase.md](./modules-manager-m8-boundary-evidence-phase.md); next **M9**  


> **Cursor plan:** `.cursor/plans/m7.3_rich_theme_fields_2e39c711.plan.md`  
> **CI:** `test:theme-rich-fields` under bare `tsx` (strict schemas + postcss CSS policy)

## Goal

Unlock deferred rich SiteTheme keys on theme packages (`customCss`, brand/header/footer, effects, mobile browser). Reject-only `customCss` policy via postcss + detection-only escape decode. Whole-object JSON replace. Package-applied CSS only is policy-guaranteed — Theme Studio save stays unsanitized.

## Locks

| Topic | Choice |
|-------|--------|
| Parser | `postcss` direct dep; detection-only escape decode; stored CSS never rewritten |
| Nested JSON | Package-strict Zod (no Studio defaults); anti-drift key pins |
| brandConfig | Complete BrandingState; image URL policy; no fill-of-missing |
| Merge | Whole-object replace; pinned clears; provenance re-stamp every apply |
| Caps | File 256 KiB; customCss 48 KiB decoded UTF-8 |

## Acceptance

See plan. Exit → **M8**.
