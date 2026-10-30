# Modules Manager Upgrade — Phase M5 (Update / Uninstall / Remove UX)

> **Status:** Complete — M5 done → **M6 done** (see [modules-manager-m6-advanced-seo-phase.md](./modules-manager-m6-advanced-seo-phase.md)); next **M7**  
> **Prerequisite:** [modules-manager-m4-contributions-phase.md](./modules-manager-m4-contributions-phase.md) exit  
> **Parent:** [application-platform-upgrade-plan.md](./application-platform-upgrade-plan.md) §7 M5 / U5 / DG5  
> **Handoff:** **M6** completed → **M7**  
> **Cursor plan:** `.cursor/plans/m5_lifecycle_ux_7ed96cb9.plan.md`  
> **CI:** source-order pins in `test:modules-lifecycle` (no mock/spy).

## Goal

Expose safe Modules Manager journeys for **Update**, soft **Uninstall**, and typed **Remove** without hot-code install. Eligibility is enforced in installer/actions — the UI matrix mirrors server rules, it does not replace them. CI pins are **source-order under `tsx --test`** only.

**Non-goals:** Schema-destroying Purge for builtins; audit tables; register.mjs runtime installer tests; M6 extractions; ZIP executables.

### Decisions locked

| Topic | Choice |
|-------|--------|
| DG5 | Update / Uninstall / **Remove** (parent “purge ≠ uninstall” → soft Uninstall vs typed Remove) |
| Who may Remove | Pending or non-builtin ledger rows only. **Any builtin** → hide + installer refuses `destructive: true` before down SQL |
| Soft Uninstall × included builtin | Deactivate + keep ledger; code stays; data retained; can enable again |
| Remove × pending / unavailable | Typed package id; **ledger-only** today |
| Update | Server: builtin + generated + included + not pending — above `!existing → installPackage` |
| Confirm | Soft Uninstall = Dialog; Remove = type package id; toggles confirm-less |
| Auth | `requireAdminSection("system")` |
| Pins | Source-order only (no mock/spy) |

```text
U0  Phase doc + README
U1  Installer/actions guards (ordering locked)
U2  Control matrix
U3  Modules UI
U4  Source-order pins + CI
U5  Docs + mark complete → M6
```

## Manual smoke (not CI)

On `/admin/modules` with system admin: Update an included builtin; soft-Uninstall confirm copy; Remove a pending row with typed id; wrong phrase rejected.

## Acceptance

- Update refused when omitted / ungenerated / pending (asserts above `!existing`)
- Soft Uninstall: included builtin = deactivate-only
- Remove refused for all builtins before down; pending/unavailable with typed id; ledger-only copy
- Source-order pins in `test:modules-lifecycle` green
- M3 forbid-all replaced
