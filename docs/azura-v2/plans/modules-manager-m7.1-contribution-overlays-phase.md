# Modules Manager Upgrade — Phase M7.1 (Contribution overlays)

> **Status:** Complete — M7.1 done → execute **M7.2** (approved assets)
> **Prerequisite:** [modules-manager-m7-theme-tokens-phase.md](./modules-manager-m7-theme-tokens-phase.md) exit  
> **Parent:** [application-platform-upgrade-plan.md](./application-platform-upgrade-plan.md) §7 M7 / M7.1  
> **Handoff:** **M7.2 done** → **M7.3** rich fields — see [modules-manager-m7.2-theme-assets-phase.md](./modules-manager-m7.2-theme-assets-phase.md)
> **Cursor plan:** `.cursor/plans/m7.1_contribution_overlays_6ab6020d.plan.md`  
> **CI:** `test:contribution-overlays` under bare `tsx` (pure resolvers; no Prisma stubs)

## Goal

Ledger-driven `kind: extension` overlays that gate **already-shipped** module nav/block ids. Import is inert; **Open overlay** arms open; **Close overlay** arms closed (hides admin nav/picker); **Remove** unarms. Public saved-content render unchanged.

## Locks

| Topic | Choice |
|-------|--------|
| `installed` | One-way (import only); unarm via Remove |
| Controls | Open / Close overlay — not theme “Deactivate” |
| Ids | Must exist on `MODULE_MANIFESTS`; owners in `requiredPackages` + profile-included |
| Blocks | `BlockAvailabilityProfile.overlayLockedBlockTypes` — admin builder only |
| Installer | Three-way: theme / extension / else |
| ZIP | Extension: `azura-package.json` only |

## Acceptance

See plan. Exit → **M7.2**.
