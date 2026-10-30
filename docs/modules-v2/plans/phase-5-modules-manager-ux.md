# Phase 5 — Modules Manager operator UX

**Status:** Complete  
**Parent:** [executive-application-platform-implementation-plan.md](./executive-application-platform-implementation-plan.md) Phase 5  
**Locks:** [phase-0-decisions-freeze.md](./phase-0-decisions-freeze.md)  
**Prior:** [phase-2-state-transitions.md](./phase-2-state-transitions.md) · [phase-3-settings-and-permissions.md](./phase-3-settings-and-permissions.md) · [phase-4-integration-matrix.md](./phase-4-integration-matrix.md)

## Objective

Make `/admin/modules` safe and comprehensible: preflight before mutations, visible blockers/compat/migrations, honest deactivate vs Remove vs purge-unavailable, settings links, audit + recovery — without Option B or profile-generate-as-toggle.

## Ledger statuses (unchanged)

`installed` · `active` · `inactive` · `pending`

## Card overlays (computed, not new statuses)

| Overlay | When |
|---------|------|
| Profile omitted | Builtin not in compiled profile |
| Pending / awaiting deployment | `status === pending` |
| Incompatible | Package `azuraCompatibility` fails vs `AZURA_CORE_VERSION` |
| Blocked by deps | Activate would fail `inactiveRequiredPackages` |
| Blocked by dependents | Deactivate would fail `blockingDependents` |
| Migrations pending | Ship-time up files exist that are not in ledger (or checksum mismatch risk surfaced as warning) |
| Theme ready / applied | Existing theme lifecycle |
| Extension open / closed | Existing overlay lifecycle |

## Preflight result shape

```ts
type PackagePreflightResult = {
  ok: boolean; // false if any blocker
  operation: "activate" | "deactivate" | "update" | "applyTheme" | "openExtension";
  packageId: string;
  blockers: { code: string; message: string; recoveryHint?: string }[];
  warnings: { code: string; message: string; recoveryHint?: string }[];
  migrations: { appliedUps: number; pendingUpFilenames: string[] };
  profileNotes: string[]; // e.g. edit YAML → profile:generate → redeploy
  recoveryHints: string[];
};
```

No writes. Same checks as installer asserts where applicable.

## Controls honesty

| Control | Effect |
|---------|--------|
| Enable off / soft Uninstall (builtin) | Deactivate + keep ledger — **same data effect** |
| Soft uninstall pending | Delete ledger only |
| Typed Remove | May run down SQL (non-builtin); refuse builtins |
| Purge | **Not available** in Modules Manager (deferred) |

## Executive Phase 5 mapping

| Ask | Disposition |
|-----|-------------|
| Show included/active/pending/incompatible/blocked | **Done** (overlays on `ModuleScreenRow` + card badges) |
| Preflight before activate/update | **Done** (`package-preflight` + confirm UI) |
| Explain required profile changes | **Done** (banner / omitted / preflight notes) |
| Migration / failure status | **Done** (migration summary + lastFailureHint + recovery copy) |
| Separate deactivate / soft uninstall / purge | Soft/Remove clear; purge **deferred** + labeled unavailable |
| Settings links | **Done** (all four Modules register `adminPath`) |
| Audit + recovery | **Done** (`auditPackageLifecycle` + recovery hints) |
| Profile generate not runtime toggle | **Done** (preserved) |

## Non-goals

- CMS content purge product
- Profile generate button on Modules
- ACL / contribution / ingress redesign
- Option B / marketplace

## Implementation status

| Slice | Status | Evidence |
|-------|--------|----------|
| P5.1 | **Done** | This file (operator UX contract) |
| P5.2 | **Done** | `module-screen-types.ts` / `module-screen.ts` overlays |
| P5.3 | **Done** | `package-preflight.ts`, `runPackagePreflight`, confirm dialogs |
| P5.4 | **Done** | Card badges, soft-uninstall/purge copy, profile guidance |
| P5.5 | **Done** | `advanced-seo/settings.ts` + four `settingsHref` |
| P5.6 | **Done** | `package-lifecycle-audit.ts` + failure recovery hints |
| P5.7 | **Done** | `06`, gap matrix, azura-v2 manager permissions wording |
| P5.8 | **Done** | This exit artifact + README/executive → Phase 6 |

## Exit gate evidence

| Gate | Evidence |
|------|----------|
| No ZIP-executes-code implication | Existing Option A+C copy retained; pending messaging unchanged |
| Required deploy/profile steps visible | Profile banner + omitted guidance + preflight `profileNotes` |
| No accidental retained-data wipe | Soft Uninstall = enable-off; purge labeled unavailable; typed Remove only destructive ledger path |
| Contract/UI tests | `npm run test:modules-lifecycle` (includes `package-preflight.test.ts`) |

**Exit gate:** Operators complete lifecycle without ZIP-executes-code claims, without hidden deploy steps, without accidental data wipe; tests pin contracts.

## Next

Phase 6 — Measure deployment boundaries and release evidence. Do not reopen Phase 1–5 contracts.
