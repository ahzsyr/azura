# Phase 0 — Working-tree disposition

**Snapshot:** `main` @ `af8f0817` (“Upgrade SEO”) · UTC `2026-10-30T11:53Z`  
**Parent:** [executive-application-platform-implementation-plan.md](./executive-application-platform-implementation-plan.md) · Phase 0  
**Companion:** [phase-0-baseline-register.md](./phase-0-baseline-register.md)

## 1. Counts

| Metric | Value |
|--------|-------|
| Total dirty paths (`git status --short`) | **255** |
| Untracked (`??`) | **68** |
| Platform-relevant (classified below) | **~85–97** paths (depending on whether SEO Advanced admin pages / living ops docs are counted as platform-adjacent) |
| Unrelated / do-not-mix remainder | **~158** |

**Critical finding:** Track-close / M0–M8 reports claim implementation closed, but the symbols and files that implement that work are largely **absent from HEAD** and exist only in the working tree. “Closed” ≠ committed ≠ shipped.

## 2. Classification rules

**Platform-relevant** — include in any Modules / application-platform baseline commit or PR:

- `src/modules/**`
- `src/platform/packages/**`
- `src/config/deployment-profile/**`
- `src/app/admin/(dashboard)/modules/**`
- `src/app/a/**`, `src/app/api/marketing/**`
- `src/features/marketing-attribution/**`, Marketing chrome that wires attribution bootstrap
- Profile / deploy / platform scripts: `scripts/build/generate-deployment-profile.mjs`, `scripts/profiles/**`, `scripts/deploy/*profile*`, `scripts/deploy/ensure-selected-deployment-profile.mjs`, `scripts/deploy/assert-deployment-profile.mjs`, `scripts/deploy/run-build-generators.mjs`, `scripts/deploy/prebuild.mjs` (profile-related hunks), `scripts/platform/**`
- Docs: `docs/modules-v2/**`, `docs/azura-v2/**`, `docs/modules/**` (module notes), profile YAML touches required by Modules
- `package.json` scripts that add Modules tests / profile verify (split carefully from unrelated script noise)

**Platform-adjacent (Modules-coupled SEO gating)** — prefer same baseline PR as Advanced SEO Module, or a tightly sequenced follow-up:

- Dirty `src/app/admin/(dashboard)/seo/**` Advanced pages that call Advanced SEO guards
- `docs/profiles/enterprise.yaml` when listing `advanced-seo`

**Unrelated / do-not-mix** — keep out of Modules PRs:

- Auth / OTP / email verification docs and tests (`docs/AUTH_AND_ADMIN.md`, `scripts/test/run-auth-tests.mjs`, …)
- Hostinger / static-asset / smoke CI unrelated to profile hard-fail
- Generic manage/content/pages/posts API and admin dirt
- Docker / `.env.example` / `next.config.ts` unless a Modules change truly requires them
- `public/uploads/` and other local artifacts

## 3. Platform-relevant groups by theme

