# AZURA Application Platform Upgrade Plan

> **Status:** Planning baseline (detailed roadmap)  
> **Admin surface today:** `/admin/modules` (Modules Manager)  
> **Index:** [../README.md](../README.md) · **Modules Manager:** [modules-manager.md](./modules-manager.md)  
> **Related living docs:** [deployment-profiles.md](../../deployment-profiles.md) · [glossary.md](../../glossary.md) · [platform-boundaries.md](../../platform-boundaries.md) · [packages/](../packages/)  
> **Per-module docs:** [documentation.md](../../modules/documentation.md) · [status-page.md](../../modules/status-page.md) · [marketing.md](../../modules/marketing.md)

This document is the **project upgrade plan** for evolving AZURA’s existing Modules Manager into a fully integrated, WordPress-inspired **application platform** — without pretending the current system is already a hot-pluggable plugin host.

It consolidates:

- The product goal (installable / removable / editable apps, themes, and extensions).
- The Phase 1–3 audits and architecture decision (**Option A + Option C**).
- The Phase 2 P0 runtime-deactivation remediation plan.
- Later planning (package contract, contributions, security, profiles/bundles, operator UX, capabilities, docs).
- Work already landed in the repository during the Extensibility Clean Restart (runtime ingress guards, lifecycle sync, ZIP honesty, contribution inventory, Modules UX accuracy) and what remains.

**Legend:** **[F]** fact in repo · **[I]** inference · **[R]** recommendation · **[D]** unresolved decision

---

## 1. Product intent vs current system

### What you asked for

A platform similar to WordPress:

| WordPress concept | Desired AZURA outcome |
|-------------------|------------------------|
| Plugins / apps | Installable, removable, editable product units |
| Themes | Presentation packages that customize look without forking Core |
| Plugin/theme install UI | Admin can browse, import, activate, deactivate, update, remove |
| Deep integration | Works with admin, public pages, APIs, builder, settings, auth |
| Site-level control | Turn features on/off per installation |

### What you have today **[F]**

A **Modules system**, not a WordPress plugin host:

| Layer | Role | Can enable code omitted from the build? |
|-------|------|----------------------------------------|
| Deployment Profile | Build-time availability ceiling | No |
| `SiteFeature` | Runtime on/off for *included* modules/presets | No |
| `PackageInstallation` | Ledger (`installed` / `active` / `inactive` / `pending`) | `pending` stores metadata only |
| ZIP import | `azura-package.json` + allowlisted SQL | **No** executable JS/TS/React |

Three in-repo Modules (`documentation`, `status-page`, `marketing`) are build-time distributed, registered in `MODULE_MANIFESTS`, routed under `src/app`, and toggled at runtime via Modules Manager.

**Honest translation:** Modules Manager is a **profile-bounded feature switch + package ledger**, not an app store that hot-loads server code from a ZIP.

### Target architecture (approved direction) **[R]**

From Phase 3:

- **Option A (primary):** Build-time-distributed Applications (Modules). New executable behavior requires code in the repo, registry entry, profile generate, and deploy.
- **Option C (overlay):** Declarative runtime contributions — theme tokens, settings, contribution manifests, assets — **without** arbitrary server-side code execution.
- **Option B (rejected as default):** Genuine runtime plugin host for arbitrary uploaded executables on Hostinger + Next.js App Router.

This is the closest WordPress-*like* experience that remains secure and operable on the current stack. A true “upload ZIP → new React admin + API routes run immediately” product requires a separate multi-year platform bet (sidecar / signed dynamic loader) and is **out of scope** for this upgrade plan.

---

## 2. Vocabulary (preserve paths; clarify product speech)

