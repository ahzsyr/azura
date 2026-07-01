# AZURA Deployment Profiles

> **Constitution v1.0** · Part of [AZURA Architectural Constitution](./constitution.md)  
> **Vision:** [product-vision.md](./product-vision.md) · **Concepts:** [domain-model.md](./domain-model.md)

AZURA is a **composable platform**. A deployment profile selects which Core Platform areas, Capabilities, Presets, and Modules are enabled for an installation.

**Problem solved:** Every deploy today effectively carries the full surface area (~84 models, full admin nav, all portal features). Profiles align runtime with customer need.

**Phase 7** is implemented. Profile loading reads compiled JSON from `src/generated/deployment-profile.json`, built at prebuild from `AZURA_PROFILE` and YAML manifests in [`profiles/`](./profiles/) and [`admin-nav-manifest.yaml`](./admin-nav-manifest.yaml). Admin IA spec: [`admin-ia.md`](./admin-ia.md).

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
| **Use case** | Multi-vertical, advanced SEO ops, enterprise translation |
| **Core** | All |
| **Capabilities** | All needed |
| **Presets** | As required |
| **Modules** | advanced-seo, enterprise-translation, status-page, documentation (optional) |

---

## Profile comparison matrix

| Profile | Presets | Key Capabilities | Modules |
|---------|---------|------------------|---------|
| marketing | — | ai? | — |
| showroom | product, service | search, personalization, ai | — |
| agency | service, project, team-member, case-study | search, ai | — |
| tourism | destination, property, service | search, ai | — |
| documentation | knowledge | search, versioning, workflow | documentation |
| enterprise | custom set | all | optional bundle |

---

## What profiles control (Phase 7 implementation)

| Surface | Profile gates |
|---------|---------------|
| Admin navigation | Show only enabled preset labels and modules |
| Public routes | Register routes for enabled presets/modules only |
| Middleware | Matchers exclude disabled module paths |
| API routes | Optional lazy registration or 404 for disabled |
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