| Theme | Representative paths | Modified / untracked | Tests / scripts in WT | Described in modules-v2? |
|-------|---------------------|----------------------|------------------------|--------------------------|
| Marketing ingress + `/a` DG2 | `src/modules/marketing/ingress*`, API marketing routes, `src/app/a/route.ts`, `MODULE_EXTRA_DISABLED_PUBLIC` in generator | Mix (ingress **untracked**; routes/generator **modified**) | `test:marketing-ingress` (in WT `package.json` only) | Yes — `04`, `modules/marketing.md` |
| SiteFeature ↔ package sync | `site-features.ts`, `lifecycle.ts`, `site-feature-changes.ts` | `lifecycle.ts` **untracked**; site-features **modified** | `package-lifecycle.test.ts` untracked; `test:modules-lifecycle` in WT package.json | Yes — `04`, `05` |
| ZIP / pending honesty | `installer.ts`, `manifest.ts`, `zip-store.ts` (HEAD), `package-ui-copy.ts` | installer/manifest **modified**; ui-copy **untracked** | `package-ui-copy.test.ts`, contract tests | Yes — `05`, `06` |
| Contributions inventory | `contribution-inventory.ts`, `contributions.ts`, owner maps | Mostly **untracked** + contributions modified | `contribution-inventory.test.ts`, `test:package-contract` | Yes — `07` |
| Extension overlays | `extension-package.ts`, `overlay-resolve.ts` | **Untracked** | `contribution-overlays.test.ts` | Yes — `07` |
| Theme packages | `theme-*.ts` under `src/platform/packages/` | **Untracked** | `test:theme-packages`, assets, rich-fields | Yes — `07` |
| Advanced SEO Module | `src/modules/advanced-seo/**` (6 files) | **Untracked** | `test:advanced-seo` | Yes — `modules/advanced-seo.md` |
| Profile hard-fail M2.1–M2.3 | `ensure-selected-deployment-profile.mjs`, `assert-deployment-profile.mjs`, `run-build-generators.mjs`, prebuild/hostinger hooks | Mostly **untracked** + deploy scripts modified | `scripts/deploy/__tests__/`, profile verify | Partial — `03` |
| Bundle measure M8/M8.2 | `scripts/platform/measure-profile-boundary.mjs`, twin assert, inventory | **Untracked** | Measure scripts present; twin baseline **blocked on install** | Noted as docs-only / blocked |
| Modules Manager UX | `module-screen*.ts(x)`, `actions.ts` | Mix | `module-screen-ui` tests, installer-screen-contract | Yes — `06` |
| modules-v2 + azura-v2 docs | `docs/modules-v2/**`, `docs/azura-v2/**` | Almost entirely **untracked** | N/A (docs) | Self |

### HEAD vs working tree (symbols)

Absent on HEAD `af8f0817` (present only in WT):

- `resolveModuleIngressAccess`
- `MODULE_EXTRA_DISABLED_PUBLIC`
- `planPackageStatusSync`
- `CONTRIBUTION_INVENTORY`
- Entire `src/modules/advanced-seo/`
- Theme/extension package modules listed above
- `test:marketing-ingress` / `test:advanced-seo` / related CI script entries in `package.json`

Present on HEAD in simpler form: `activatePackage` / `deactivatePackage` / `uninstallPackage` / basic installer (~317 lines HEAD vs ~630 lines WT).

## 4. Recommended disposition (default)

| Decision | Recommendation |
|----------|----------------|
| Platform-relevant WT | **Accept as the intended Phase 1+ implementation baseline** (present-but-unverified until committed) |
| Unrelated dirty paths | **Do not mix** into Modules / platform PRs |
| Before any claim of **shipped** | Explicit commit/PR of the platform baseline on a reviewable branch |
| Commit / stash / reset in Phase 0 | **Not performed** — owner chooses at exit review |

### Owner choice (fill at exit review)

- [x] **Accept** platform-relevant working tree as Phase 1 baseline (default)
- [ ] **Isolate** platform work onto a dedicated branch / commit set before Phase 1
- [ ] **Other** (note): ________________________________

**Owner initials / date:** Phase 1 kickoff — Accept default · 2026-10-30

## 5. Suggested isolation path (if owner chooses Isolate)

1. Create branch from `af8f0817` (or current `main`).
2. Stage **only** platform-relevant (+ Advanced SEO adjacent) paths.
3. Open PR titled for Modules platform baseline (Option A+C track-close code).
4. Leave unrelated dirt on `main` working tree or separate branches.
5. Re-run claim verification after merge → promote register rows from present-but-unverified toward shipped when CI evidence exists.

## 6. Non-actions for Phase 0

- No `git commit`, `stash`, `reset`, or force-clean.
- No Phase 1 ingress implementation.
- No twin-measure Node install as part of this disposition.