| Operator / product language | Repository term | Notes |
|----------------------------|-----------------|-------|
| Application / App | Module (`packageKind: "app"`) | Admin group remains **Modules** |
| Plugin / Extension | `extension` (manifest kind) | Contract exists; runtime contribution wiring incomplete |
| Theme | `theme` (manifest kind) | Tokens can be runtime; React themes need deploy |
| Install (WordPress sense) | Profile include + deploy + `install`/`activate` | ZIP alone ≠ executable install |
| Activate / Deactivate | `SiteFeature` + `PackageInstallation` active/inactive | Data retained on deactivate |
| Remove / Uninstall | Library exists; **no Modules UI** yet | Must separate deactivate vs uninstall vs purge **[D]** |
| Marketplace | Deferred | Not in this roadmap |

---

## 3. Non-goals (explicit)

1. No arbitrary executable code in package ZIPs.
2. No Edge/proxy middleware Prisma `SiteFeature` checks (without a separately proven cache design).
3. No marketplace / public catalogue in this upgrade plan.
4. No claim that profile omission proves client/server **bundle exclusion** until measured.
5. No treating `permissions` on manifests as ACL (admin auth stays Core).
6. No capability toggles on the Modules screen (capabilities remain profile ceiling).

---

## 4. Current baseline (what works / what hurts)

### Working **[F]**

- Profile compile: `docs/profiles/*.yaml` → `generate-deployment-profile.mjs` → `src/generated/deployment-profile.json`.
- Three Module manifests + route registry + Modules admin UI (toggles, ZIP import/export).
- Preset cascade via `expandFeatureToggles` / `updateSiteFeatures`.
- Builder effective profile; saved blocks kept as unavailable when Module off.
- ZIP allowlist rejects executable payloads.
- Partial Extensibility restart work: Node ingress guards for Marketing (incl. `/a`), lifecycle SiteFeature↔package sync, honest pending ZIP UX, contribution inventory + unknown-key reject, Modules lifecycle labels/control availability.

### Critical gaps (drive upgrade order)

| ID | Gap | Why it blocks “WordPress-like” trust |
|----|-----|--------------------------------------|
| G1 | Runtime deactivate ≠ edge route removal | Inactive Module can still be reachable on profile-included paths if Node guards missing |
| G2 | `/a` outside marketing `publicRoutes` | Profile omit does not middleware-404 short links without explicit binding **[D]** |
| G3 | Soft `prebuild` on profile generate failure | Stale / `generated: false` profile can ship |
| G4 | Bundle exclusion unproven | Shared imports keep Module code in graphs |
| G5 | `update` / `uninstall` library only | Operators cannot complete full lifecycle in UI |
| G6 | `extension` / `theme` kinds mostly contractual | No full contribution applicator |
| G7 | Docs still overclaim in places | Fail-closed wording vs fail-open availability; “future site flag” while SiteFeature exists |
| G8 | Capability / dependency operator clarity | Caps display-only; `requiredPackages` empty on shipped modules |

---

## 5. North-star capabilities (mapped to WordPress)

What “fully integrated application platform” means **under Option A + C**:

| Capability | How AZURA delivers it | WordPress analogue |
|------------|----------------------|--------------------|
| Ship a new app | Module code + `src/app` routes + registry + profile YAML + deploy | Plugin in wp-content (but requires release) |
| Turn app on/off per site | Modules Manager → SiteFeature / package status | Activate / deactivate plugin |
| Import package metadata | ZIP → install builtin or `pending` | Upload plugin zip (metadata/SQL only here) |
| Export backup | Metadata + SQL ZIP | Partial (not full plugin files) |
| Theme tokens without rebuild | Option C declarative theme packages | Customizer / theme.json-like |
| New React UI / API | Requires Option A deploy | Requires plugin PHP files on disk (similar constraint, different DX) |
| Remove app from site | Deactivate (retain data); uninstall/purge later with safety **[D]** | Deactivate then delete |
| Remove app from product | Profile omit + extract from registry/build | Remove from server files |

**Success metric for this upgrade:** Operators never confuse `pending` ZIP with “plugin running,” and deactivate **reliably stops ingress** for Module-owned mutations.

---

## 6. Decision gates (approve before expanding scope)

