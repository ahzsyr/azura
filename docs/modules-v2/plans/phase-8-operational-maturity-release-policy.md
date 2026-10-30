# Phase 8 — Operational maturity and release policy

**Status:** Complete (exit recorded)  
**Parent:** [executive-application-platform-implementation-plan.md](./executive-application-platform-implementation-plan.md) Phase 8  
**Locks:** [phase-0-decisions-freeze.md](./phase-0-decisions-freeze.md) · [../10-security-boundaries.md](../10-security-boundaries.md)  
**Prior:** [phase-7-extraction-advanced-seo.md](./phase-7-extraction-advanced-seo.md)

## Objective

Support predictable long-term maintenance of Modules and declarative packages — with support claims that match Option A + C.

## Scope lock

| In scope | Out of scope |
|----------|--------------|
| Release / compatibility policy | Option B / executable ZIP |
| Profile×Module matrix | Marketplace / catalogue UI or APIs |
| Signing **stance** (docs) | Signing **implementation** / crypto UI |
| Update channel + rollback Classes A–D | Universal schema/content downgrade |
| Retention / export matrix | CMS purge product |
| Read-only support diagnostics script | Bundle-exclusion CI gate |

## Support-claims checklist

Support, release notes, and operator docs **must** say:

1. AZURA supports build-time-distributed Modules + declarative package imports — **not** WordPress-style uploaded executable plugins.  
2. ZIP import cannot add arbitrary routes, UI code, handlers, jobs, or server actions.  
3. `pending` = awaiting a compatible deployed build — not “code ready to run.”  
4. Deactivate / soft uninstall = turn off included behavior and **keep data** — not remove code or purge content.  
5. Update re-applies allowlisted ship-time **up** SQL; it is **not** rollback.  
6. External / marketplace distribution is **not** a trusted channel until signatures + provenance ship (see Trust stance).  
7. Profile omission ≠ proven client/server bundle exclusion (Phase 6).  

## Executive Phase 8 mapping

| Ask | Disposition |
|-----|-------------|
| Release/version compatibility policy | **Done** |
| Signing/provenance needs | **Done** (stance only) |
| Update channel + rollback | **Done** (Manual + Class A–D) |
| Migration observability | **Done** (ledger + diagnostics snapshot) |
| Support diagnostics | **Done** (script) |
| Retention/export policy | **Done** |
| Compatibility matrix across profiles | **Done** |
| Marketplace/catalogue | **Deferred** (decision record below) |

## Locked vocabulary

| Term | Meaning |
|------|---------|
| Update channel | **Manual / ship-time** only |
| Rollback Class A | Deactivate / soft uninstall (data kept) |
| Rollback Class B | Re-activate / re-Update (idempotent ups) |
| Rollback Class C | Typed Remove + optional down SQL (non-builtin) |
| Rollback Class D | **Not supported** — universal downgrade via down SQL |
| Same-trust-zone | Ops-controlled transfer; existing ZIP validation |
| External zone | Third-party / marketplace; signatures **required** before product |

## Compatibility baseline

- Runtime/import gate remains **`PackageManifest.azuraCompatibility` vs `AZURA_CORE_VERSION`** only (`src/platform/packages/manifest.ts`).  
- Manager overlays already surface incompatible packages; do not invent parallel version schemes.  
- Support window today: packages declaring `*` or `>=` a core version ≤ current `AZURA_CORE_VERSION` (`0.1.0`) are accepted on ZIP import; others are rejected.

## Profile × Module matrix (P8.2)

Inventory: [../inventories/profile-module-compatibility-matrix.json](../inventories/profile-module-compatibility-matrix.json)  
Generator: `node scripts/platform/inventory-profile-module-matrix.mjs` (`--write` / `--check`).

| Profile | Included shipped Modules |
|---------|--------------------------|
| agency | — |
| documentation | documentation |
| enterprise | documentation, status-page, marketing, advanced-seo |
| marketing | — |
| showroom | — |
| tourism | — |

Notes pinned in inventory:

- Advanced SEO: Basic SEO Core survives omit (manifest never claims `/admin/seo` root).  
- `requiredCapabilities` / `requiredPresets` are profile ceiling / display — **not** activate-enforced (Phase 0 / lifecycle lock).

## Trust / signing stance (P8.3)

| Zone | Requirement |
|------|-------------|
| Same-trust-zone ops transfer | Existing ZIP allowlist + size caps + `azuraCompatibility` are sufficient. Unsigned declarative ZIPs remain valid. |
| External / third-party / marketplace | **Signatures + provenance RFC required** before product. Out of Phase 8 implementation. |

No crypto libraries or signing UI in this phase. Canonical security copy: [../10-security-boundaries.md](../10-security-boundaries.md) §9.

## Update channel + rollback classes (P8.4)

**Channel today:** single channel = **Manual / ship-time**. Maintainer publish steps:

1. Ship Module code + allowlisted migrations under `src/modules/<id>/` in the repo.  
2. Deploy a build whose Deployment Profile includes the Module.  
3. Operator runs Modules Manager **Update** (re-applies allowlisted filesystem **up** SQL for included builtins).  

