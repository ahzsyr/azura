# Modules v2 — current code audit and remaining work

**Audit date:** 2026-10-30 (Asia/Dubai)  
**Scope:** `docs/modules-v2` study and Phase 0–8 plans, checked against the current working tree.  
**Mode:** Read-only source and documentation inspection; no tests, builds, generators, or code edits were run.  
**Status basis:** Working-tree presence is not equivalent to committed, released, or production-verified behavior.

## Executive result

The current working tree contains a broad implementation of the Option A + C platform described by the study: four registered built-in Modules; profile and runtime gates; fail-closed mutation ingress; package lifecycle and migration handling; settings and Module permissions; contribution validation and consumers; theme and extension package flows; Modules Manager preflight and recovery copy; and profile/support inventories.

The plan set is useful and unusually explicit about security boundaries and non-goals, but it is not yet a reliable single “all complete” report. Phase 1–5 and Phase 7–8 are documented as implemented with source/test evidence, while Phase 6’s bundle lane is explicitly blocked. Several Phase 8 / executive summaries compress that distinction into “complete” or “exit recorded.” A test file or script being present is evidence of intended coverage, not evidence that it passed in this audit.

**Audit verdict:** Platform implementation is **present in the working tree; release status is unverified**. No new mandatory platform feature is justified by this inspection. The immediate remaining work is to reconcile status documentation, run the prescribed verification in a durable project Node environment, and record a reviewable release baseline. Physical Advanced SEO relocation and other deferred product work should remain separate RFCs.

## Scope and evidence limits

- Inspected the current study/reference files, plans, inventories, package scripts, source maps, and relevant source-file presence under `src/modules`, `src/platform/packages`, `src/config/deployment-profile`, and `scripts/platform`.
- The repository has extensive pre-existing modified and untracked paths, including the platform implementation and many unrelated application changes. This audit did not stage, reset, or classify every unrelated application diff.
- The checkout’s `docs/modules-v2` and most platform implementation are untracked or modified in the visible Git status. Do not call them shipped based on this audit.
- Commands in plan exit gates were not executed here. Status labels below distinguish documented evidence from independently rerun verification.
- The generated Phase 6 gating evidence artifact reports `ok: true`; its separate bundle summary reports `status: blocked`, `verdict: blocked`, `blockReason: ephemeral-runtime`, and no bundle buckets. This is direct artifact evidence, not a fresh run.

## Audit by workstream

| Workstream | Current code / artifact finding | Audit status | Remaining work |
|---|---|---|---|
| Architecture and registry | Four built-in manifests are mapped in the study/source map; the platform remains build-time distributed plus declarative imports. | Present; unverified as a release | Preserve the A + C boundary and commit/review the intended baseline before making shipped claims. |
| Profile ceiling and ingress | Profile generator, route registry, SiteFeature helpers, extra Marketing `/a` binding, and Module ingress decision/guard files are present. The Phase 1 matrix describes active, inactive, omitted, and ledger-unavailable cases. | Present; documented test evidence, not rerun | Run the profile, ingress, and guard suites in the project toolchain and retain their results with the release baseline. |
| Package lifecycle and migrations | Installer, lifecycle helpers, preflight, migration, ZIP limits, recovery, and package audit files are present. Phase 2 defines deactivate, soft uninstall, remove, and unsupported purge separately. | Present; documented test evidence, not rerun | Verify transaction/failure paths and operator copy using prescribed suites; do not expand destructive/purge behavior without a separate decision. |
| Settings and permissions | Module permission registry, grants, ModuleSetting model/migration, per-Module settings schemas, and guard/test files are present. Phase 3 specifies null/empty/explicit grant semantics and secret redaction. | Present; documented test evidence, not rerun | Run auth/permission/settings suites and check migrations against supported deployment profiles before release. |
| Integrations and contributions | Contribution inventory/owner maps, overlay resolution, theme package pipeline, and boundary checker are present. Phase 4 removes unsupported contribution claims and documents bridge exceptions. | Present; documented test evidence, not rerun | Run package contract, theme, contribution, and import-boundary checks. Keep SEO/Google credential bridges visible until their follow-on ownership work is approved. |
| Modules Manager | Screen model/UI, preflight, lifecycle audit, recovery hints, and package copy are present; Phase 5 documents the operator status overlays and settings links. | Present; documented test evidence, not rerun | Verify screen/action contract suites and ensure the UI continues to distinguish profile omission, inactive, pending, and incompatible states. |
| Profile boundary evidence | `profile-gating-evidence.json` currently says `ok: true` for enterprise and the Marketing-omitted twin. The bundle summary is still blocked on an ephemeral Node runtime and contains no finished build buckets. | Gating evidence recorded; bundle evidence blocked | Run the matched Hostinger builds/scans with a durable supported Node/SWC toolchain. Report a completed inconclusive result as inconclusive; do not infer bundle exclusion. |
| Advanced SEO ownership | Manifest/guard/inventory and static pins are present. The RFC explicitly keeps Advanced UI/service implementation partly in `features/seo` and `features/search-intelligence`. | Logical ownership clarification complete; physical move deferred | No source move is required for this roadmap exit. A future move needs a new RFC, route/data parity, no Core callers, and cleared import exceptions. |
| Operational policy | Compatibility/profile inventories, support diagnostics, retention/export wording, rollback classes, and marketplace deferral are documented. | Policy artifacts present; verify implementation outputs | Re-run inventory/diagnostic checks and confirm the operator docs match the shipped build. Signing, marketplace, purge, remote update feeds, and universal rollback are explicitly deferred/out of scope. |

