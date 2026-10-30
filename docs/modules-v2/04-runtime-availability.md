# Runtime availability — SiteFeature and ingress

## 1. Two-layer model

```text
Deployment Profile (compiled JSON, build-time)
  isModuleEnabled / isPresetEnabled / isCapabilityEnabled
        │ AND
SiteFeature rows (installation DB, runtime)
  isModuleActive / isPresetActive
```

| Question | Answered by |
|----------|-------------|
| Can this build ever run Documentation? | Deployment Profile |
| Is Documentation on for this site right now? | `SiteFeature` + package status |
| Does turning Documentation off delete its pages? | No — flags only; data and block JSON stay |

Implementation: `src/config/deployment-profile/site-features.ts`.

## 2. Seeding

On read, `readAndSeed`:

- Considers only profile-included module and preset ids.
- Inserts missing rows with `enabled: true`.
- Ignores omitted ids (no SiteFeature row required for them).

Package seed (`ensureBuiltinPackages`) runs best-effort before SiteFeature load so ledger rows exist for included builtins.

## 3. Availability reads (fail-open)

### `isModuleActive(moduleId)` / `isPresetActive(presetId)`

1. Return false if profile omits the id.
2. If profile is ungenerated → true.
3. If SiteFeature ledger read fails → **true** (fail-open).
4. Else return the row’s `enabled` flag.

**Why fail-open:** admin UI and saved builder blocks should not blank out solely because the ledger is temporarily unreadable.

### `getEffectiveAvailabilityProfile()`

Returns profile modules/presets with disabled SiteFeature rows removed. Capabilities stay as on the profile. Used for public builder / block availability. Fail-open on ledger outage → full profile lists.

### `getAdminBuilderAvailabilityProfile()`

Same as effective profile, plus M7.1 `overlayLockedBlockTypes` for armed-closed extension overlays. **Admin builder only** — public render must use `getEffectiveAvailabilityProfile()`.

## 4. Mutation ingress (fail-closed)

### `resolveModuleIngressAccess(moduleId)`

Returns one of:

| Result | Meaning |
|--------|---------|
| `active` | Profile includes + SiteFeature enabled (or ungenerated profile) |
| `profile_omitted` | Not in compiled modules |
| `runtime_inactive` | Included but SiteFeature disabled |
| `ledger_unavailable` | SiteFeature map could not be loaded |

Distinct from `isModuleActive` on purpose: mutation-capable Node handlers must not write when the ledger is down.

### Module-specific decision helpers

Examples:

- Marketing: `src/modules/marketing/ingress-decision.ts` (+ env kill switches).
- Advanced SEO: `src/modules/advanced-seo/ingress-decision.ts`.

Pattern: map ingress access (+ optional env flags) → allow / deny before DB/cookie/token side effects.

## 5. Writes — `updateSiteFeatures`

Rules enforced in `site-features.ts` + `lifecycle.ts` + `site-feature-changes.ts`:

1. Reject changes for ids not in the generated profile.
2. Expand toggles for Module ↔ required preset cascade (`expandFeatureToggles`).
3. Assert enabled Modules keep their required presets.
4. Assert package dependency graph (`inactiveRequiredPackages`, `blockingDependents` / `blockingEnabledModuleDependents`).
5. Persist SiteFeature rows and sync `PackageInstallation.status` to `active`/`inactive` in the same transaction (`planPackageStatusSync`). Pending rows are left alone.

### Modules Manager toggle path

`setSiteFeatureEnabled` (`module-screen-actions.ts`):

- Module enable → `activatePackage(id)` (re-runs allowlisted **up** SQL; asserts dependencies).
- Module disable → `deactivatePackage(id)` (SiteFeature + status; **no** SQL down).
- Preset enable/disable → `updateSiteFeatures` only.

## 6. Edge / middleware boundary

Middleware / proxy use **profile disabled prefixes only**. They do **not** query Prisma for SiteFeature.

Consequences:

- Runtime-inactive Modules may still hit App Router entrypoints until Node guards refuse.
- Correct Module authors must guard layouts, server actions, and API routes in Node.
- Do not move SiteFeature checks into Edge without a separately proven design.

## 7. Builder / blocks

| State | Behavior |
|-------|----------|
| Module inactive / omitted | Contributed block types unavailable in picker; `isBlockTypeEnabled` false |
| Saved page with contributed block | Block JSON retained; render path shows unavailable / empty per Module resolver |
| Extension overlay closed | Admin builder locks listed block types; public render unchanged |

## 8. Quick reference — which API to call

| Need | Call |
|------|------|
| Show/hide admin chrome safely during outage | `isModuleActive` |
| Refuse mutations / ingress side effects | `resolveModuleIngressAccess` (+ Module decide helper) |
| Builder public availability | `getEffectiveAvailabilityProfile` |
| Builder admin picker + overlays | `getAdminBuilderAvailabilityProfile` |
| Profile ceiling only | `isModuleEnabled` |
