# Security boundaries

## 1. No arbitrary code execution from ZIP

Hard rule of Option A + C:

- Package ZIP allowlist rejects executable source/binaries outside approved theme assets.
- Import cannot register new App Router handlers or server actions.
- Pending status exists specifically so unknown ids cannot be activated as if code were present.
- **ZIP SQL is not applied** for unknown/pending apps — only ship-time filesystem migrations under `src/modules/<id>/migrations` run for builtins.
- App/extension import caps: compressed ≤ 8 MiB, ≤ 64 entries (`package-zip-limits.ts`). Theme packages use separate theme asset limits (higher binary budget).

## 2. Admin authentication vs Module `permissions`

| Mechanism | Role |
|-----------|------|
| `requireAdmin` / `requireAdminSection(...)` | Coarse dashboard shell ACL (sections) |
| `requireModulePermission(id, read\|manage)` | Phase 3 Module ACL — registered `{id}.read` / `{id}.manage` |
| Manifest `permissions: string[]` | Must match registered keys for builtins; enforced via `requireModulePermission` |
| Capability ids | Profile ceiling / display — **not** Modules Manager ACL |

Compose section ∩ Module permission ∩ Phase 1 ingress. Never rely on hidden navigation or client checks as authorization. Full contract: [plans/phase-3-settings-and-permissions.md](./plans/phase-3-settings-and-permissions.md).

## 2b. Module settings secrets

- Registry `secretKeys` are redacted on export (`[redacted]`).
- Import/update refuses clearing secrets unless `replaceSecrets: true`.
- Audit events record key names / actor — never secret payloads.
- Deactivate retains `ModuleSetting` rows (reset is separate).

## 3. Fail-open vs fail-closed

| Path | Policy |
|------|--------|
| Availability UI / saved blocks (`isModuleActive`) | Fail-**open** on ledger outage |
| Mutation ingress (`resolveModuleIngressAccess`) | Fail-**closed** on ledger outage |
| Profile-disabled middleware prefixes | 404 when profile generated |

Authors of Module APIs must use the fail-closed path for writes, OAuth, webhooks, cookies, and jobs.

## 4. Edge boundary

Middleware/proxy must not become a Prisma SiteFeature client without an explicit, proven design. Runtime-inactive enforcement belongs in Node handlers.

## 5. Theme / CSS policy

Package-applied `customCss` is validated (size limits, postcss walk, escape detection, URL allow rules). That guarantee applies to the **package apply** path. Theme Studio saves may have different sanitization until unified.

SVG theme assets with external references are rejected.

## 6. Destructive operations

- Builtin Modules cannot be Remove’d from Modules Manager (`destructive: true` refused before down SQL).
- Soft uninstall of builtins deactivates and retains data.
- System-section auth required for ZIP / update / uninstall / remove actions.

## 7. Compatibility gate

ZIP import checks `azuraCompatibility` against `AZURA_CORE_VERSION`. Incompatible packages are rejected.

## 8. Trust model summary

| Actor | Trust assumption |
|-------|------------------|
| Deployment Profile + CI/CD | Controls which Module code exists in a build |
| Site admin with system section | May import declarative packages and toggle included Modules |
| Anonymous public | Hits only public routes/APIs; Module ingress must still validate when inactive |
| Uploaded ZIP | Untrusted executable; trusted only as validated declarative payload |

## 9. Signing / distribution zones (Phase 8)

| Zone | Requirement |
|------|-------------|
| Same-trust-zone ops transfer (ops-controlled copy between environments the operator already trusts) | Existing ZIP allowlist, size caps, and `azuraCompatibility` checks are **sufficient**. Unsigned declarative ZIPs remain valid. |
| External / third-party / marketplace distribution | **Signatures + provenance required** before product. Documented stance only in Phase 8 — **no** crypto libraries or signing UI shipped. |

Marketplace / catalogue remains deferred until that RFC lands. See [plans/phase-8-operational-maturity-release-policy.md](./plans/phase-8-operational-maturity-release-policy.md).
