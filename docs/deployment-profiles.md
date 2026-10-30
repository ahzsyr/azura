# AZURA Deployment Profiles

> **Constitution v1.0** · Part of [AZURA Architectural Constitution](./constitution.md)  
> **Vision:** [product-vision.md](./product-vision.md) · **Concepts:** [domain-model.md](./domain-model.md)

AZURA is a **composable platform**. A deployment profile is the build-time availability ceiling: it selects which Core Platform areas, Capabilities, Presets, and Modules a build includes. It is not a runtime installation setting.

An installation-wide `SiteFeature` flag may disable an included Module or Preset at runtime. It cannot enable a Module or Preset the compiled profile omitted. Profile loading still reads only compiled JSON; enablement lives in `SiteFeature` / `PackageInstallation`.

## Module route contract

Module admin routes, public routes, nav ids, contributed blocks, and dependency checks come from each Module manifest (`src/modules/*/manifest.ts`) through [`src/config/deployment-profile/route-registry.ts`](../src/config/deployment-profile/route-registry.ts). The profile generator loads that registry. It does not keep a second module route list.

`publicRoutes` is the single list for public page paths and API paths. A path that begins with `/api/` is an API prefix. Any other `publicRoutes` entry is a public prefix. Declare API routes in `publicRoutes`, not in a separate field.

A profile that enables a Module without its required presets or capabilities fails generation. Manifest `permissions` are descriptive labels. They are not access control. Admin access stays on the existing admin authentication.

Preset admin, public, and API prefixes stay in `PRESET_ROUTE_REGISTRY` and `PRESET_API_PREFIXES` in the same route registry. Presets do not use Module manifests.

## Profile availability checks

Services, public resolvers, Documentation and Status Page actions, Marketing actions, and Marketing job enqueue and execution consult profile availability before doing work.

`isBlockTypeEnabled()` gates the picker, editor preview, and public renderer. The preview and public renderer show an unavailable state for a disabled block. The editor page tree keeps that block, including its children, and marks the row unavailable. Save persists the validated composition and does not remove a block because its preset or module is off.

The compiled Deployment Profile is the ceiling. `isModuleEnabled()`, `isPresetEnabled()`, and `isCapabilityEnabled()` stay profile-only, and middleware still uses the compiled prefixes. Server reads and writes also require an installation-wide `SiteFeature` row. `isModuleActive()` and `isPresetActive()` are true only when the profile includes the id and that row is enabled. On ledger read failure, availability helpers **fail open** (treat included features as active) so admin UI and saved blocks are not blanked by a DB outage. Mutation-capable Node ingress uses fail-closed access (`resolveModuleIngressAccess` / Marketing ingress) when the ledger is unavailable. The editor and the public renderer each load one effective profile per request: the compiled module and preset lists with disabled rows removed. Capabilities stay on the profile. Changing a flag updates `enabled` and `updatedAt` only. It does not delete pages, entities, or block JSON. The Modules admin screen calls `updateSiteFeatures` for included modules and required presets. It does not change the compiled profile. Prebuild hard-fails if `profile:generate` fails or the selected artifact is not `generated: true` with `profileId` matching `AZURA_PROFILE`.

**Hostinger shipping path (M2.1 / M2.3):** `build:hostinger` imports [`ensureSelectedDeploymentProfile`](../scripts/deploy/ensure-selected-deployment-profile.mjs) then [`runBuildGenerators`](../scripts/deploy/run-build-generators.mjs) (prisma-metadata → middleware) **before** standalone / engines / DB probe / Prisma / Next. It regenerates and asserts the selected profile and **rejects `AZURA_PROFILE_FILE`**. Middleware hard-fail means the generator **exits 0** (fallback write without DB is OK) — not that a live DB is required. **Rollback:** fix `AZURA_PROFILE` in hPanel (or unset → default `enterprise`). Do not bypass the gate.

**npm prebuild (M2.3):** [`runPrebuildManifestSteps`](../scripts/deploy/run-build-generators.mjs) hard-fails middleware → profile(+assert) → prisma-metadata (order preserved; softFail removed).

**Module-set integrity (M2.2 — partial closure):** production assert compares artifact **module list** (`profileSourceModules`) to reviewed expectations in [`scripts/deploy/profile-source-expectations.json`](../scripts/deploy/profile-source-expectations.json) (ships with build scripts). Trust model: shrink is **reviewable** via `--write-expectations` diffs, not impossible. `profileSourceHash` is **provenance only** — not an edit detector by itself; a full YAML-byte tripwire is **deferred**. Matched-twin measure uses a separate twin assert under `scripts/platform/` (no expectations).

