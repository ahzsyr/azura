# R3 — Follow-on decision gates

**Status:** Locked — deferred / out of scope / not-now until listed triggers  
**Parent:** [current-code-audit-and-remaining-work.md](./current-code-audit-and-remaining-work.md) §R3  
**Baseline:** Modules Option A + C platform (Phases 0–8 recorded; R0–R2 verification/publish). These follow-ons are **not** blockers to that baseline unless a product decision changes scope.

## Purpose

After the platform baseline, product and architecture follow-ons must not start as “the next phase” of Phases 0–8. Each row below requires a **separate RFC or Fitness review** that meets its trigger before implementation PRs claim the work in-scope.

## Gate table

| Follow-on | Decision | Trigger to start | Authority |
|-----------|----------|------------------|-----------|
| Advanced SEO physical relocation | **Deferred** | New RFC proves route/data parity, no Core callers, and removal/replacement of import exceptions | [phase-7-extraction-advanced-seo.md](./phase-7-extraction-advanced-seo.md) |
| Third-party signing/provenance and marketplace | **Deferred** | Trust model, signing implementation, support operations, and product approval | [phase-8-operational-maturity-release-policy.md](./phase-8-operational-maturity-release-policy.md) P8.3 / P8.7; [phase-0-decisions-freeze.md](./phase-0-decisions-freeze.md) §9 |
| CMS/domain data purge | **Deferred** | Retention/export policy, authorization, auditability, backup/restore, and recovery design | Freeze §4; Phase 5/8 “purge unavailable”; [06-modules-manager-admin.md](../06-modules-manager-admin.md) |
| Remote update channels / universal rollback (Class D) | **Out of current scope** | Product and migration-safety RFC; down SQL alone is not sufficient | Phase 8 channel + Class D; [05-lifecycle-and-installer.md](../05-lifecycle-and-installer.md) §9 |
| Catalog, translation, booking Modules | **Not now** | Fitness review demonstrates cohesive runtime ownership beyond schemas/blocks | [phase-7-candidate-dispositions.md](./phase-7-candidate-dispositions.md) |
| Generic Module event bus | **Deferred** | Concrete cross-Module use case and bounded contract | [phase-4-integration-matrix.md](./phase-4-integration-matrix.md); Module-private buses remain OK |

## Acceptance (process)

- No Modules platform PR may claim any row above as in-scope without a linked RFC/Fitness that meets the trigger.
- The A + C platform baseline remains **unblocked** by these items.
- Soft “Next” / “Phase 9” wording elsewhere must point here — not imply automatic continuation of the executive sequence.

## Homonyms (do not confuse with Modules marketplace / signing)

| Surface | What it is | What it is not |
|---------|------------|----------------|
| Forms / schema-ui “marketplace” | Template / schema catalogue UI | Modules package marketplace or remote catalogue |
| Theme provenance stamps | Apply-source metadata on SiteTheme | Cryptographic package signing |
| Module-private event buses (e.g. Marketing) | In-Module pub/sub | Cross-Module generic plugin/event bus |

## Non-actions under R3

Do not implement signing crypto, marketplace catalogue APIs, CMS purge product, remote update feeds, Class D universal rollback, new Module manifests for catalog/translation/booking, Advanced SEO directory moves, or a cross-Module event bus under this gate page alone.

## Related

- Audit remaining work: [current-code-audit-and-remaining-work.md](./current-code-audit-and-remaining-work.md)
- Executive closeout: [executive-application-platform-implementation-plan.md](./executive-application-platform-implementation-plan.md) §7
- R1 / Phase 6 twin Complete (finished inconclusive) is **already recorded** — it is not an R3 follow-on
