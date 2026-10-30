# Modules Manager — Track close (Option A + C implementation)

> **Status:** Complete — **implementation track closed**  
> **Parent:** [application-platform-upgrade-plan.md](./application-platform-upgrade-plan.md) §14  
> **Register:** [../phases/09-release-roadmap.md](../phases/09-release-roadmap.md) / [modules-manager-doc-hygiene-phase.md](./modules-manager-doc-hygiene-phase.md)  
> **Non-goals:** No M9 RFC; no Node install; no twin measure; no new gates; no register reopen

## Scope boundary

This closes **in-repo Option A + C Modules Manager implementation**. It does **not** mean all evidence or deferred catalogue work is done.

| Layer | Status |
|-------|--------|
| **Implementation track** | **Closed** — ship bar below |
| **M8.2 twin baseline** | **Not complete** — phase report finished with **blocked-on-install** exit; baseline pending ([m8.2](./modules-manager-m8.2-twin-measure-baseline-phase.md)) |

Parent §14 no longer treats “operator Node → M8.2 Complete” as in-track Next. That path is **out-of-band**.

## Ship bar (track closed = implemented + gated, not measured)

1. **DG1–DG5** locked (hygiene / Phase 9).
2. **Hygiene register** closed or partly-closed as recorded (YAML full-byte residual = deferred, not an open decision).
3. **Ship paths wired:** Hostinger profile ensure (M2.1), module-set expectations (M2.2), non-profile generators (M2.3), inventory snapshot CI, `profiles:verify`.
4. **Operator honesty:** M5 / M7.x UX; Marketing ingress + DG2; Startup S1 acceptance met.
5. **Boundary instrument present** (measure script + inventory) under **DG7 docs-only**. Twin **baseline evidence** is out-of-band — M8.2 blocked-on-install is **not** a ship-bar failure.

Deactivate / ingress ship on **implemented gates + tests**, not on finished M8.2 marker deltas.

## Milestones (implementation)

| Milestone | Note |
|-----------|------|
| Startup → M8 / M2.1–M2.3 / hygiene | Complete (implementation) |
| M8.2 | Phase **report** complete with blocked-on-install exit; **twin baseline not complete** |
| M9 | Deferred (separate RFC) |
| Track close | This doc |

## S1 holes at close

| # | Status |
|---|--------|
| 1 | Closed — DG2 `/a` inject |
| 2 | Closed for track — matrix row + `decideMarketingIngress` `env_disabled` test; optional per-surface cells = out-of-band polish |
| 3 | Closed — stronger-bar allows Core `SiteFeature` / `PackageInstallation` seed writes from `loadSiteFeatureMap` |
| 4 | Closed — `test:marketing-ingress` in `ci` |
| 5 | Closed — `ingress-guard-order.test.ts` in `test:marketing-ingress` |
| 6 | Closed — `ensureSelectedDeploymentProfile` unknown-profile hard-fail (M2.1) |
| 7 | Out of scope unless regression |

## Out-of-band follow-ons (not status-register rows)

- Operator Homebrew/nvm Node → M8.2 **finished** twin baseline (`conclusive` or finished `inconclusive`)
- M9 catalogue RFC
- YAML full-byte tripwire (M2.2 residual)
- Exclusion CI gate (DG7 docs-only today)
- Optional S1 env-disabled per-surface matrix cell tests
- Former Phase 9 P1–P3 themes (operator scrub / contribution-drift CI / marketplace) — backlog only

## Non-goals (restated)

No runtime plugin host; no executable ZIP; no marketplace in this upgrade plan; no capability SiteFeature toggles.