**Problem solved:** Every deploy today effectively carries the full surface area (~84 models, full admin nav, all portal features). Profiles align each build with customer need.

**Phase 7** is implemented. Profile loading reads compiled JSON from `src/generated/deployment-profile.json`, built at prebuild (and on Hostinger via M2.1 ensure) from `AZURA_PROFILE` and YAML manifests in [`profiles/`](./profiles/) and [`admin-nav-manifest.yaml`](./admin-nav-manifest.yaml). Admin IA spec: [`admin-ia.md`](./admin-ia.md).

Block-to-admin content mapping and route gating notes: [`block-source-admin-content-audit.md`](./block-source-admin-content-audit.md).

## Future Module extraction

A profile that omits a Module removes that Module’s declared route prefixes and nav ids from the compiled ceiling. Middleware returns 404 for those declared paths. The Module folder stays in this repository, and Modules keep the shared application schema.

That omission is route and nav gating. It is not package exclusion, and it does not prove the Module is absent from a client bundle. `SiteFeature` can turn an included Module off. It cannot delete the Module’s code, or its pages, entities, or saved block JSON. The Modules screen does not install or uninstall code.

Marketing’s manifest declares `/api/marketing`. The short-link App Router handler is `src/app/a/route.ts` (**`/a` only**); middleware also treats `/a/*` as a campaign short-link path. `/a` is an **extra public binding** (`MODULE_EXTRA_DISABLED_PUBLIC` in the profile generator), not derived from `publicRoutes`. When Marketing is **profile-omitted**, `/a` is added to `disabledPublicPrefixes` so middleware returns 404 for `/a` and `/a/...`. When Marketing is included but runtime-inactive, Node ingress denies Marketing side effects (no attribution cookie / campaign writes) without relying on that middleware list.

### Boundary evidence (matched twin) — modules-v2 Phase 6

**Authority:** [`docs/modules-v2/plans/phase-6-boundary-evidence.md`](./modules-v2/plans/phase-6-boundary-evidence.md). Historical M8/M8.1/M8.2 notes under `docs/azura-v2/` are lineage only.

**Profile = access / nav / ceiling; middleware 404 ≠ bundle exclusion.** Report `profileGating` and `bundleEvidence` as separate lanes.

| Field | Value |
|-------|--------|
| Pair | `enterprise` vs ephemeral `enterprise-minus-marketing` (Marketing-only delta). Do **not** treat as-shipped `marketing.yaml` as a Marketing-only control. |
| Preflight | `node scripts/platform/preflight-measure-toolchain.mjs` (durable Node only; rejects session/CUA runtimes) |
| Commands | `node scripts/platform/measure-profile-boundary.mjs` (calls generate directly for twins / `AZURA_PROFILE_FILE`; Hostinger path separately runs M2.1 ensure; `AZURA_MEASURE_NO_DB=1`) |
| Inventory CI | `npm run inventory:marketing-shared-edges` — reviewed snapshot [`docs/azura-v2/inventories/marketing-shared-edges.json`](./azura-v2/inventories/marketing-shared-edges.json); on drift, the script prints the re-snapshot command |
| Checked-in summary | [`docs/azura-v2/inventories/profile-boundary-summary.json`](./azura-v2/inventories/profile-boundary-summary.json) and [`docs/modules-v2/inventories/profile-boundary-summary.json`](./modules-v2/inventories/profile-boundary-summary.json) |
| Marker method | Primary: intentional `AZURA_MODULE_BOUNDARY:<id>` constants; secondary: path substrings. Absence ≠ proven exclusion. Metadata ≠ shipped code. |
| Exclusion CI gate | **None** (`releaseGate.decision: docs-only`). |

#### Accepted coupling (cross-cutting production imports)

Runtime Marketing ingress guards remain. Snapshot: **90 production + 4 test edges** in [`marketing-shared-edges.json`](./azura-v2/inventories/marketing-shared-edges.json) (includes Marketing admin/API trees).

