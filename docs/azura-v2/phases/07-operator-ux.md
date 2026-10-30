# Phase 7 — Operator UX Accuracy (applied)

**Mode:** Implementation within existing Modules UI only. No update/uninstall/purge.

## Deliverables landed

- `src/modules/module-screen-ui.ts` — lifecycle states and control availability  
- Modules screen uses labels: included-active, included-inactive, profile-omitted, pending, unavailable  
- Enable toggle only when profile-included + generated  
- Honest action errors for requiredPackages / dependents  
- a11y: `role="alert"` / `role="status"` / `aria-busy`  
- Tests: `src/modules/__tests__/module-screen-ui.test.ts`  

## Control → operation

| Control | Backend |
|---------|---------|
| Module toggle | activatePackage / deactivatePackage |
| Preset toggle | updateSiteFeatures |
| Import ZIP | importInstalledPackage |
| Export ZIP | exportInstalledPackage |

## Validation (at apply time)

- Focused tests: pass  
- ESLint on Phase 7 files: pass  
- Full `tsc`: pre-existing errors elsewhere; none in Phase 7 paths  

**Next:** Phase 8 capabilities clarity (read-only).
