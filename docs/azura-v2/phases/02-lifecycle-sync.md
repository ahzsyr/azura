# Phase 2 — Lifecycle SiteFeature ↔ PackageInstallation (applied)

**Mode:** Implementation.

## Objective

Keep Module enablement and `PackageInstallation.status` aligned (`active` ↔ enabled, `inactive` ↔ disabled). Honor `requiredPackages` for activate/deactivate refusal. Never rewrite `pending` via SiteFeature sync.

## Key modules

- `src/platform/packages/lifecycle.ts` — blocking dependents, inactive required packages, planPackageStatusSync  
- `src/config/deployment-profile/site-features.ts` — expand + assert graph on update  
- `src/platform/packages/installer.ts` — activate/deactivate use same rules  

## Acceptance

- Enabling Module with unmet `requiredPackages` refuses  
- Disabling Module required by another **active** package refuses  
- Pending rows left alone by feature sync  

**Next:** Phase 3 ZIP / pending UI honesty.