| Gate | Question | Default if undecided |
|------|----------|----------------------|
| DG1 | Soft vs hard fail when `profile:generate` fails in prebuild/CI? | **[R]** Hard-fail in CI; document soft prebuild until fixed |
| DG2 | Add `/a` to profile `disabledPublic*` when marketing omitted? | **[R]** Yes |
| DG3 | Inactive beacons: `200 skipped` vs `404`? | **[R]** `200 skipped` for attribution/events; stricter for webhook GET challenge |
| DG4 | Ledger null on ingress: fail closed? | **[R]** Yes for mutations; fail open for UI availability |
| DG5 | Expose uninstall / update / purge in Modules UI? | **[R]** After safety UX; purge separate from uninstall |
| DG6 | When do `extension` / `theme` become first-class in UI? | **[R]** After contribution contracts + Option C theme tokens |
| DG7 | Pursue measured bundle exclusion as a release gate? | **[R]** Measure first; gate only if product requires |

---

## 7. Upgrade program — phased roadmap

Phases below are **implementation milestones** for the upgrade. They absorb Phase 1–10 planning outputs and Extensibility Clean Restart progress. Do not start later milestones before earlier acceptance criteria are met unless a dependency is explicitly waived.

### Milestone M0 — Honesty freeze (docs + claims)

**Objective:** Align operator-facing language with Option A + C.

**Scope:**

- Maintain `docs/azura-v2/plans/modules-manager.md` (operator reference).
- Fix `docs/deployment-profiles.md` (SiteFeature is present; availability fail-open vs ingress fail-closed).
- Glossary terms: SiteFeature, PackageInstallation, pending, profile-omitted, runtime-inactive.
- Forbidden claims list (no hot-load ZIP code; no capability toggle; deactivate ≠ delete data).

**Schema:** None.  
**Acceptance:** Docs match Phase 8/10 factual matrix; no “marketplace” implication.  
**Rollback:** Revert doc commits.

---

### Milestone M1 — P0: Deactivation means ingress stops

**Objective:** When a Module is runtime-inactive but still profile-included, mutation-capable surfaces cannot side-effect.

**Prerequisites:** DG3, DG4 decided (or temporary defaults above). Phase 2 matrix as checklist.

**Scope (Node only — not Edge SiteFeature):**

1. Central path → Module bindings (manifest prefixes + extras such as `/a`).
2. Shared ingress helper: fail closed when ledger unavailable for mutations.
3. Protect (verify each still needed / already fixed):
   - `GET /a`, `/a/*`
   - Attribution capture
   - Events (guard before DB work)
   - Webhooks GET + POST
   - OAuth start/callback
   - Client bootstrap best-effort (server remains authority)
4. Profile generator: optional `/a` disable when marketing omitted (**[D]** DG2).
5. Regression tests: active / inactive / profile-omitted / ledger-null.

**Affected subsystems:**

- `src/app/a/route.ts`
- `src/app/api/marketing/**`
- `src/modules/marketing/**`
- `src/config/deployment-profile/*` (bindings / helpers)
- `scripts/build/generate-deployment-profile.mjs` (if DG2)
- Tests under marketing / middleware / packages

**Risk:** Medium (public API behavior change).  
**Schema:** None.  
**Acceptance:** Phase 2 §6–§7 P0 bar — no Marketing mutation/cookie while inactive; tests green.  
**Rollback:** Revert guard PRs; keep profile ceiling.

**Status note:** Partial work may already exist from prior implementation turns — **re-verify** against Phase 2 matrix before claiming M1 closed.

---

### Milestone M2 — Profile artifact integrity

**Objective:** Production cannot silently run a mismatched or fallback profile.

**Scope:**

- Fail CI / prebuild when `profile:generate` fails (**[D]** DG1).
- Assert `deployment-profile.json.profileId` matches `AZURA_PROFILE` and `generated: true`.
- Run `npm run profiles:verify` in main `ci`.

**Paths:** `scripts/deploy/prebuild.mjs`, `package.json`, `scripts/profiles/*`.  
**Schema:** None (redeploy required for new policy).  
**Acceptance:** Intentional generate break fails the pipeline.  
**Rollback:** Restore soft-continue with documented waiver.

