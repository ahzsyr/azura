# Modules Manager Upgrade — Startup Phase

> **Status:** Executable specification (audit-hardened)  
> **Parent roadmap:** [application-platform-upgrade-plan.md](./application-platform-upgrade-plan.md)  
> **Operator reference:** [modules-manager.md](./modules-manager.md)  
> **Index:** [../README.md](../README.md)

This is the **first executable slice** of the Modules Manager upgrade under **Option A + Option C**. Parent milestone ids (**M** / **U**) are unchanged; **D0 / S0–S3** are local step labels only.

**Order:** M1 → M2 → M0 (same as parent §14).  
**Exit:** Parent **M0 + M1 + M2 complete**.  
**Handoff:** **M3 then M4** (not M5).

```text
D0  Write this doc + index links
S0  DG1–DG4 locked (this section)
S1  Re-verify existing Marketing ingress → close remaining holes
S2  Prebuild selected-artifact assert + CI host for profiles:verify
S3  Living-doc honesty (named passages)
Exit M0+M1+M2 → M3 → M4
```

---

## Milestone mapping

| Step | Parent | Completes when |
|------|--------|----------------|
| S0 | DG1–DG4 | Recorded below |
| S1 | **M1** / U1 | Remaining P0 holes closed; ingress suite green + registered in npm/CI |
| S2 | **M2** / U2 | Prebuild fails on bad selected artifact; GH CI runs `profiles:verify` |
| S3 | **M0** / U0 | Named living-doc passages fixed |

**Out of Startup (keep separate):**

| Id | Topic |
|----|--------|
| M5 / U5 | Uninstall / update / purge UI |
| M6 / U6 | Core → Module extractions |
| M7 / U7 | Option C themes |
| M8 / U8 | Bundle measurement (docs may note “unproven”) |
| M9 / U9 | Catalogue / marketplace |

**Non-goals:** Option B (hot-load ZIP executables); Edge/proxy Prisma `SiteFeature` checks; `profiles:verify` inside prebuild.

---

## Inputs

- [../audits/01-existing-system-audit.md](../audits/01-existing-system-audit.md)
- [../audits/02-p0-runtime-deactivation-plan.md](../audits/02-p0-runtime-deactivation-plan.md)
- [../audits/03-honest-package-platform-architecture.md](../audits/03-honest-package-platform-architecture.md)
- [../phases/01-p0-runtime-guards.md](../phases/01-p0-runtime-guards.md), [06](../phases/06-profile-bundle-boundary.md), [08](../phases/08-capabilities-dependencies.md) (Forbidden operator claims), [09](../phases/09-release-roadmap.md), [10](../phases/10-documentation-update-plan.md)

---

## S0 — Locked decisions (DG1–DG4)

### DG1 — Selected profile + hard unknown

1. Resolve once: `resolvedProfile = (AZURA_PROFILE ?? "enterprise").trim().toLowerCase()`.
2. If not in `STANDARD_PROFILES` → **hard error** (no warn-and-coerce to enterprise).
3. Use the **same** `resolvedProfile` for generate and post-generate assert.
4. Assert artifact: `generated === true` and `profileId === resolvedProfile`.
5. `generated: false` fallback (e.g. missing nav manifest) must **fail** prebuild.
6. **`profiles:verify` never runs in prebuild** (six compiles). CI-only.
7. Selected-artifact assert is authoritative for `generated: true` on the deploy profile.
8. **M2.1:** Hostinger `build:hostinger` imports the same generate+assert sequence (rejects `AZURA_PROFILE_FILE`). Fail-closed on the shipping path. See [modules-manager-m2.1-hostinger-profile-hardpath-phase.md](./modules-manager-m2.1-hostinger-profile-hardpath-phase.md).
9. **M2.2:** Production assert compares `profileSourceModules` to reviewed expectations under `scripts/deploy/`. Trust = PR review of `--write-expectations` diffs. See [modules-manager-m2.2-profile-source-integrity-phase.md](./modules-manager-m2.2-profile-source-integrity-phase.md).

### DG2 — `/a` extra binding

Marketing `publicRoutes` is only `["/api/marketing"]`. `/a` is **not** derived from that list.

**Injection:** In `compileProfile` (`scripts/build/generate-deployment-profile.mjs`), after the `MODULE_ROUTE_REGISTRY` omit loop, if `marketing` ∉ enabled modules, push `"/a"` onto `disabledPublicPrefixes` via `MODULE_EXTRA_DISABLED_PUBLIC`.

| Layer | Behavior |
|-------|----------|
| App Router | `src/app/a/route.ts` matches **`/a` only** |
| Middleware | `/a` and `/a/*` treated as campaign short-link paths |
| Active `/a/x` | No App Router handler → Next 404 (document; not campaign redirect) |
| Profile-omitted `/a` and `/a/*` | Middleware 404 via disabled prefix `/a` |

### DG3 / DG4

- Beacons (attribution/events): `200 skipped` when inactive.
- Webhook GET challenge: non-success when inactive.
- Mutation ingress: **fail closed** on ledger null.
- UI availability: **fail open** on ledger null.

**Ops (DG4):** Ledger/SiteFeature outage denies Marketing mutation ingress (including provider webhook retries). Runbook: restore DB / SiteFeature readability. `MARKETING_CORE_ENABLED` is not a substitute for ledger recovery.

