# Modules Manager Upgrade — Phase M7 (Theme token packages)

> **Status:** Complete — M7 first slice done → execute **M7.1**  
> **Prerequisite:** [modules-manager-m6-advanced-seo-phase.md](./modules-manager-m6-advanced-seo-phase.md) exit  
> **Parent:** [application-platform-upgrade-plan.md](./application-platform-upgrade-plan.md) §7 M7 / U7  
> **Handoff:** **M7.1 done** → **M7.2** approved assets  
> **Cursor plan:** `.cursor/plans/m7_theme_tokens_20b960c2.plan.md`  
> **CI:** `test:theme-packages` under bare `tsx --test` (injected orchestrator; no Prisma stubs)

## Goal

Ship Option C **token-only theme packages**: ZIP sibling `theme-tokens.json` → format-1 ledger envelope → activate merges onto **published** `SiteTheme` without rebuild. Preserve M4 (`contributions.themeTokens` rejected). No React/App Router/SQL from theme ZIPs.

## Standing harness note

`"ci"` uses bare `tsx --test`. Compensation / dirty-draft refusal are proven with a **pure injected orchestrator**. Source-order pins prove wiring only. Do not adopt `register.mjs` Prisma doubles for this phase.

## Locks

| Topic | Choice |
|-------|--------|
| Storage | Format-1 envelope in `PackageInstallation.manifest` |
| Apply | Published row only; never draft write; never `publishFromDraft` |
| Dirty draft | Hash all SiteTheme columns; refuse activate |
| Patch | Flat allowlist only; no `customCss` / brand/header/footer / URLs |
| Theme ZIP | `azura-package.json` + `theme-tokens.json` only (no migrations) |
| Active | Currently applied; demote+promote in one txn |
| `activatePackage` | `kind === "theme"` branch before non-builtin pending throw |
| Export | Re-emit `theme-tokens.json` from artifacts |

## Acceptance

See plan. Exit → **M7.1**.