---

### Milestone M3 — Lifecycle consistency & operator accuracy

**Status:** Complete — see [modules-manager-m3-lifecycle-phase.md](./modules-manager-m3-lifecycle-phase.md). Next: **M4**.

**Objective:** Admin UI and installer tell one truth (Option A + C).

**Scope:**

- State labels: included-active, included-inactive, profile-omitted, pending, unavailable.
- No activate on pending; no update/uninstall/purge until M5 (ZIP import/export with allowlisted up SQL remains).
- Honest import/export copy (metadata + SQL only).
- Pin tests: `expandFeatureToggles` (same-save + complementary), `requiredPackages` blocking, pending sync, installer SQL asymmetry (deactivate no SQL / activate up / destructive uninstall owns down).
- Align SiteFeature ↔ `PackageInstallation` on module toggles (if any drift remains).

**Paths:** `module-screen*.ts*`, `package-ui-copy.ts`, `module-screen-ui.ts`, `installer.ts`, `lifecycle.ts`, `site-feature-changes.ts`.  
**Schema:** None.  
**Acceptance:** Phase 7 UX control map + Phase 8 behavior tests; `npm run test:modules-lifecycle` in `"ci"`.  
**Rollback:** Revert L1 tests / L2 script; keep L3/L4 doc honesty unless code changes restore old claims.

---

### Milestone M4 — Contract hardening & contributions inventory

**Status:** Complete — see [modules-manager-m4-contributions-phase.md](./modules-manager-m4-contributions-phase.md). Next: **M5**.

**Objective:** One contribution contract; reject unknown keys; document field semantics.

**Scope:**

- Keep contribution inventory as source of truth (nav, routes, blocks, dashboard sections).
- Reject unknown contribution keys (e.g. themeTokens as contribution — theme ownership stays SiteTheme).
- Document: `requiredCapabilities` = profile generate ceiling **and** Modules screen display (not activate-enforced); `permissions` = labels; `requiredPackages` = activate graph **and** disable graph.
- First-prefix dashboard links from built-in manifests only (`adminRoutePrefixes[0]`); pin order preservation.

**Paths:** `src/platform/packages/manifest.ts`, contribution inventory, builder registry, `contributions.ts`.  
**Schema:** None.  
**Acceptance:** Contract tests in `"ci"` (`test:package-contract`); unknown keys fail validation; compile-time contribution key completeness.  
**Rollback:** Revert validators/tests.

---

### Milestone M5 — Full operator lifecycle (WordPress-like deactivate / update / remove)

**Status:** Complete — see [modules-manager-m5-lifecycle-ux-phase.md](./modules-manager-m5-lifecycle-ux-phase.md). Next: **M6**.

**Objective:** Safe admin journeys for update and uninstall **without** hot-code install.

**Prerequisites:** M1–M4; DG5.

**Scope:**

| Operation | Behavior |
|-----------|----------|
| Update | Builtin + generated + included: re-apply ship-time **up** SQL / version bump; never ZIP executables |
| Uninstall (non-destructive) | Included builtin → deactivate-only (code stays); pending/non-builtin → ledger delete; retain content |
| Remove (typed; parent “purge”) | Pending/non-builtin only; type package id; ledger clear (no schema-destroy claim). **Refused for all builtins** before down SQL |
| Pending queue | Remove from queue / Remove with awaiting-deploy copy |

**Paths:** `installer.ts`, `actions.ts`, Modules UI.  
**Schema:** None (audit/history later **[D]**).  
**Acceptance:** Dependency checks; typed Remove; builtin Remove refused; `system` section.  
**Rollback:** Hide UI; keep library refuses.

---

### Milestone M6 — Convert more of the project into Applications (Option A)

**Status:** First slice complete (Advanced SEO) — see [modules-manager-m6-advanced-seo-phase.md](./modules-manager-m6-advanced-seo-phase.md). Next: **M7** (further extractions can continue under M6 checklist later).

