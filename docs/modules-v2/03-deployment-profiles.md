# Deployment Profiles — build-time ceiling

Modules Manager never rewrites the Deployment Profile. Profiles answer: **can this build ever run Module X?**

## 1. Inputs and outputs

| Piece | Path / variable |
|-------|-----------------|
| Profile YAML | `docs/profiles/*.yaml` (`agency`, `documentation`, `enterprise`, `marketing`, `showroom`, `tourism`, …) |
| Active profile | Env `AZURA_PROFILE` |
| Generator | `scripts/build/generate-deployment-profile.mjs` |
| Prebuild hook | `scripts/deploy/prebuild.mjs` |
| Compiled JSON | `src/generated/deployment-profile.json` |
| Loader | `src/config/deployment-profile/load-profile.ts` |
| Living doc | [`docs/deployment-profiles.md`](../deployment-profiles.md) |

## 2. What the compiled profile carries (Modules-relevant)

Typical Module-related fields on `CompiledDeploymentProfile`:

| Field | Use |
|-------|-----|
| `profileId` | Active profile name |
| `generated` | When `false`, runtime treats most gates as fail-open / UI read-only |
| `modules` | Included Module ids |
| `presets` | Included preset ids |
| `capabilities` | Included capability ids |
| `enabledNavItemIds` | Admin nav allowlist |
| `disabledAdminPrefixes` | Middleware 404 for omitted admin paths |
| `disabledPublicPrefixes` | Middleware 404 for omitted public path prefixes |
| `disabledPublicSegments` | First-segment public disables (preset-driven) |
| `disabledApiPrefixes` | Middleware 404 for omitted API prefixes |

## 3. How Module routes enter the compile

1. Generator reads Module route data derived from `MODULE_MANIFESTS` / registry (same prefixes as `MODULE_ROUTE_REGISTRY`).
2. For each Module **not** in the profile’s `modules` list, its admin / public / API prefixes are pushed onto the disabled lists.
3. Extra public bindings that are not in `publicRoutes` can be injected via `MODULE_EXTRA_DISABLED_PUBLIC` in the generator.

### Marketing short-link special case

Marketing’s manifest `publicRoutes` is `/api/marketing` only. The short-link handler lives at `GET /a` (`src/app/a/route.ts`). When `marketing` is profile-omitted, `/a` is added to `disabledPublicPrefixes` via `MODULE_EXTRA_DISABLED_PUBLIC`. Runtime-inactive Marketing relies on Node ingress, not that middleware list alone.

## 4. Runtime helpers (profile only)

From `load-profile.ts`:

| Helper | Behavior |
|--------|----------|
| `isModuleEnabled(id)` | Profile includes Module (or ungenerated → true) |
| `isPresetEnabled(id)` | Same for presets |
| `isCapabilityEnabled(id)` | Same for capabilities |
| `isAdminPathDisabled` / `isPublicPathDisabled` / `isApiPathDisabled` | Prefix / segment matching |
| `isAdminNavItemEnabled` | Nav id allowlist |

These helpers **do not** read `SiteFeature`. Runtime on/off is a separate layer ([04-runtime-availability.md](./04-runtime-availability.md)).

## 5. Ungenerated profile

When `generated === false`:

- Profile include checks tend to fail **open** (everything treated as included).
- Modules Manager shows a warning and disables writable toggles (`enableToggle: false`, rows not writable).
- Installer update/activate paths that require a generated profile refuse with a clear error.

## 6. What profile omission does *not* guarantee

- App Router files under `src/app` for omitted Modules still exist on disk.
- Client/server **bundle exclusion** of omitted Module code is **not** assumed proven unless measured. Current authority: [plans/phase-6-boundary-evidence.md](./plans/phase-6-boundary-evidence.md) (profile gating ≠ bundle evidence; exclusion CI gate = no). Historical M8 notes live under `docs/azura-v2/`.
- Turning a Module off at runtime does not rewrite `deployment-profile.json`.

## 7. Operator steps to add a Module to a build

1. Ensure Module exists in repo + `MODULE_MANIFESTS`.
2. Add Module id (and required presets/capabilities) to the target YAML under `docs/profiles/`.
3. Set `AZURA_PROFILE` and run profile generate / prebuild.
4. Deploy the new build.
5. Use Modules Manager to activate if not already seeded active.
