# Phase 3 — Honest Modules ZIP / Pending UI (applied)

**Mode:** Implementation (operator copy + UX).

## Objective

Option A + C honesty in Modules Manager: ZIP never claims executable load; unknown ids are pending until deploy includes code + registry.

## Key modules

- `src/platform/packages/package-ui-copy.ts`  
- Modules screen pending section and import result messages  

## Acceptance

- Import pending message: cannot activate from ZIP alone  
- Export labeled as metadata + SQL, not full app backup  
- No update/uninstall/purge controls  

**Next:** Phase 4 PackageManifest validation hardening.
