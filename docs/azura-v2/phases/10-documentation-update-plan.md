# Phase 10 — Documentation Update Plan (read-only; do not edit living docs until scheduled)

## Critical factual fixes (living docs)

### `docs/deployment-profiles.md`

| Issue | Correction |
|-------|------------|
| “Future site flag… not part of profile loading today” | SiteFeature already exists |
| “A failed read fails closed” for `isModuleActive` | Availability fail-open; ingress fail-closed |
| “Register routes only” / “optional lazy API” | Middleware 404 prefixes; App Router files remain; not proven bundle exclusion |
| Prebuild generate | Soft-fail caveat until CI hardens |

### `docs/glossary.md`

Clarify Module / Deployment Profile; add SiteFeature, PackageInstallation, pending, profile-omitted, runtime-inactive.

### `docs/platform-boundaries.md`

Fitness Test 8: SiteFeature language instead of “future site flag.”

### Per-module docs

Add Availability subsections; marketing `/a` note; documentation required preset/caps.

### `docs/packages/*` (now under `docs/azura-v2/packages/`)

Align “keep rendering” with unavailable block state; keep Status: later.

## Missing operator doc

`modules-manager.md` — created under [../plans/modules-manager.md](../plans/modules-manager.md).

## Sequencing

1. Modules Manager doc (done in azura-v2/plans)  
2. Fix deployment-profiles fail-open/fail-closed  
3. Glossary  
4. platform-boundaries  
5. Per-module availability  
6. Package migration wording  
7. Defer **[D]** sentences (`/a` profile list, hard prebuild, bundle exclusion)

**Living docs** (`deployment-profiles.md`, glossary, etc.) intentionally **not moved** into this folder — only planned for edits when M0 doc work executes.
