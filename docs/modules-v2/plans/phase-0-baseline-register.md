# Phase 0 — Baseline register

**Status vocabulary:** `shipped` · `present-but-unverified` · `partial` · `not-started` · `blocked`  
**Verified against:** HEAD `af8f0817` + working tree · UTC `2026-10-30T11:53Z`  
**Parent:** [executive-application-platform-implementation-plan.md](./executive-application-platform-implementation-plan.md)  
**Disposition:** [phase-0-working-tree-disposition.md](./phase-0-working-tree-disposition.md)  
**Decisions:** [phase-0-decisions-freeze.md](./phase-0-decisions-freeze.md)  
**Doc authority:** [phase-0-doc-authority-map.md](./phase-0-doc-authority-map.md)

## 1. How to read this register

- Prefer **source** over phase reports when they disagree.
- Prefer latest phase report over older master-plan text when docs disagree.
- A track-close “Complete” row that exists only in the working tree is **present-but-unverified**, not **shipped**.
- No CI green / production deploy evidence was fabricated for this pass.

## 2. Milestone / claim register

| Claim cluster | Doc claim (latest) | Primary source paths | Tests / scripts | Commit / release evidence | Status |
|---------------|--------------------|----------------------|-----------------|---------------------------|--------|
| Marketing Node ingress + fail-closed mutation | Track-close S1 / DG3–DG4 closed | WT: `src/modules/marketing/ingress-decision.ts`, `ingress-guard.ts`, `ingress/**`; modified marketing API routes, `attribution/service.ts` | WT `npm run test:marketing-ingress` | **Not on HEAD**; scripts only in WT `package.json` | **present-but-unverified** |
| Marketing `/a` DG2 profile omit | Startup DG2 / Phase 9 closed | WT: `MODULE_EXTRA_DISABLED_PUBLIC` in `scripts/build/generate-deployment-profile.mjs`; verify in `scripts/profiles/verify-deployment-profile.ts` | Profile verify (WT) | Generator change **modified**, not committed | **present-but-unverified** |
| SiteFeature ↔ `PackageInstallation` sync | Extensibility Phase 2 / M3 | WT: `src/platform/packages/lifecycle.ts`, modified `site-features.ts` | WT `package-lifecycle.test.ts` / `test:modules-lifecycle` | `planPackageStatusSync` **absent on HEAD** | **present-but-unverified** |
| ZIP pending honesty + allowlist | Phase 3 / M5 honesty | WT expanded `installer.ts`, `manifest.ts` `validateZipEntryName`; HEAD has basic `zip-store.ts` | WT contract + `package-ui-copy` tests | Partial primitive on HEAD; honesty UX/tests in WT | **partial** (HEAD basic) / WT extras **present-but-unverified** |
| Manifest validation + contribution inventory | Phase 4–5 / M4 | WT: `contribution-inventory.ts`, hardened `manifest.ts` | WT `test:package-contract` | Inventory **absent on HEAD** | **present-but-unverified** |
| Extension overlays (M7.1) | M7.1 phase report complete | WT: `extension-package.ts`, `overlay-resolve.ts`, contributions consumers | WT `test:contribution-overlays` | Absent on HEAD | **present-but-unverified** |
| Theme token packages (M7–M7.3) | M7.x phase reports complete | WT: `theme-*.ts` under `src/platform/packages/` | WT `test:theme-packages` / assets / rich-fields | Absent on HEAD | **present-but-unverified** |
| Advanced SEO Module gating (M6) | M6 complete | WT: `src/modules/advanced-seo/**` (manifest, guard, ingress-decision, tests); dirty Advanced SEO admin pages | WT `test:advanced-seo` | Entire Module **absent on HEAD** | **present-but-unverified** |
| Profile hard-fail M2.1–M2.3 | M2.1–M2.3 complete; DG1 closed | WT: `ensure-selected-deployment-profile.mjs`, `assert-deployment-profile.mjs`, `run-build-generators.mjs`, prebuild/hostinger wiring | WT deploy `__tests__`, `profiles:verify` | Scripts untracked / deploy modified | **present-but-unverified** |
| Bundle measurement M8 / M8.2 | M8 inconclusive; M8.2 **blocked on install**; DG7 docs-only | WT: `scripts/platform/measure-profile-boundary.mjs`, twin assert, inventories | Measure scripts present; **no finished twin baseline** | Phase report documents blocked-on-install | **blocked** (measurement); instrument **present-but-unverified** |
| Modules Manager Update / Uninstall / Remove (M5) | M5 complete | WT: `actions.ts`, `module-screen*.ts(x)`, installer destructive refuse | WT installer-screen / UI tests | HEAD has simpler activate/deactivate/uninstall; M5 matrix mostly WT | **partial** on HEAD; M5 UX **present-but-unverified** |
| Documentation Module runtime guards | modules-v2 / living docs | `module-profile.ts`, layout `notFound`, actions `assertModuleActive`, service soft-null | No dedicated ingress matrix test suite found | Core patterns exist; WT action tweaks | **partial** |
| Status Page Module runtime guards | modules-v2 / living docs | Same pattern as Documentation | Same | Same | **partial** |
| modules-v2 current-system reference | Written in-repo | `docs/modules-v2/**` | N/A | **Untracked** docs tree | **present-but-unverified** (documentation baseline) |
| azura-v2 audits / M* phase reports | Historical evidence | `docs/azura-v2/**` | N/A | **Untracked** (plus some renames staged) | **present-but-unverified** (historical) |
| Option A + C architecture decision | audits/03 | Decision text in azura-v2 + modules-v2 | N/A | Decision accepted for planning; enforcement code mostly WT | Decision **accepted**; enforcement **present-but-unverified** |
| Marketplace / M9 | Deferred | None as product | N/A | Explicit non-goal | **not-started** (deferred) |
| Capability SiteFeature toggles | Closed — not doing | N/A | N/A | Non-goal | **not-started** (rejected) |
| Option B runtime plugin host | Rejected | N/A | N/A | Non-goal | **not-started** (rejected) |