---

## S1 — Re-verify and close (not greenfield)

### Already built (do not rebuild)

- `src/modules/marketing/ingress-guard.ts`, `ingress-decision.ts`, `ingress/handlers.ts`, `ingress/short-link.ts`
- Routes wire resolve/handlers: `/a`, attribution, events, webhooks, OAuth, jobs
- `src/modules/marketing/__tests__/ingress-deactivation.test.ts`

### Remaining holes

1. ~~Inject `/a` in generator when marketing omitted; assert in verify.~~ **Closed** — `MODULE_EXTRA_DISABLED_PUBLIC` in [`scripts/build/generate-deployment-profile.mjs`](../../../scripts/build/generate-deployment-profile.mjs); DG2. (Doc hygiene.)
2. ~~Document + cover `MARKETING_CORE_ENABLED=0` with SiteFeature still on.~~ **Closed for track** — outcome matrix row above; `decideMarketingIngress` `env_disabled` in [`ingress-deactivation.test.ts`](../../../src/modules/marketing/__tests__/ingress-deactivation.test.ts). Optional per-surface matrix cells = out-of-band ([track close](./modules-manager-track-close-phase.md)).
3. ~~Name write-on-read.~~ **Closed** — stronger-bar below: Core `SiteFeature` / `PackageInstallation` seed writes from `loadSiteFeatureMap` allowed.
4. ~~Register `npm run test:marketing-ingress`; include in CI.~~ **Closed** — `package.json` `ci` runs `test:marketing-ingress`.
5. ~~Static guard-order assertion on P0 route sources.~~ **Closed** — [`ingress-guard-order.test.ts`](../../../src/modules/marketing/__tests__/ingress-guard-order.test.ts) via `test:marketing-ingress`.
6. ~~Hard-fail unknown `AZURA_PROFILE` in generator.~~ **Closed** — [`ensureSelectedDeploymentProfile`](../../../scripts/deploy/ensure-selected-deployment-profile.mjs) (M2.1).
7. Out of scope unless regression: `resolveShortLinkRedirectOrigin` host guessing.

### Outcome matrix

| Condition | `/a` | `/a/x` | Attribution / events | Webhook GET | Webhook POST | OAuth |
|-----------|------|--------|----------------------|-------------|--------------|-------|
| Active + env on | Existing short-link contract | Next 404 (no route) | Persist as today | Challenge OK | Process as today | Upsert as today |
| Active + `MARKETING_CORE_ENABLED=0` | Deny / no cookie | Middleware allow → Next 404 | Skip/deny before Marketing writes | No challenge success | Skipped | No upsert |
| Runtime-inactive | No Marketing write; no cookie; redirect home | No Marketing side effects | `200 skipped` before writes | Non-success | Skipped | No upsert |
| Profile-omitted (DG2) | Middleware 404 | Middleware 404 | Middleware 404 `/api/marketing…` | 404 | 404 | 404 |
| Ledger-null | Fail-closed; Core seed writes may occur | Same | Fail-closed skipped | Fail-closed | Fail-closed | Fail-closed |

**Stronger bar:** No Marketing-domain writes / attribution cookies / OAuth upserts / successful webhook challenges when denied. **Allowed:** Core `SiteFeature` / `PackageInstallation` seed writes from `loadSiteFeatureMap`.

### S1 rollback

1. Revert generator `/a` injection and any guard edits.  
2. **Regenerate** `deployment-profile.json` for target `AZURA_PROFILE` and redeploy.  
3. Keep profile ceiling otherwise.

---

## S2 — Profile artifact integrity + CI host

### Prebuild (`scripts/deploy/prebuild.mjs`)

- Hard-fail when `profile:generate` fails (no warn-and-continue for that script).
- After generate: assert `generated === true` and `profileId === resolvedProfile` (same resolution as generator).
- Do **not** invoke `profiles:verify`.

### CI host

- Add `profiles:verify` and `test:marketing-ingress` to `package.json` `"ci"`.
- Add `.github/workflows/ci.yml` running `npm run ci` (Node 24).

**Artifact order:** If a job runs verify then builds a non-enterprise deploy, run selected `profile:generate` **after** verify (verify restores enterprise in `finally`).

---

## S3 — Honesty freeze (auditable)

**Forbidden claims:** [../phases/08-capabilities-dependencies.md](../phases/08-capabilities-dependencies.md).

### Must fix (acceptance rows)

1. `docs/deployment-profiles.md` — “A failed read fails closed” → availability fail-open; ingress fail-closed.  
2. Same — `/a` “before a later extraction, decide…” → DG2 extra binding + omitted disables `/a`.  
3. Same — “Register routes… only” / “Optional lazy registration” → middleware disabled prefixes; not proven bundle exclusion.  
4. `docs/platform-boundaries.md` — “A future site flag…” → SiteFeature.

Also: glossary terms; **new** Availability sections on documentation / status-page / marketing module docs.

**Deferred:** `docs/azura-v2/packages/*.md` wording.

---

## Success metric

Operators never confuse pending ZIP with running code; deactivate stops Marketing-domain mutations on P0 surfaces; a mismatched or `generated: false` selected profile cannot ship via prebuild; living docs no longer contradict Option A + C.
