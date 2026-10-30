# Phase 1 — Existing System Audit

**Scope:** Read-only inspection of Modules Manager and package platform.  
**Verdict:** Working two-layer gate (Deployment Profile + SiteFeature / package installer) for three in-repo Modules. **Not** a hot-pluggable package runtime.

## Architecture summary

```text
YAML profiles (docs/profiles/*.yaml)
        │  prebuild: generate-deployment-profile.mjs
        ▼
src/generated/deployment-profile.json
        ├── middleware / admin nav / is*Enabled()     PROFILE CEILING
MODULE_MANIFESTS (route-registry.ts)
        ├── SiteFeature (DB)                         RUNTIME ON/OFF
        ├── PackageInstallation (+ PackageMigration)
        └── Admin Modules screen (/admin/modules)
```

| Layer | Role | Can enable omitted code? |
|-------|------|--------------------------|
| Deployment Profile | Build-time ceiling | No |
| SiteFeature | Runtime on/off for included ids | No |
| PackageInstallation | Lifecycle ledger | `pending` = metadata only |

## Implemented

- Profiles, generator, verify scripts, compiled JSON
- Three Module manifests (`documentation`, `status-page`, `marketing`) as `app`
- PackageManifest contract + ZIP allowlist (manifest + SQL only)
- Prisma: `SiteFeature`, `PackageInstallation`, `PackageMigration`
- Installer: install/activate/deactivate/export/import; update/uninstall library-only (no UI)
- Modules admin UI toggles + ZIP
- Partial runtime guards (layouts/actions/blocks uneven for Marketing APIs)

## Central limitation

Executable Module behavior requires: code in build + `MODULE_MANIFESTS` + profile include + deploy. ZIP of unknown id → `pending` only.

## Prioritized gaps (from audit)

| Priority | Gap |
|----------|-----|
| P0 | Middleware/API ignore SiteFeature; Marketing public ingress uneven; `/a` outside prefix |
| P1 | No executable hot-install (intentional); pending workflow; update/uninstall unused by UI |
| P2 | Extensions/themes unwired; no shipped package SQL; capability display-only; bundle exclusion unproven |
| P3 | No uninstall/purge UX; observability of migrations/pending |

## Bottom line

Production-usable as a **profile-bounded feature switch**. Not an app store. Largest risks: assuming deactivate equals edge route removal; treating ZIP import as installing running code.

Full path index and lifecycle detail: see chat archive / upgrade plan baselines.
