# Phase 4 — PackageManifest Validation Hardening (applied)

**Mode:** Implementation.

## Objective

Harden package ZIP/manifest validation so contracts fail loudly on bad metadata; preserve no-executable ZIP allowlist.

## Focus

- `src/platform/packages/manifest.ts` validation  
- Contract tests in `src/platform/packages/__tests__/`  
- Field semantics: requiredPackages / requiredPresets / requiredCapabilities / permissions (descriptive) / contributions  

**Next:** Phase 5 contributions inventory.