No beta/stable feed; no remote channel registry.

| Class | Operator action | What it recovers | Limit |
|-------|-----------------|------------------|-------|
| **A** | Deactivate / soft uninstall | Runtime off; data retained | Does not undo schema/content |
| **B** | Re-activate / re-Update | Idempotent ups / enable again | Checksum mismatch refuses |
| **C** | Typed Remove (+ optional down SQL) | Non-builtin ledger teardown | **Refused** for every builtin |
| **D** | — | — | **Not supported:** universal schema/content downgrade via down SQL alone |

**Update ≠ rollback.** See [../05-lifecycle-and-installer.md](../05-lifecycle-and-installer.md) §9.

## Retention / export matrix (P8.5)

| Operation | Ledger | ModuleSetting | Domain CMS / Module tables | Purge |
|-----------|--------|---------------|----------------------------|-------|
| Deactivate | `inactive` | Retained | Retained | Unavailable |
| Soft uninstall (builtin) | Kept (deactivated) | Retained | Retained | Unavailable |
| Soft uninstall (pending/non-builtin) | Row deleted | N/A | No purge claim | Unavailable |
| Remove (destructive) | Deleted after optional down SQL | N/A | Only what down SQL covers; **builtins refused** | Unavailable |
| Profile omit + redeploy | May remain | May remain | May remain | Unavailable |

Per shipped Module — what export exists today:

| Module | Settings export | Package ZIP | Domain CMS dump |
|--------|-----------------|-------------|-----------------|
| documentation | Yes (registry; secrets redacted) | Metadata + allowlisted SQL | **Not** in Package ZIP |
| status-page | Yes (registry; secrets redacted) | Metadata + allowlisted SQL | **Not** in Package ZIP |
| marketing | Yes (registry pilot; secrets redacted) | Metadata + allowlisted SQL | **Not** in Package ZIP |
| advanced-seo | Path-only settings href; registry present | Metadata + allowlisted SQL | **Not** in Package ZIP |

Package kinds: theme ZIP = tokens (+ refs), not binaries on export; extension ZIP = overlay manifest only; app ZIP = declarative payload only. Pointer: [../09-data-model.md](../09-data-model.md).

## Support diagnostics (P8.6)

Read-only snapshot (script-only; Manager “Copy support report” deferred):

```bash
node scripts/platform/export-package-support-diagnostics.mjs --all-builtins
node scripts/platform/export-package-support-diagnostics.mjs --package documentation
```

Shape helper: `src/platform/packages/package-support-diagnostics.ts` (unit-tested). Includes ledger status/version/kind, compatibility vs core, migration applied/pending counts, last lifecycle audit fail reason (redacted), profile id + `profileSourceHash` + module included flag, recovery hint. **Never** includes `ModuleSetting` secrets.

## Marketplace deferral decision record (P8.7)

**Decision:** No marketplace / catalogue UI or store APIs in Phase 8 (or earlier).

**Prerequisites before revisiting:**

1. Signing + provenance RFC implemented for external zone  
2. Support diagnostics in operator playbooks  
3. Profile×Module compatibility matrix maintained  
4. Rollback Classes A–D documented and reflected in Manager copy  
5. Retention/export matrix accepted by support  

**Lineage:** Phase 0 freeze (“no marketplace in Phases 1–7 without trust/RFC”); azura-v2 Phase 9 “M9 deferred” marketplace notes. Follow-on is a separate product RFC — not an automatic Phase 9 of this executive sequence.

## Implementation status

| Slice | Status | Evidence |
|-------|--------|----------|
| P8.1 Policy contract | **Done** | This file |
| P8.2 Profile matrix | **Done** | `inventory-profile-module-matrix.mjs` + inventories JSON |
| P8.3 Trust stance | **Done** | This § + `10-security-boundaries.md` §9 |
| P8.4 Update/rollback | **Done** | This § + `05-lifecycle-and-installer.md` §9 |
| P8.5 Retention/export | **Done** | This § + `09-data-model.md` pointer |
| P8.6 Diagnostics | **Done** | export script + shape tests |
| P8.7 Marketplace deferral | **Done** | This decision record |
| P8.8 Exit | **Done** | README / gap / executive close |

## Exit gate

1. Operators can diagnose package state and version incompatibility — **met** (Manager overlays + diagnostics script + matrix).  
2. Maintainers can publish compatible updates and recover within documented limits — **met** (Manual channel + Classes A–C; Class D explicit non-support).  
3. Support claims match the security boundary — **met** (checklist + no WordPress/plugin-host or signed-marketplace claims).  
4. Contract/docs pin the above — **met** (this file).

## Hard lines (unchanged)

- No Option B / executable ZIP  
- No marketplace UI or store APIs  
- No signing implementation  
- No purge product  
- No reopen Phases 1–7 contracts  
- No bundle-exclusion CI gate  
- No WordPress-equivalence support claims  

## Next

Executive Phases **0–8 complete**. Follow-ons are separate RFCs (signing implementation, marketplace, purge, Advanced SEO physical relocate, Phase 6 twin Complete).