- `src/app/a/route.ts` → `ingress-guard` / `ingress/short-link`
- `src/app/api/inquiries/route.ts` → `leads/attribution-bridge` (`attachLeadAttributionFromUtm`)
- `src/app/api/newsletter/subscribe/route.ts` → `leads/attribution-bridge` (`attachLeadAttributionFromUtm`)
- `src/components/analytics/meta-pixel.tsx` → `tracking/meta-pixel`
- `src/config/deployment-profile/route-registry.ts` → `manifest` (`marketingModuleManifest`)
- `src/features/i18n/deferred-locale-marketing-chrome.tsx` → ingress-guard + meta-pixel resolvers
- `src/features/marketing-attribution/client.ts` → `tracking-urls/build-url`
- `src/features/seo/google-platform/ads-credentials.ts` / `marketing-ads-bridge.ts` → Google Ads marketing helpers
- `src/lib/request-country.ts` → `attribution/ua-geo` (`geoFromRequestHeaders`)

`adminRoutes` and `publicRoutes` are prefixes. The Next.js pages, layouts, and handlers live under `src/app`, outside the Module folders. A later extraction of one named Module moves or adapts the whole route subtrees those prefixes cover, including layouts and server actions, plus `src/modules/<id>` and the block types in `contributedBlockTypes`.

That list is not sufficient by itself. Shared files import Module types and implementations (see accepted coupling above). Review those imports before moving files. Moving only the Module directory and the listed route and block files would leave imports that still resolve into the Module.

Core, every Preset, every Capability, `src/modules/module-manifest.ts`, the Modules screen, `SiteFeature`, and the profile compiler stay in the application. The route registry keeps importing the manifests that remain. An extracted Module is absent from that list, so the generator cannot enable it.

---

## Profile manifest files (Phase 1)

| Profile | Manifest | Admin item ids |
|---------|------------|----------------|
| Marketing | [profiles/marketing.yaml](./profiles/marketing.yaml) | Pages, blog, forms — no presets |
| Showroom | [profiles/showroom.yaml](./profiles/showroom.yaml) | Products, services, collections |
| Agency | [profiles/agency.yaml](./profiles/agency.yaml) | Services, projects, team, case studies |
| Tourism | [profiles/tourism.yaml](./profiles/tourism.yaml) | Packages, properties (label overrides) |
| Documentation | [profiles/documentation.yaml](./profiles/documentation.yaml) | Knowledge + documentation module |
| Enterprise | [profiles/enterprise.yaml](./profiles/enterprise.yaml) | Full nav + system tools |

Item ids reference [`admin-nav-manifest.yaml`](./admin-nav-manifest.yaml).

---

## Profile manifest format

Profiles are declarative manifests (YAML or JSON). Example:

```yaml
# profiles/showroom.yaml
id: showroom
label: Product Showroom
description: Marketing site with product showcase and comparison.

core:
  - cms
  - builder
  - seo
  - media
  - localization
  - leads

capabilities:
  - search
  - ai
  - personalization
  - versioning
  - workflow

experience:
  - entities
  - templates
  - collections

presets:
  - product
  - service

modules: []

admin:
  content:
    - pages
    - blog
    - products      # preset: product — user label
    - services      # preset: service
  marketing:
    - forms
    - inquiries
    - newsletter
    - whatsapp
  design:
    - studio
    - header
    - footer
    - theme
  seo:
    - meta
    - redirects
    - sitemap
    - structured-data
  settings:
    - languages
    - site-access
    - search
```

### Manifest fields

| Field | Purpose |
|-------|---------|
| `id` | Machine identifier (`showroom`) |
| `label` | Human name for installers |
| `core` | Required Core Platform slices (always subset of full core) |
| `capabilities` | Enabled shared services |
| `experience` | Experience layer features (usually all three for entity sites) |
| `presets` | Enabled EntityType presets |
| `modules` | Enabled optional modules |
| `admin` | Admin nav sections and items (user language labels) |

---

## Standard profiles

### Marketing

Minimal marketing site — Pages, blog, forms, SEO. **No structured Entity presets.**

**Manifest:** [profiles/marketing.yaml](./profiles/marketing.yaml)

| | |
|---|---|
| **Use case** | Brochure site, campaign landing, pre-launch |
| **Core** | cms, builder, seo, media, localization, leads |
| **Capabilities** | ai (optional) |
| **Presets** | — |
| **Modules** | — |

---

### Showroom

Manufacturing / product showcase with comparison and listing.

**Manifest:** [profiles/showroom.yaml](./profiles/showroom.yaml)