**Objective:** Promote selected Core/feature areas into Modules (apps) that Modules Manager can activate.

**Candidates (from existing package migration docs):**

| Candidate | Source docs | Notes |
|-----------|-------------|-------|
| Advanced SEO app | `docs/azura-v2/packages/seo-app-migration.md` | **Done (logical)** — read path stays Core; physical `platform/` move later |
| Ecommerce app + commerce-blocks extension | `docs/azura-v2/packages/catalog-ecommerce-migration.md` | `requiredPackages` edge |
| Theme packages (tokens) | `docs/azura-v2/packages/themes-migration.md` | Option C first |
| Preset-as-dependency clarity | `docs/azura-v2/packages/presets-migration.md` | Keep presets internal unless forced |

**Per conversion checklist:**

1. ModuleManifest + `MODULE_MANIFESTS` registration.  
2. `adminRoutes` / `publicRoutes` / `navItemIds` / blocks.  
3. Profile YAML inclusion rules + generate verify.  
4. `module-profile` / `assertModuleActive` on admin + APIs.  
5. Ingress guards for public mutations.  
6. SiteFeature seed + package seed.  
7. Docs + Modules card copy.  
8. Data retention on deactivate verified.

**Schema:** Only when new package-owned tables are truly required; prefer shared Prisma until ownership is clear.  
**Acceptance:** App can be profile-omitted and runtime-inactive with no open ingress; content retained.

---

### Milestone M7 — Option C declarative extensions (theme / contribution overlays)

**Status:** M7–M7.3 complete. **M8** + **M2.1** + **M8.1** + **M2.2** + **M2.3** complete. **M8.2** blocked on install (baseline out-of-band). **Implementation track closed** — [modules-manager-track-close-phase.md](./modules-manager-track-close-phase.md). **M9** deferred.

**Objective:** WordPress-*like* customization **without** executable ZIP.

**In scope:**

- Theme token packages (JSON) applied by Core theme engine. **Done (M7).**
- Contribution manifests toggling already-shipped blocks/nav/settings. **Done (M7.1).**
- Approved media/font assets referenced by packages. **Done (M7.2).**
- Deferred rich theme fields (`customCss` policy, brand/header/footer, effects). **Done (M7.3).**

**Out of scope:** New React components from ZIP; new App Router files from ZIP.

**Acceptance:** Theme switch does not rewrite page block JSON; React themes stay pending until deploy (existing theme migration rule).

---

### Milestone M8 — Boundary evidence & shared-import hygiene

**Objective:** Know what profile omission actually removes — with honest instruments.

**Scope (A+1 + audit pass 2):**

- Matched-twin builds (`enterprise` vs ephemeral `enterprise-minus-marketing`) + client/server/metadata marker scan.
- Full shared-edge inventory with imported symbols; reviewed snapshot CI (no exclusion gate).
- Document accepted coupling; **`inconclusive` is a legitimate exit** when the substring instrument cannot support a Marketing-attributable delta.
- See [modules-manager-m8-boundary-evidence-phase.md](./modules-manager-m8-boundary-evidence-phase.md).

**Acceptance:** Public docs state measured facts (or inconclusive) and accepted coupling.  
**No claim of exclusion until observed with a capable instrument.**

**Status:** Complete — inventory snapshot CI + measure script shipped; twin verdict **inconclusive** (build abort). See phase doc.

---

### Milestone M9 — Distribution (deferred catalogue)

**Objective:** Private catalogue / release channels **after** M1–M7.

Models to evaluate later (Phase 7 distribution planning):

1. Builtin with Core.  
2. Controlled build include.  
3. Trusted private catalogue (metadata + signed deploy artifacts — not in-process JS upload).  
4. Manual ZIP metadata import.  
5. External integrations without server code load.

**Not started in this plan’s near-term releases.**

---

## 8. Work-item table (near-term execution order)

