# Phase 2 — Package state transitions and failure recovery

**Parent:** [executive-application-platform-implementation-plan.md](./executive-application-platform-implementation-plan.md) Phase 2  
**Locks:** [phase-0-decisions-freeze.md](./phase-0-decisions-freeze.md)  
**Ops summary:** [../05-lifecycle-and-installer.md](../05-lifecycle-and-installer.md)

## Vocabulary (operations)

| Operation | Meaning |
|-----------|---------|
| Activate / Apply | Serving or applied (`active`) |
| Deactivate | Off; data retained; **no** down SQL for apps |
| Soft uninstall | Builtin → deactivate + keep ledger; pending/non-builtin soft → delete ledger only |
| Remove (typed) | Non-builtin destructive: may run allowlisted **down** SQL then delete ledger. Builtins **refused**. |
| Purge | CMS/content wipe — **deferred / not-started** (not a Modules Manager control) |
| Update | Builtin included: re-apply ship-time **up** SQL / version bump |

Statuses: `installed` · `active` · `inactive` · `pending`

---

## 1. Builtin app (`kind: app`, in `MODULE_MANIFESTS`)

| From | Operation | Success to | Notes |
|------|-----------|------------|-------|
| (none) | install | `installed` / then often activate | Profile-included only |
| `installed` / `inactive` | activate | `active` | Deps → ensure row → up SQL → SiteFeature on |
| `active` | activate | `active` | Idempotent |
| `active` | deactivate | `inactive` | Blocked by active dependents; no down SQL |
| `inactive` | deactivate | `inactive` | Idempotent |
| any non-pending | update | same status | Up SQL + version; refuse omitted/ungenerated/pending |
| `active` / `inactive` | soft uninstall | `inactive` (+ row kept) | = deactivate for included builtin |
| any | Remove destructive | **refused** | Omit from profile + redeploy to drop product surface |

### Failure recovery (builtin app)

| Failure | Ledger / flags | Operator recovery |
|---------|----------------|-------------------|
| Deps inactive | unchanged | Enable required packages first |
| Up SQL fails mid-file | Prior checksummed ups may remain; status **not** `active` | Fix SQL/DB; re-activate (checksum skip for applied files) |
| Up SQL ok, SiteFeature fails | Schema may be ahead; status **must not** be `active` | Fix SiteFeature/deps/presets; re-activate |
| SiteFeature ok, finalize write fails | Prefer status already synced `active` via `planPackageStatusSync`; repair row if missing | Re-run activate |
| Dependents block deactivate | unchanged `active` | Disable dependents first |

---

## 2. Pending app (unknown id / no builtin code)

| From | Operation | Success to | Notes |
|------|-----------|------------|-------|
| (none) | ZIP import | `pending` | Metadata (+ optional SQL **not applied**) |
| `pending` | activate | **refused** | Awaiting deploy with code + registry |
| `pending` | soft uninstall / Remove | (row deleted) | Soft = ledger clear; Remove may attempt down SQL if files exist (usually none) |

---

## 3. Theme (`kind: theme`, token package)

| From | Operation | Success to | Notes |
|------|-----------|------------|-------|
| (none) | ZIP import | `installed` or `pending` | Tokens required for installed |
| `installed` / `inactive` | Apply (activate) | `active` | Merge onto published SiteTheme; refuse dirty draft |
| `active` | Deactivate | `inactive` | Clears applied-source provenance; **live look stays** |
| any | soft uninstall / Remove | row deleted (non-builtin) | Remove may run down SQL if present (themes typically have none) |

---

## 4. Extension (`kind: extension`)

| From | Operation | Success to | Operator speech |
|------|-----------|------------|-----------------|
| (none) | ZIP import | `installed` | Inert |
| `installed` / `inactive` | Open (activate) | `active` | Open overlay |
| `active` | Close (deactivate) | `inactive` | Close overlay — hides listed admin nav/blocks |
| any | Remove | row deleted | Unarms overlay |

---

## 5. Explicit non-equivalences

- **Deactivate ≠ Remove ≠ Purge**
- **Soft uninstall (builtin) ≠ Remove**
- **ZIP import ≠ executable install**
- **Update ≠ rollback**; rollback only via documented down on non-builtin Remove (constrained), never via deactivate

## 6. Implementation status (Phase 2)

| Slice | Topic | Status | Evidence |
|-------|-------|--------|----------|
| P2.1 | This spec | **Done** | This file + `05-lifecycle-and-installer.md` pointer |
| P2.2 | App activate coherence | **Done** | `activatePackage` ensure row → up → SiteFeature; failure forces non-active; `installer-screen-contract` pins |
| P2.3 | Migration down/checksum | **Done** | `package-migrations.ts` up-ledger gate + up-row delete; checksum refuse; `package-migrations.test.ts` |
| P2.4 | UI copy honesty | **Done** | `removePackageConfirmBody` warns down SQL; pending soft vs Remove distinguished |
| P2.5 | Theme Apply/Deactivate | **Done** | `theme-*` lifecycle states; Apply/Deactivate controls; `clearThemePackageProvenance` |
| P2.6 | ZIP caps + SQL non-apply | **Done** | `package-zip-limits.ts`; import pass-1; `10-security-boundaries.md` |
| P2.7 | Dependency errors | **Done** | `formatModuleActionError` deps + checksum; capabilities documented as display-only in `05` |

**Exit gate:** State-transition table present; UI copy matches Remove/soft-uninstall; failed activate cannot leave ambiguous `active`; contract tests pin the above.
