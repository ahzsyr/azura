# Phase 8 — Capabilities and Dependencies Clarity (read-only)

## Expansion rules (`expandFeatureToggles`)

- Enable Module → force included `requiredPresets` on  
- Disable required preset (Module not also requested on) → force dependent Modules off  
- Same-request Module-on + required-preset-off → preset forced on  

## requiredCapabilities

- Validated at **profile:generate** for enabled modules  
- Modules screen **read-only**  
- **Not** checked at `activatePackage`  
- Pass through unchanged in `getEffectiveAvailabilityProfile().capabilities`  

## requiredPackages

- Activate requires deps status `active`  
- Deactivate refused if active dependents list the package  
- Shipped Modules currently all `requiredPackages: []`  
- Self-edge rejected; multi-node cycles soft (install order dump) — no hard cycle detector  

## Data retention

- Deactivate = flags only; no SQL down; no content delete  
- Reactivate re-applies SQL up; prior CMS/entity/block data remains  
- Destructive purge only via uninstall(destructive) — not Modules UI  

## Forbidden operator claims

Do not say: toggle capabilities; deactivate deletes content; ZIP loads executable code; uninstall from Modules UI; activate checks capabilities; cycles are refused; omit removes capabilities from profile; pending can activate; permissions are ACL; profile proves bundle exclusion.

**Next:** Phase 9 release roadmap.
