# Capability gap matrix — expected vs current

Maps the ten expected capabilities from [00-project-objective.md](./00-project-objective.md) to the **current** Modules system.

Legend: **Done** · **Partial** · **Missing** · **Out of scope (Option B)**

## Matrix

| # | Expected capability | Status | What exists today | Main gaps |
|---|---------------------|--------|-------------------|-----------|
| 1 | Application management | **Partial** | Activate/deactivate, ZIP import/export, update/uninstall/remove; Phase 5–8 operator/support surface (preflight, matrix, diagnostics) | Marketplace explicitly deferred (Phase 8); “install” ≠ hot-plug; purge still deferred |
| 2 | Modular architecture | **Partial** | Four built-in Modules; Phase 7 Advanced SEO ownership RFC approved (logical); catalog/translation/booking not-now | Physical relocate of Advanced SEO impl trees still deferred; not every product area is a Module |
| 3 | Project-wide integration | **Partial** | Phase 4 matrix + Phase 7 bridge timeline documented; SI mutations fail-closed via Advanced guards | Generic event bus deferred; Advanced SEO physical ownership move still follow-on |
| 4 | Extension support | **Partial** | Extension overlay ZIPs (nav/block locks); theme token packages | No executable extensions; cannot introduce new routes/UI without Option A deploy |
| 5 | Lifecycle management | **Partial** | install/activate/deactivate/update/uninstall/remove; Phase 5 preflight + audit; Phase 8 Manual channel + rollback Classes A–D documented | Class D (universal downgrade) unsupported by design; no remote update feed; purge deferred |
| 6 | Dependency management | **Partial** | Activate graph + dependents; Phase 5 overlays; Phase 8 profile×Module matrix inventory | No conflict solver UI; capabilities not activate-enforced; limited install-order planner beyond asserts |
| 7 | Configuration and permissions | **Partial** | Phase 3 ACL + settings registry; Phase 5: all four Modules expose Manager `settingsHref` (Advanced SEO path-only) | Full Marketing dual-store migration still deferred |
| 8 | Data integrity | **Done** (for deactivate/soft uninstall) | Deactivate retains data; Phase 8 retention/export matrix; purge labeled unavailable; builtins refuse Remove | Purge product still deferred; destructive path exists only for non-builtins |
| 9 | Security | **Partial** | ZIP allowlist, validation, system-section gates, fail-closed ingress; Phase 8 same-trust-zone vs external signing **stance** | Signing **implementation** / marketplace still deferred; Theme Studio path may differ; Edge cannot see SiteFeature |
| 10 | Backward compatibility | **Partial** | Existing routes/workflows preserved; Option A; Phase 6 dual-lane evidence; Phase 8 support-claims checklist | **Profile-gating lane green** ([inventories/profile-gating-evidence.json](./inventories/profile-gating-evidence.json)); **bundle lane Complete / inconclusive** ([inventories/profile-boundary-summary.json](./inventories/profile-boundary-summary.json), R1). Gating ≠ bundle exclusion; exclusion CI gate remains docs-only. Operators must learn “pending ≠ installed code” and “middleware 404 ≠ bundle exclusion” |

## WordPress analogy — honest translation

| WordPress | AZURA today |
|-----------|-------------|
| Upload plugin ZIP → code runs | Upload ZIP → metadata/SQL/tokens/overlay only |
| Activate plugin | Activate included Module / open overlay / apply theme tokens |
| Deactivate plugin | SiteFeature off / status inactive (data kept) |
| Delete plugin files | Omit from profile + redeploy (builtins); ledger remove for pending only |
| theme.json / customizer | Theme token packages → SiteTheme |
| Must-use / network plugins | Deployment Profile ceiling |

## Recommended evolution posture

1. Keep Option A + C as the security boundary.
2. Deepen integration interfaces (contributions that are still declared-only, shared config/permissions model) **without** inventing Option B.
3. Convert additional Core features into Modules only when manifests, guards, profile entries, and admin UX are complete — **and** only after an R3/Fitness gate for deferred candidates (catalog/translation/booking, Advanced SEO physical relocate, etc.). See [plans/r3-follow-on-decision-gates.md](./plans/r3-follow-on-decision-gates.md).
4. Keep operator docs and UI copy honest — this folder’s job. Deferred rows (marketplace, purge, Class D rollback, generic event bus) are **R3-gated**, not implied next implementation phases.

Related historical plan: [`docs/azura-v2/plans/application-platform-upgrade-plan.md`](../azura-v2/plans/application-platform-upgrade-plan.md).