## 3. Aggregate readout

| Status | Meaning for Phase 1 |
|--------|---------------------|
| **shipped** | **None** of the Option A+C track-close claims meet this bar on `af8f0817` |
| **present-but-unverified** | Dominant state for track-close implementation — treat as the intended baseline after owner disposition |
| **partial** | Documentation/Status Page guards; basic installer/ZIP primitives on HEAD |
| **blocked** | M8.2 twin baseline measurement |
| **not-started** | Marketplace, Option B, capability toggles (intentionally) |

## 4. Phase 1 handoff — gaps only

Do **not** rewrite work that is present-but-unverified. Verify first, then open only remaining holes.

### Verify-first (do not rewrite)

1. **Marketing** — inventory pages/layouts/actions/APIs/jobs/webhooks/OAuth/`/a`/beacons against WT ingress helpers; confirm four-state outcomes (active, runtime-inactive, profile-omitted, ledger-unavailable) and env kill.
2. **Advanced SEO** — inventory Advanced admin pages/APIs/actions against `src/modules/advanced-seo` guards; confirm Basic SEO remains available when Advanced is off/omitted.

### Full surface inventory required

3. **Documentation** — pages, layouts, actions, public `/docs`, block `documentationNav`, APIs if any; distinguish profile-omit vs runtime-inactive; confirm mutation paths use fail-closed where needed (today mostly `assertModuleActive` / fail-open `isModuleActive`).
4. **Status Page** — admin `/admin/status`, public `/status`, `/api/status-boards`, block `statusDashboard`; same four-state matrix.

### Explicit Phase 1 constraints

- Keep Edge/middleware independent of Prisma `SiteFeature` (decisions freeze).
- Exceptional Marketing `/a` binding must remain in the matrix (profile omit via `MODULE_EXTRA_DISABLED_PUBLIC`; runtime-inactive via Node ingress).
- Deactivation must preserve Module-owned data.
- First **implementation** slice after Phase 0 exit = **one** agreed gap from the matrix with acceptance criteria and rollback (executive §7) — not a four-Module rewrite.

### Suggested first implementation slice (after verify)

Pending verify-first results. Likely candidates if gaps remain:

- Documentation or Status Page mutation/API paths still relying only on fail-open availability without fail-closed ingress where mutations occur; or
- Any Marketing/Advanced SEO surface found unwired during verification.

Owner picks exactly one gap at Phase 1 kickoff.

## 5. Exit-gate checklist

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Baseline register exists with consistent status labels | **Met** — this document |
| 2 | Every major track-close / M* claim has source + evidence + status | **Met** — §2 |
| 3 | Decisions freeze is lock text | **Met** — [phase-0-decisions-freeze.md](./phase-0-decisions-freeze.md) |
| 4 | Working-tree disposition records owner choice | **Pending owner checkbox** — [phase-0-working-tree-disposition.md](./phase-0-working-tree-disposition.md) §4 |
| 5 | Executive links resolve; modules-v2 README points at Phase 0 | **Met** after link/README updates in this phase |
| 6 | No Phase 1 code landed under Phase 0 | **Met** — docs only |

**Phase 0 complete for documentation/verification when owner ticks disposition §4.** Phase 1 must not start until that checkbox is filled.