| Order | ID | Milestone | Objective | Schema? | Risk | Tests | Acceptance |
|------|----|-----------|-----------|---------|------|-------|------------|
| 1 | U0 | M0 | Doc honesty | No | Low | Doc review | Claims match A+C |
| 2 | U1 | M1 | P0 ingress guards | No | Med | Route matrix | Inactive = no Marketing side effects |
| 3 | U2 | M2 | Profile CI hard-fail | No | Med | Verify script in CI | Bad profile fails build |
| 4 | U3 | M3 | UX + lifecycle pins | No | Low | module-screen-ui + lifecycle | Honest states/controls |
| 5 | U4 | M4 | Contributions contract | No | Low | package-contract | Unknown keys rejected |
| 6 | U5 | M5 | Update/uninstall UX | Maybe later | High | Installer + UI | Safe confirmations |
| 7 | U6 | M6 | Extract more apps | Case-by-case | High | Per-module | App lifecycle complete |
| 8 | U7 | M7 | Declarative themes/C | No / low | Med | Theme apply | Tokens without rebuild |
| 9 | U8 | M8 | Bundle measurement | No | Low | Build report | Documented guarantee |
| 10 | U9 | M9 | Catalogue | Likely | High | TBD | Separate RFC |

---

## 9. Mapping “convert parts of the project into applications”

Recommended conversion order (after M1–M4):

```text
1. Freeze trust (M1–M2)     — deactivate/profile honesty
2. Freeze contract (M3–M4)  — operators + manifests
3. Promote Advanced SEO     — clearest Core split (read vs write)
4. Promote Ecommerce app    — when commerce lifecycle needed
5. Theme token packages     — Option C DX win
6. Further verticals        — only with Fitness Test 8 + Module review
```

**Do not** convert a surface to a Module until:

- Routes/APIs have a Module binding and inactive guards.
- Nav/blocks declare ownership.
- Deactivate data-retention is acceptable to product.
- Profile YAML strategy for which customers get the app is decided.

---

## 10. Security & trust boundaries (keep permanent)

```text
ZIP upload
  → allowlist entries only (manifest + migrations/*.sql)
  → unknown id → pending (no SQL apply from untrusted disk path for unknown code)
  → never dynamic import of uploaded JS/TS/React

Builtin package SQL
  → from src/modules/<id>/migrations at ship time
  → $executeRawUnsafe trusted as release artifact

Profile omission
  → Edge/proxy 404 on compiled disabled prefixes

Runtime inactive
  → Node ingress + services fail closed for mutations
  → UI availability may fail open on ledger outage (split policy)
```

---

## 11. Rollback & verification checklists

### After M1

- [ ] Inactive Marketing: no attribution rows, no event rows, no OAuth upsert, no `/a` cookie.  
- [ ] Active Marketing: smoke OAuth/webhook/jobs.  
- [ ] Profile without marketing: declared prefixes 404; `/a` per DG2.  
- [ ] Focused tests + typecheck/lint on touched files.

### After M2

- [ ] Break generate on purpose → CI red.  
- [ ] Deployed artifact `profileId` matches env.

### After M3–M4

- [x] Pending ZIP cannot show Activate.  
- [x] Export copy says metadata/SQL only.  
- [x] Unknown contribution key fails validation.

### After M5+

- [x] Soft Uninstall without Remove retains content (included builtin → deactivate-only).  
- [x] Remove requires typed package-id confirm (pending/non-builtin).  
- [x] Builtin soft Uninstall cannot remove code from disk (only ledger / flags).  
- [x] Destructive Remove refused for all builtins before down SQL.

---

## 12. Documentation deliverables (apply in M0 / ongoing)

| Doc | Action |
|-----|--------|
| `docs/azura-v2/plans/modules-manager.md` | Operator honesty (two-layer model, ZIP, non-goals) |
| `docs/deployment-profiles.md` | Fix fail-open/fail-closed; SiteFeature present; control table (middleware 404 ≠ bundle exclusion) |
| `docs/glossary.md` | Add SiteFeature, PackageInstallation, pending, profile-omitted, runtime-inactive |
| `docs/platform-boundaries.md` | Fitness Test 8 → SiteFeature language |
| `docs/modules/{documentation,status-page,marketing}.md` | Availability subsections; marketing `/a` note |
| `docs/azura-v2/packages/*.md` | Keep “later”; align render/unavailable wording; Option A + C pointers |
| **This file** | Living upgrade roadmap |