## Documentation findings to reconcile

1. **Phase 6 status conflict.** [phase-6-boundary-evidence.md](./phase-6-boundary-evidence.md) says “Blocked (instrument-ready)” and the checked-in bundle summary says `blocked`; the executive plan says “exit recorded.” These can coexist only if “exit” means a docs-only decision, not completion of matched-profile evidence. State that directly in the executive closeout and README.
2. **Phase 6 artifact changed state over time.** The gating pack is green (`ok: true`), but the older blocked summary embeds false gating flags because its bundle-measure run stopped before those asserts. Treat the standalone gating artifact as current gating evidence and the summary as blocked bundle evidence; do not describe both lanes as blocked.
3. **Gap matrix stale/ambiguous.** [11-capability-gap-matrix.md](../11-capability-gap-matrix.md) describes the twin baseline as still needing durable Node, but does not separate the already-green gating lane from the blocked bundle lane. It should use the dual-lane status and avoid suggesting release readiness depends on a bundle-exclusion gate, which is explicitly disabled.
4. **Baseline register is historical to HEAD/working-tree snapshot.** [phase-0-baseline-register.md](./phase-0-baseline-register.md) and [phase-0-working-tree-disposition.md](./phase-0-working-tree-disposition.md) are dated/snapshot-based. Their acceptance decision remains useful, but their counts and “present-but-unverified” labels must not be mistaken for the current Git state or a clean/released baseline.
5. **“Complete” labels need qualification.** Phase 1/3–5 and 7–8 plans cite tests and implementation evidence; this audit did not rerun those commands. Phase status should mean “implementation/report recorded,” with a separate current verification and release status.

## Remaining work plan

### R0 — Reconcile the report (documentation only)

1. Update the executive plan’s Phase 6 closeout to say: **profile-gating lane recorded green; bundle lane blocked; docs-only release-gate decision recorded**.
2. Update the capability gap matrix to describe both lanes separately and link to the Phase 6 evidence artifacts.
3. Add this audit to the Modules v2 README plan index and label its verdict as a working-tree audit, not a release certification.
4. Keep the Phase 0 snapshot counts as historical; add a current date/status note only if a new inventory is actually performed.

**Acceptance:** No page claims full Phase 6 measurement completion; no page implies profile gating proves bundle exclusion; “complete” phase labels are understood as recorded implementation evidence rather than fresh verification.

### R1 — Run the existing verification gates (no new feature work)

Use the project’s durable Node 24 toolchain and run the already-defined checks in dependency order:

1. `npm run preflight:measure-toolchain` and verify the same durable executable can load the installed Next SWC package.
2. `npm run profiles:verify` and `npm run test:profile-source-integrity`.
3. Module ingress/lifecycle/contract coverage: `npm run test:marketing-ingress`, `npm run test:portal-module-ingress`, `npm run test:advanced-seo`, `npm run test:modules-lifecycle`, `npm run test:package-contract`, `npm run test:phase4-integration`, `npm run test:phase6-boundary`.
4. Contribution/theme coverage: `npm run test:theme-packages`, `npm run test:theme-assets`, `npm run test:theme-rich-fields`, `npm run test:contribution-overlays`, then `npm run check:module-import-boundaries`.
5. Regenerate/check profile matrix and support diagnostics using documented scripts, then run `npm run measure:profile-boundary` with the same durable runtime.

**Acceptance:** Record exact commands, runtime/toolchain, pass/fail results, and generated artifact hashes. Fix only failures attributable to the Modules platform; report unrelated failures separately. A completed bundle scan may remain inconclusive and still satisfy the Phase 6 process gate.

### R2 — Review and publish a clean platform baseline

1. Separate platform-relevant changes from the broad unrelated dirty tree using the Phase 0 classification as a starting point.
2. Review the source, migrations, profile YAML/generated profile, scripts, tests, and documentation together. Confirm generated files correspond to checked-in inputs.
3. Obtain normal code review/CI for the platform baseline; do not equate an untracked working-tree implementation with a shipped release.

**Acceptance:** A reviewable commit/PR and CI evidence identify exactly which platform code and docs are included. This step is a release-process gate, not a request to commit the user’s unrelated changes.

### R3 — Keep follow-on product work gated by separate decisions

| Follow-on | Current decision | Trigger to start |
|---|---|---|
| Advanced SEO physical relocation | Deferred | New RFC proves route/data parity, no Core callers, and removal/replacement of import exceptions. |
| Third-party signing/provenance and marketplace | Deferred | Trust model, signing implementation, support operations, and product approval. |
| CMS/domain data purge | Deferred | Retention/export policy, authorization, auditability, backup/restore, and recovery design. |
| Remote update channels / universal rollback | Out of current scope | Product and migration-safety RFC; down SQL alone is not sufficient. |
| Catalog, translation, booking Modules | Not now | Fitness review demonstrates cohesive runtime ownership beyond schemas/blocks. |
| Generic Module event bus | Deferred | Concrete cross-Module use case and bounded contract. |

These are not blockers to the present A + C platform baseline unless a product decision changes scope.

## Recommendation

Treat the immediate deliverable as **documentation reconciliation + verification + reviewable baseline**, not another architecture phase. The code-level feature set described by Phases 1–5 and 7–8 is substantially represented in the working tree. The only explicitly blocked planned measurement is the Phase 6 matched-profile bundle lane. Keep the source-movement and product features listed under R3 deferred until their stated triggers are met.
