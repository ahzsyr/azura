# Extensibility Clean Restart — Phase 0 Baseline

**Mode:** Read-only.  
**Outcome:** Confirmed Modules Manager = Deployment Profile ceiling + SiteFeature/package runtime switches for three in-repo Modules; ZIP is metadata/SQL only.

Key facts captured for later phases:

- `src/generated/deployment-profile.json` from `AZURA_PROFILE` + YAML  
- `MODULE_MANIFESTS` static registry  
- Installer statuses: installed / active / inactive / pending  
- Middleware profile-only; SiteFeature not at edge  
- Docs/UI risk of overclaiming “install apps” as hot-plug  

See also: [../audits/01-existing-system-audit.md](../audits/01-existing-system-audit.md)