Exact sentence-level edits: see Phase 10 Documentation Update Plan (response archive / prior chat). Apply in the sequencing listed in §7 M0.

---

## 13. What “done” looks like for the upgrade

The platform upgrade is **successful** when:

1. Operators can manage Applications (Modules) with WordPress-like activate/deactivate clarity.  
2. Deactivate **stops** Module ingress (not only admin layouts).  
3. Import/export never implies hot-loaded executables.  
4. Pending packages have a clear deploy path.  
5. Additional product areas can be converted into Modules via a repeatable checklist (M6).  
6. Themes/extensions advance via Option C without Option B.  
7. Docs, CI, and UI never overclaim marketplace or bundle exclusion.

It is **not** required (and not promised) that uploading a ZIP installs new Next.js routes or React admin without a rebuild.

---

## 14. Immediate next actions

**Implementation track closed** — [modules-manager-track-close-phase.md](./modules-manager-track-close-phase.md) (ship bar: implemented + gated, **not** measured).  
**Single status register:** [../phases/09-release-roadmap.md](../phases/09-release-roadmap.md) and [modules-manager-doc-hygiene-phase.md](./modules-manager-doc-hygiene-phase.md). Do not treat this section as a second open-decisions list.

**Scope boundary:** Closing in-repo Option A + C Modules Manager implementation. Operator Node → M8.2 finished twin baseline is **no longer** this roadmap’s in-track forward motion.

### Completed (index)

| Phase | Doc |
|-------|-----|
| Startup (M1 → M2 → M0) | [modules-manager-startup-phase.md](./modules-manager-startup-phase.md) |
| M3–M7.3 | See hygiene / Phase 9 milestone table |
| M8 / M2.1 / M8.1 / M2.2 / M2.3 | Boundary instrument, Hostinger hard-path, twin repair, module-set expectations, hard non-profile generators |
| Doc hygiene | [modules-manager-doc-hygiene-phase.md](./modules-manager-doc-hygiene-phase.md) |
| Track close | [modules-manager-track-close-phase.md](./modules-manager-track-close-phase.md) |

Decision gates **DG1–DG5** locked (DG5: Remove ≠ soft Uninstall; Purge/Remove refused for all builtins). DG1 extended to Hostinger (M2.1) + module expectations (M2.2) + non-profile generators (M2.3).

### Phase report with blocked exit (baseline pending)

| Phase | Doc |
|-------|-----|
| M8.2 | [modules-manager-m8.2-twin-measure-baseline-phase.md](./modules-manager-m8.2-twin-measure-baseline-phase.md) — **blocked on install**; twin baseline **not** complete |

### Out-of-band follow-ons (not in-track Next)

See track-close out-of-band list: operator Homebrew/nvm Node → M8.2 finished twin baseline; **M9** RFC (deferred); YAML full-byte tripwire; exclusion CI gate; optional S1 surface-cell polish; former P1–P3 backlog.

---

## 15. Related source map

```text
Admin:     src/app/admin/(dashboard)/modules/
Model:     src/modules/module-screen*.ts*
Manifests: src/modules/*/manifest.ts
Registry:  src/config/deployment-profile/route-registry.ts
Features:  src/config/deployment-profile/site-features.ts
Packages:  src/platform/packages/*
Profiles:  docs/profiles/*.yaml
Generate:  scripts/build/generate-deployment-profile.mjs
Artifact:  src/generated/deployment-profile.json
Prisma:    SiteFeature, PackageInstallation, PackageMigration
```

---

*This plan does not implement features by existing. It is the authoritative upgrade roadmap for turning the Modules system into AZURA’s integrated application platform under Option A + Option C.*