| | |
|---|---|
| **Use case** | Product catalog experience without commerce |
| **Core** | Marketing + full leads |
| **Capabilities** | search, ai, personalization |
| **Presets** | product, service |
| **Modules** | — |

---

### Agency

Consultancy, agency, professional services.

**Manifest:** [profiles/agency.yaml](./profiles/agency.yaml)

| | |
|---|---|
| **Use case** | Services, projects, team, case studies — often **no catalog page** |
| **Core** | Marketing |
| **Capabilities** | search, ai |
| **Presets** | service, project, team-member, case-study |
| **Modules** | — |

---

### Tourism

Travel, destinations, packages (legacy travel presets unified under Entity vocabulary).

**Manifest:** [profiles/tourism.yaml](./profiles/tourism.yaml)

| | |
|---|---|
| **Use case** | Destinations, packages, listings |
| **Core** | Marketing |
| **Capabilities** | search, ai |
| **Presets** | destination, property, service (+ migrated package/listing presets) |
| **Modules** | — |

---

### Documentation

Knowledge + documentation portal.

**Manifest:** [profiles/documentation.yaml](./profiles/documentation.yaml)

| | |
|---|---|
| **Use case** | Help center, product docs, KB |
| **Core** | Marketing |
| **Capabilities** | search, versioning, workflow |
| **Presets** | knowledge (thin — articles as Entities) |
| **Modules** | documentation |

---

### Enterprise

Full platform for complex installs.

**Manifest:** [profiles/enterprise.yaml](./profiles/enterprise.yaml)

| | |
|---|---|
| **Use case** | Multi-vertical installation with the currently implemented optional Modules |
| **Core** | All |
| **Capabilities** | All needed |
| **Presets** | As required |
| **Modules** | marketing, documentation, status-page |

Advanced SEO and enterprise translation remain profile-visible areas or future Module candidates; they are not listed as installed Modules until their Module contracts and runtime boundaries exist.

---

## Profile comparison matrix

| Profile | Presets | Key Capabilities | Modules |
|---------|---------|------------------|---------|
| marketing | — | ai? | — |
| showroom | product, service | search, personalization, ai | — |
| agency | service, project, team-member, case-study | search, ai | — |
| tourism | destination, property, service | search, ai | — |
| documentation | knowledge | search, versioning, workflow | documentation |
| enterprise | custom set | all | marketing, documentation, status-page |

---

## What profiles control (Phase 7 implementation)

| Surface | Profile gates |
|---------|---------------|
| Admin navigation | Show only enabled preset labels and modules |
| Public / API paths | Compiled `disabledPublicPrefixes`, `disabledPublicSegments`, and `disabledApiPrefixes`; middleware returns 404. App Router files under `src/app` remain on disk — omission is not proven client/server bundle exclusion |
| Middleware | Matchers enforce those disabled prefix/segment lists |
| Search index profiles | Index only enabled EntityTypes |
| Setup wizard / demo import | Offer profile-appropriate seeds |

---

## Environment configuration

Set the active profile at **build time** (default: `enterprise` — full surface, unchanged behavior for existing installs):

```bash
# .env
AZURA_PROFILE=enterprise
# showroom | agency | tourism | documentation | marketing
```

Regenerate the compiled artifact locally:

```bash
npm run profile:generate
AZURA_PROFILE=marketing npm run profile:generate
npm run profiles:verify
```

`profile:generate` runs automatically in `prebuild` alongside the middleware manifest.

---

## Custom profiles

Installers may compose custom profiles by copying a standard manifest and adjusting `presets`, `capabilities`, and `modules`.

**Rules:**

- Custom profiles must not enable modules without required Capabilities (e.g. `documentation` requires `search`).
- All enabled presets must use Single Ownership paths — no profile-specific SEO forks.

---

## Relationship to Fitness Test 8

Features that should **not** ship in every profile must declare `deployment profile(s)` in RFCs. Default-deny for new Modules unless added to `enterprise` or explicitly named profiles.

---

## Related documents

- [admin-ia.md](./admin-ia.md) — target admin wireframes
- [admin-nav-manifest.yaml](./admin-nav-manifest.yaml) — nav item registry
- [product-vision.md](./product-vision.md)
- [glossary.md](./glossary.md) — preset registry
- [azura-v2.md](./azura-v2.md) — Phase 7 implementation
