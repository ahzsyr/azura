# SEO System — Complete Guide

> Practical catalog of every major section and function in Azura’s SEO stack, plus recommendations so **focus / main keywords** actually influence search visibility.  
> Architecture ADRs and frozen-foundation rules: [`seo-architecture.md`](./seo-architecture.md).  
> Google operator runbook: [`seo-google-operations.md`](./seo-google-operations.md).  
> Upgrade direction (intent ownership + evidence): [`seo-system-upgrade-audit.md`](./seo-system-upgrade-audit.md).

**Code root:** `src/features/seo/`  
**Public entry:** `seoService.resolveMetadata()` → `documentToMetadata()` → Next.js `<head>`

### Capability maturity map

| Capability | Status | Notes |
|---|---|---|
| Public metadata resolve (`seoService` → document → contributors) | **implemented** | Frozen read path |
| Canonical / hreflang URL layer | **implemented** | `src/i18n/seo-helpers.ts` |
| Content snapshots + block extraction | **implemented** | SEO Platform content layer |
| Rule-based / provider generation, templates, autofill | **implemented** | Write path; review before persist |
| Governance (rules, validators, strategies, schema registry) | **implemented** | Plugin SDK already present — extend, do not replace |
| Recommendations (validation/rules/signals) | **partial** | Topic evidence for title/H1/opening; inbound after linking |
| Schema pipeline (product, FAQ, org, …) | **implemented** | Keep grounded in visible entity data |
| Sitemap / robots / llms / async submission | **implemented** | Reuse; no parallel crawl stack |
| GSC / GA4 ingestion + operator UI | **implemented** | Dimensions: date, url, query, country, device (no search type) |
| Internal linking (Search Intelligence) | **partial** | Locale/anchor/relationship + inbound guidance; apply ops conditional |
| Page search targets (intent ownership) | **implemented** | Site-scoped JsonStore planning in Search Intelligence (not `SeoMeta`) |
| Target vs GSC demand compare | **implemented** | Site URL policy join; unmatched rows reported; no search-type filter |

**Keyword policy:** `focusKeywords` are **internal editorial guidance**. Emitting `<meta name="keywords">` has **no ranking promise** for Google. Prefer primary topic placement in title, H1, opening copy, slug, and schema. Stopping public meta-keywords emission is a separately verified compatibility change.

---

## Table of contents

1. [System overview](#1-system-overview)
2. [Data model](#2-data-model)
3. [Module map](#3-module-map)
4. [Core read path](#4-core-read-path)
5. [SEO Platform (write / intelligence)](#5-seo-platform-write--intelligence)
6. [Schema / structured data pipeline](#6-schema--structured-data-pipeline)
7. [Scoring, quality, and audits](#7-scoring-quality-and-audits)
8. [Crawl surfaces (sitemap, robots, llms)](#8-crawl-surfaces-sitemap-robots-llms)
9. [Integrations and submission](#9-integrations-and-submission)
10. [Google platform and analytics](#10-google-platform-and-analytics)
11. [Admin surfaces and server actions](#11-admin-surfaces-and-server-actions)
12. [Focus keywords — how they work today](#12-focus-keywords--how-they-work-today)
13. [Recommendations — make keywords recognized in SERPs](#13-recommendations--make-keywords-recognized-in-serps)
14. [Enhancement backlog (prioritized)](#14-enhancement-backlog-prioritized)
15. [Key file index](#15-key-file-index)

---

## 1. System overview

Azura SEO is **entity-driven**: content entities (CMS pages, posts, products, static marketing routes) do **not** own SEO columns. They link to a shared `SeoMeta` record. Localized titles/descriptions live in `EntityTranslation`. Public pages always resolve through one pipeline.

```
Content entity ──▶ SeoMeta (+ EntityTranslation)
                         │
                         ▼
              resolveSeoDocument() / PageSeoContext
                         │
                         ▼
              documentToMetadata() ──▶ <head>
                         │
        publish / save ──▶ seoTriggerService ──▶ SeoSubmissionJob
                         │
                         ▼
              IndexNow / Bing / Google / GSC / audits
```

| Concern | Path | Role |
|--------|------|------|
| **Read (public)** | `core/`, `seo.service.ts`, `lib/seo.tsx` | Resolve and render `<head>` |
| **Write (admin)** | `actions.ts`, `platform/` | Persist meta, autofill, pipelines |
| **Distribute** | `triggers/`, `integrations/` | Async search-engine submission |
| **Govern** | `scoring/`, `quality/`, platform governance | Score, validate, audit |
| **Discover** | `sitemap*.ts`, `llms/`, robots | Crawl surfaces |
| **Operate** | `admin/`, `operator/`, `google-platform/` | Operator UI and Google ops |

**Hard rules (non-negotiable):**

- Public routes never query `SeoMeta` directly — use `seoService.resolveMetadata()`.
- `buildMetadata()` / `documentToMetadata()` stay side-effect free.
- Search submissions never run synchronously on the request path.
- `SeoMeta` stays locale-neutral; localized text uses `EntityTranslation`.
- Canonical / hreflang come from the URL layer (`src/i18n/seo-helpers.ts`), not string concat in routes.

---

## 2. Data model

### 2.1 `SeoMeta` (locale-neutral)

Linked by one of: `pageKey`, `cmsPageId`, `postId`, or `(entityType, entityId)`.

| Field | Purpose |
|-------|---------|
| `canonicalUrl` | Optional override (default is computed) |
| `robots` | e.g. `index, follow` / `noindex, follow` |
| `focusKeywords` | Comma-separated **internal** editorial targets (may also emit as `meta keywords` with no ranking promise) |
| `ogImageUrl` | Social / OG image |
| `twitterCard` | `summary` \| `summary_large_image` |
| `jsonLd` | Page-level structured data override / enrichment |

### 2.2 `EntityTranslation` (localized)

| Field | Purpose |
|-------|---------|
| `metaTitle` | SERP title (primary ranking/CTR signal) |
| `metaDescription` | SERP snippet candidate |
| `ogTitle` / `ogDescription` | Social overrides |
| `focusKeywords` | Per-locale keywords (falls back to column / English) |

### 2.3 JsonStore namespaces

| Namespace | Content |
|-----------|---------|
| `seo-global` | Robots extras, host |
| `seo-structured` | Global Organization / Website JSON-LD |
| `seo-integrations` | Provider credentials (sealed) |
| `seo-llms` | `/llms.txt` document |
| `seo-sitemap` | Manual include/exclude paths |
| `seo-tracking` | GA4 / GTM |
| `seo-appearance` | Title/description templates by content type |
| `seo-pipelines` | Declarative automation pipelines |
| `seo-knowledge` | Knowledge entries for generation |
| `seo-google-platform` | Google product ops config |
| `seo-search-ops` | Search operations state |
| `seo-provenance` | Field provenance / explainability |
| `seo-url-inspection` | URL Inspection queue state |

### 2.4 Operational tables

`SeoRedirect`, `SeoSubmissionJob`, `SeoCrawlIssue`, `SeoRichResultIssue`, `SeoHealthSnapshot`, `SeoSearchMetric`, `Custom404`.

### 2.5 Static page registry

`STATIC_SEO_PAGES` / `PRIORITY_INDEXABLE_PAGE_KEYS` / `NON_INDEXABLE_STATIC_PAGE_KEYS` in `constants.ts` — marketing routes keyed for `SeoMeta.pageKey` (home, about, products, …). Account/compare/favorites stay non-indexable by policy.

---

## 3. Module map

```
src/features/seo/
├── index.ts                 Public barrel (service, actions, scoring, platform)
├── actions.ts               Admin server actions (persist + automation)
├── seo.service.ts           Public metadata / JSON-LD facade
├── types.ts                 Shared resolve/config types
├── constants.ts             Static pages, namespaces, robots presets
├── resolve-page-seo-context.ts   Canonical admin/public read DTO
├── resolve-page-seo-for-locale.ts
├── cms-page-seo-context.ts  Wired CMS ↔ pageKey coalesce
├── parse-seo-form.ts        FormData → SEO fields
├── localized-seo-fields.ts  Locale extras (keywords, jsonLd, canonical)
├── sitemap*.ts              Sitemap generation + index + classify
├── seo-bulk.service.ts      Legacy bulk fill
├── seo-static.service.ts    Static page helpers
├── noindex-paths.ts         Policy noindex path resolution
├── redirect-*.ts            Middleware redirect cache / lookup
├── core/                    Frozen read-path document model
├── platform/                Write-path SEO Platform (layers + capabilities)
├── scoring/                 Editor score (admin guidance)
├── quality/                 Audits, health, technical SEO
├── integrations/            IndexNow / Bing / Google queue runner
├── triggers/                Domain events → enqueue
├── google-live/             Live Google APIs (Indexing, URL Inspection, GBP)
├── google-platform/         Admin Google product registry + ops
├── analytics/               GSC ingestion, traffic drop, inspection caps
├── pagespeed/               PageSpeed Insights client
├── llms/                    llms.txt document model + publish
├── tracking/                GA4 / GTM resolution
├── admin/                   Admin UI panels
├── workspace/               SEO workspace snapshot / issues UI
├── operator/                Setup tasks, dashboard VM
├── components/              Shared SEO UI (analysis, schema graph, …)
└── mappers/                 DTO mappers (forms ↔ context)
```

---

## 4. Core read path

### 4.1 `seoService` (`seo.service.ts`)

| Function | Role |
|----------|------|
| `resolveMetadata(params)` | Main public API for `generateMetadata()` |
| `resolveJsonLd(params)` | Page `@graph` for JSON-LD injection |
| `resolveDocument(params)` | Full `ResolvedSeoDocument` |
| `getGlobalStructured()` | Global Organization/Website config |
| `getTrackingConfig()` | Tracking store |
| Safe fallback | Brand + path canonical if resolution fails |

### 4.2 Core document pipeline (`core/`)

| Module | Functions | Role |
|--------|-----------|------|
| `seo-resolver.ts` | `resolveSeoDocument`, `isIndexableSeoDocument` | Load meta, translations, slugs, compose document |
| `document-to-metadata.ts` | `documentToMetadata` | Document → Next.js `Metadata` |
| `seo-document.ts` | types | `ResolvedSeoDocument`, robots, schema graph |
| `seo-canonical.ts` | `resolveCanonical` | Canonical selection |
| `seo-canonical-google.ts` | `normalizeCanonicalForGoogle`, `isPaginatedListingPath` | Google-friendly canonical policy |
| `seo-robots.ts` | `resolveRobots`, `isNoIndexRobots`, … | Robots directive |
| `seo-social.ts` | `resolveOpenGraph`, `resolveTwitter`, … | OG / Twitter |
| `seo-image.ts` | `resolveSeoImage`, … | Image URL resolution |
| `seo-templates.ts` | template types | Appearance templates |
| `seo-hreflang-reciprocity.ts` | reciprocity asserts | Hreflang integrity |
| `seo-cache-key.ts` | `buildSeoDocumentCacheKey` | Cache key helper |
| `is-indexable-seo-document.ts` | indexability gate | Sitemap / submission eligibility |

### 4.3 URL / origin helpers (feature + i18n)

| Module | Role |
|--------|------|
| `resolve-site-origin.ts` | Single origin precedence (admin / public / jobs / sitemap) |
| `site-url-resolver.ts` | Public site URL + logo from settings |
| `normalize-canonical-url.ts` | Normalize stored overrides |
| `resolve-indexable-url.ts` | Indexable absolute URL |
| `src/i18n/seo-helpers.ts` | `buildCanonicalUrl`, `buildHreflangAlternates`, `publicLocalePath` |

### 4.4 Metadata contributors (`platform/read-path/`)

| Contributor | Emits |
|-------------|-------|
| Title / description | Absolute title + description |
| Canonical / languages | `alternates` |
| Robots | Index/follow (+ googleBot) |
| Open Graph / Twitter | Social cards |
| **`keywordsContributor`** | Next.js `metadata.keywords` from `focusKeywords` |

Legacy adapter: `buildMetadata()` in `src/lib/seo.tsx` (deprecated for public routes; still used by JsonLd helpers / tests).

### 4.5 Page SEO context

| Function | Role |
|----------|------|
| `resolvePageSeoContext()` | Canonical DTO for admin + public mappers |
| `listPageSeoContexts()` | Bulk context listing |
| `resolveEffectiveSeoForLocale()` | Locale-effective title/desc/keywords |
| `coalesceWiredPageSeo()` / CMS helpers | Merge pageKey + cmsPageId meta |

---

## 5. SEO Platform (write / intelligence)

Facade: `seoPlatform` implementing `SeoPlatform` (`platform/seo-platform.ts`).

### 5.1 Capabilities surface

| Area | Methods |
|------|---------|
| **content** | `analyze(ctx)` → immutable `ContentSnapshot` |
| **intelligence** | `generate(ctx, snapshot)` → `SeoSuggestion` |
| **governance** | `validate`, `evaluateRules` |
| **recommendations** | `build` |
| **simulation** | `project` (score projection) |
| **diff** | `compare`, `toPreviewModel` |
| **autofill** | `suggest`, `commit` |
| **bulk** | `count`, `run` |
| **automation** | `run(ctx, pipelineId?)` |

### 5.2 Layers

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Content** | `layers/content/` | Block extract, page text, snapshot builder, content engine |
| **Intelligence** | `layers/intelligence/` | Generation engine, templates, meta enrichment, AI provider, image selector, structured-data builder |
| **Governance** | `layers/governance/` | Rule engine, validation engine, schema registry, knowledge store |
| **Quality** | `layers/quality/` | Normalizer (`normalizeKeywords`, title/desc length) |
| **Automation** | `layers/automation/` | Pipeline runner |
| **Observability** | `observability/` | Provenance, audit log, `explainField` |

### 5.3 Intelligence keyword generation (current)

```
ContentSnapshot
  → extractKeywords()     # word frequency, length ≥ 4, top 8
  → enrichFocusKeywords() # seed from title, slug, H1/H2, brand if sparse
  → normalizeKeywords()   # quality normalizer
  → SeoSuggestion.focusKeywords
```

Files: `generation-engine.ts`, `meta-enrichment.ts`, `seo-normalizer-core.ts`.

### 5.4 Plugin SDK

`registerAnalyzer`, `registerRule`, `registerValidator`, `registerTemplate`, `registerProvider`, `registerStrategy`, `registerSchema` — extend without forking core (`plugin-sdk.ts`, `register-defaults.ts`).

### 5.5 Services under platform

| Service | Role |
|---------|------|
| `autofill.service.ts` | Suggest / commit change sets |
| `recommendation.service.ts` | Recommendations view |
| `simulation.service.ts` | Projected scores |
| `seo-diff.service.ts` | Current vs suggestion |
| `change-set.builder.ts` | Persistable change set |
| `change-log.service.ts` | Audit history |
| `write-target.resolver.ts` | Where to write (`SeoMeta` link) |
| `snapshot.resolver.ts` | Content snapshot resolution |
| `bulk/bulk-execution.engine.ts` | Segmented bulk autofill |

### 5.6 Entity providers

`platform/providers/` — CMS page, content item, catalog/product, static page — feed the content layer with entity-specific snapshots.

---

## 6. Schema / structured data pipeline

Location: `platform/schema-pipeline/`.

| Piece | Role |
|-------|------|
| **Builders** | `organization`, `website`, `webpage`, `product`, `brand`, `article`, `faq`, `breadcrumb`, `image`, `video`, `review`, `local-business` |
| **Graph engine** | Merge nodes into `@graph`, deep-merge, dedupe |
| **Breadcrumbs** | BreadcrumbList provider |
| **Context** | Page overrides, path parse, cache-safe context |
| **Validate / save-validation** | Graph validation before persist |
| **Feature flags** | Builder registry toggles |
| **Identity** | Stable `@id` URIs |

Public rendering: `components/structured-data-renderer.tsx`, `structured-data-graph.tsx`.  
Audits: `quality/schema-graph-audit.*`, `public-schema-audit.*`, `rich-results-monitoring.service.ts`.

---

## 7. Scoring, quality, and audits

### 7.1 Scoring (`scoring/seo-scoring.service.ts`)

Admin-only guidance (not a Google ranking API).

| Check | Weight | Notes |
|-------|--------|-------|
| Meta title per locale (30–60 chars) | 15 | Length only |
| Meta description per locale (120–160) | 15 | Length only |
| OG image | 10 | Usable absolute URL |
| Canonical | 10 | Presence |
| JSON-LD | 10 | Presence |
| **Focus keywords** | **5** | **Presence only** (any non-empty string) |
| OG title overrides | 5 | |
| Robots | 5 | |

Exports: `scoreSeoInput`, `scoreSeoMeta`, `getLengthFieldFeedback`, `getCheckById`.

**Gap:** Score does **not** check whether the primary keyword appears in title, H1, description, or body.

### 7.2 Quality (`quality/`)

| Service | Role |
|---------|------|
| `seo-quality.service.ts` | Aggregate quality orchestration |
| `seo-health-score.service.ts` | Site health snapshot |
| `technical-seo-systems.ts` | Publish-time + nightly crawl issues |
| `canonical-conflict.service.ts` | Conflicting canonicals |
| `redirect-chain.service.ts` | Redirect chain / loop detection |
| `broken-link-crawler.service.ts` | Broken internal links |
| `schema-validation.service.ts` / `schema-graph-audit.*` | Structured data quality |
| `public-schema-audit.*` | Live HTML JSON-LD audit |
| `rich-results-monitoring.service.ts` | Rich result issues |
| `crawl-diagnostics.service.ts` | Crawl diagnostics |
| `repair-seo-data.service.ts` | Repair helpers |

### 7.3 Platform validators (keywords)

`register-defaults.ts` → `scoring-keywords`:

- Missing focus keywords → info
- More than 10 comma-separated terms → warn

No phrase quality, stop-word filtering, or on-page placement checks.

---

## 8. Crawl surfaces (sitemap, robots, llms)

| Module | Functions / role |
|--------|------------------|
| `sitemap.service.ts` | `generateSitemap` — locale-aware URLs, exclusions, priorities |
| `sitemap-index.service.ts` | Sitemap index splitting / types |
| `sitemap-path-utils.ts` / `sitemap-url-classify.ts` | Path normalize + type classify |
| `sitemap-origin.ts` | Origin for locs |
| `video-sitemap.loader.ts` | Video sitemap entries |
| `submit-priority-pages.service.ts` | Priority page keys → submission |
| `llms/` | Draft / validate / publish `/llms.txt` |
| Robots | `seo-global` + Next robots route; presets in `ROBOTS_PRESETS` |
| `noindex-paths.ts` | Paths that must stay out of crawl surfaces |

---

## 9. Integrations and submission

### 9.1 Flow

```
Publish / SEO save / slug change
  → seoTriggerService.handle()
  → resolveSeoTriggerPaths() / path-resolver
  → enqueue SeoSubmissionJob
  → seoSubmissionRunner (retries + backoff)
  → IndexNow | Bing | Google sitemap / Indexing API
```

### 9.2 Key modules

| Module | Role |
|--------|------|
| `triggers/seo-trigger.service.ts` | Event → enqueue |
| `triggers/path-resolver.ts` | CMS / post / product / content paths |
| `integrations/enqueue.ts` + `enqueue-policy.ts` | Job creation + policy |
| `integrations/submission-runner.service.ts` | Worker |
| `integrations/providers.ts` | `SEO_INTEGRATION_PROVIDERS` registry |
| `integrations/indexnow-*.ts` | IndexNow payload / submit / key route |
| `integrations/google-auth.ts` / OAuth | Google credentials |
| `integrations/yoast/` | Yoast-compatible head/HTML/JSON serializers (interop) |

---

## 10. Google platform and analytics

| Area | Location | Role |
|------|----------|------|
| Google product registry | `google-platform/` | Definitions, connection, ops UI |
| Live APIs | `google-live/` | Indexing API, URL Inspection, GBP signals, service account |
| Analytics | `analytics/` | GSC metric ingestion, traffic-drop detection, URL inspection queue/caps |
| PageSpeed | `pagespeed/client.ts` | Lighthouse / CrUX via PSI |
| Tracking | `tracking/` | GA4 / GTM measurement resolution |
| Merchant / Ads bridge | `google-platform/marketing-ads-bridge.ts` | Shopping / ads adjacency |

Admin hubs: `/admin/seo/google`, `/admin/seo/search-operations/*`, `/admin/seo/search-intelligence/*`.

---

## 11. Admin surfaces and server actions

### 11.1 Admin routes (`/admin/seo/...`)

| Route | Purpose |
|-------|---------|
| `/` | Operator dashboard |
| `setup`, `tasks`, `tasks/today`, `tasks/week` | Setup + task queues |
| `metadata`, `content`, `templates` | Meta editing / appearance |
| `autofill`, `assistant`, `recommendations`, `rules` | Intelligence UX |
| `analysis`, `audit`, `technical`, `issues`, `monitoring`, `reports`, `history` | Quality |
| `structured-data`, `schemas` | JSON-LD |
| `sitemap`, `robots`, `llms`, `redirects`, `404` | Crawl / redirects |
| `integrations`, `google`, `google-tags` | Providers + tags |
| `automation`, `settings` | Pipelines / config |
| `search-operations/*` | Ops console |
| `search-intelligence/*` | Authority, linking, entity graph, performance, AI |

### 11.2 Primary server actions (`actions.ts`)

| Action | Role |
|--------|------|
| `upsertSeoMetaAction` | Persist SeoMeta + translations |
| `upsertSeoAppearanceAction` | Title/description templates |
| `upsertRedirectAction` / `deleteRedirectAction` / `publishRedirectsAction` | Redirects |
| `upsertCustom404Action` | Custom 404 |
| `upsertSeoGlobalAction` | Robots / host |
| `upsertSeoSitemapAction` | Sitemap include/exclude |
| `upsertSeoLlmsAction` / `publishLlmsTxtAction` / `generateLlmsDraftAction` | llms.txt |
| `upsertSeoTrackingAction` | GA4/GTM |
| `upsertStructuredDataAction` | Global structured data |
| `upsertSeoIntegrationsAction` / `upsertGoogleIntegrationAction` | Providers |
| `load*SeoFormAction` | Form loaders (static / pageKey / content / post) |
| `bulkFillSeoMetadataAction` | Legacy bulk fill |
| `suggestAutoFillAction` / `commitAutoFillAction` / `bulkAutoFillAction` | Platform autofill |
| `planBulkSegmentsAction` / `countBulkSeoAction` | Bulk planning |
| `listRecentSeoChangeLogsAction` | Change history |
| `enqueueSitemapSubmissionAction` / `runSeoSubmissionQueueAction` / `submitSitemapAndRunAction` | Submission |
| `runSeoAnalyticsIngestionAction` | GSC ingest |
| `revalidateRichResultsAction` / `runStructuredDataAuditAction` | Rich results / audit |
| `publishSeoPublicAction` | Publish public SEO surfaces |

---

## 12. Focus keywords — how they work today

### 12.1 Lifecycle

```
Editor / Autofill
  → SeoMeta.focusKeywords (+ optional EntityTranslation.focusKeywords)
  → resolveEffectiveSeoForLocale / resolveSeoDocument
  → documentToMetadata → metadata.keywords  (<meta name="keywords">)
  → Admin score: presence check (weight 5)
  → Internal FTS: concatenated into search index text (site search, not Google)
```

### 12.2 What search engines actually use

| Signal | Used by Google for ranking? | Azura today |
|--------|----------------------------|-------------|
| `<meta name="keywords">` | **No** (ignored for ranking for many years) | Emitted from `focusKeywords` |
| Keyword in **title** | Strong relevance / CTR signal | Not validated against focus keywords |
| Keyword in **H1 / early body** | Strong on-page relevance | Extracted for autofill only; no placement score |
| Keyword in **meta description** | CTR (snippet), weak ranking | Length scored; not keyword-aligned |
| Keyword in **image alt / filenames** | Image + page relevance | Image selected; alt not keyword-checked |
| Keyword in **URL / slug** | Mild relevance | Slug tokens seed autofill keywords |
| Keyword in **JSON-LD** (`name`, `description`, `about`) | Entity / rich-result understanding | Schema built; keywords not mapped into `about`/`keywords` properties deliberately |
| **Internal links** with keyword-rich anchors | Relevance / discovery | Broken-link audit only |
| **GSC queries** matching page | Demand validation | Ingested; not tied back to `focusKeywords` |

**Bottom line:** Storing focus keywords and emitting the meta keywords tag does **not** by itself make Google “recognize” those terms. Recognition comes from **consistent use of the primary phrase across title, headings, copy, URL, and schema**, plus crawlability and links. Site-scoped **page search targets** (primary topic + intent in Search Intelligence) are the planning model for ownership; they do not change public metadata resolution.

### 12.3 Current generator limitations

`extractKeywords()` in `generation-engine.ts`:

- Splits on non-word characters → **single tokens only** (no multi-word phrases like “wireless access point”).
- Filters length ≥ 4 → drops short brandable terms.
- Frequency ranking → common filler words can dominate if stop-words are not removed.
- Caps at 8 terms → no primary vs secondary distinction.
- Scoring only checks **non-empty** — a page can “pass” with irrelevant keywords.

---

## 13. Recommendations — make keywords recognized in SERPs

Treat `focusKeywords` as an **editorial contract**, not as a ranking tag. The first term (or an explicit primary field) is the **main keyword**; the rest are supporting terms.

### 13.1 Editorial model (process)

For every indexable page, define:

| Slot | Rule |
|------|------|
| **Primary keyword** | One phrase (2–5 words) matching search intent |
| **Secondary keywords** | 2–5 related phrases / entities |
| **Locale variants** | Separate Arabic / English phrases (already supported via translations) |

Place them as follows:

1. **Title** — primary phrase near the start; keep 30–60 characters; include brand only if space remains.
2. **H1** — same intent as title; one H1; primary phrase once (natural language).
3. **First 100–150 words** — primary phrase once; one secondary if natural.
4. **Meta description** — primary once; clear benefit + CTA; 120–160 chars.
5. **URL / slug** — hyphenated primary phrase when creating the page.
6. **Image alt** — descriptive; include primary only if it describes the image.
7. **Internal links** — from hub pages (home, categories, services) with descriptive anchors (not “click here”).
8. **Schema** — `name` / `headline` / `description` reflect the same entities; Product/Service/FAQ types where accurate.

Avoid stuffing: repeating the same phrase in every sentence hurts quality and trust.

### 13.2 Product / platform enhancements (high impact)

#### A. Promote primary keyword to a first-class field

Add `primaryKeyword` (string) alongside or inside `focusKeywords` (keep comma list for secondaries), localized via `EntityTranslation`.

- Autofill sets primary = best phrase from title/H1/slug, not top frequency token.
- Admin UI: one “Main keyword” input + “Supporting keywords”.

#### B. Keyword placement scoring (replace “presence only”)

Extend `scoreSeoInput` / platform validators with checks such as:

| Check | Pass condition | Suggested weight |
|-------|----------------|------------------|
| Primary in meta title | Case-insensitive contains | 15 |
| Primary in H1 | From `ContentSnapshot.headings` | 10 |
| Primary in meta description | Contains | 8 |
| Primary in body (early) | First ~300 words | 8 |
| Primary in slug | Slug tokens match | 5 |
| Secondaries coverage | ≥1 secondary in body | 4 |
| Over-optimization | Primary density &gt; ~2.5% → warn | − or warn |

Do **not** over-weight the meta keywords tag.

#### C. Phrase-aware keyword extraction

Replace naive `split(/\W+/)` with:

- Bigram / trigram candidates from title + H1 + product name.
- Stop-word lists (EN + AR).
- Prefer noun phrases over high-frequency verbs.
- Locale-aware tokenization for Arabic (do not rely on `\W+` alone).
- Optional: map catalog brand / category / attributes into keyword candidates for products.

#### D. Wire keywords into generation templates

Templates should resolve tokens like `{PrimaryKeyword}`, `{Category}`, `{Brand}`, `{City}`:

```
Product  → "{ProductName} | {PrimaryKeyword} | {Brand}"
Category → "{PrimaryKeyword} — shop {Brand}"
Blog     → "{ArticleTitle}"  (primary already in title)
```

Ensure `enrichMetaTitle` / `enrichMetaDescription` **prefer inserting the primary phrase** over generic “Visit the X page…” filler when length is short.

#### E. On-page content recommendations (not just meta)

Recommendation engine should emit fixable items:

- “Primary keyword missing from title”
- “H1 does not match primary intent”
- “No internal links to this URL with related anchors”
- “FAQ questions do not include demand phrases from GSC”

Link each finding to Fix / Auto-fix / Ignore (platform recommendations already designed for this).

#### F. Align with Google Search Console demand

After `runSeoAnalyticsIngestionAction`:

- For each URL, show top queries vs declared `primaryKeyword`.
- Flag mismatch: ranking for query Q but primary is P.
- Suggest promoting Q to primary when impressions/CTR justify it.
- Feed “People Also Ask” / FAQ content from real queries (see Google ops guide).

#### G. Schema entity alignment

For commercial / local pages:

- Ensure Organization / LocalBusiness / Product `name` matches brand + category language users search.
- Use accurate `areaServed`, `brand`, `category` — these help entity understanding more than meta keywords.
- Keep FAQPage questions written as natural search queries.

#### H. Crawl & index hygiene (keywords only help if the page is indexed)

- Keep priority pages in sitemap and IndexNow after publish.
- No conflicting canonicals; reciprocal hreflang for EN/AR.
- `noindex` only on intentional private surfaces (`NON_INDEXABLE_STATIC_PAGE_KEYS`).
- Submit priority URLs via Search Console / Indexing API after major keyword rewrites.

#### I. Meta keywords tag policy

Options:

1. **Keep emitting** `metadata.keywords` for legacy Bing/Yandex quirks and internal tooling — but never treat it as the optimization target.
2. **Or stop emitting** publicly and use `focusKeywords` only as an admin/guidance field (cleaner mental model).

Recommendation: keep storage + admin scoring; document clearly that SERP recognition depends on placement (A–H), not the meta tag.

### 13.3 Content playbook by page type

| Page type | Main keyword pattern | Must-have placements |
|-----------|---------------------|----------------------|
| Home | Brand + primary category (e.g. “wireless networking UAE”) | Title, H1, hero copy, Organization schema |
| Category | “{category} {intent}” (buy / solutions / wholesale) | Title, H1, intro, Product listing schema |
| Product | “{product name}” + one attribute phrase | Title, H1, Product schema name/description |
| Service | “{service} in {city/region}” | Title, H1, Service/LocalBusiness |
| Blog | Long-tail question / how-to | Title, H1, Article schema, FAQ if applicable |
| FAQ | Exact question phrases | Question as H2 + FAQPage schema |
| Contact / About | Brand + location | NAP consistency with GBP |

### 13.4 Locale (EN / AR) specifics

- Maintain **separate** primary keywords per locale (already supported).
- Do not machine-translate keyword lists blindly — search demand differs.
- Ensure hreflang pairs point at equivalent intent pages.
- Arabic titles: prioritize meaning over forced Latin keyword insertion.

### 13.5 What not to do

- Do not stuff 15+ comma-separated keywords hoping for rankings.
- Do not duplicate the same keyword-heavy title across many URLs (cannibalization).
- Do not change slugs repeatedly after indexing (use redirects if you must).
- Do not rely on autofilled frequency tokens as “main keywords” without human review for money pages.

---

## 14. Enhancement backlog (prioritized)

| Priority | Enhancement | Touches | Outcome |
|----------|-------------|---------|---------|
| P0 | Primary keyword field + UI | `SeoMeta` / translations, admin forms, autofill | Clear main target per page/locale |
| P0 | Placement scoring (title / H1 / description) | `seo-scoring.service.ts`, validators | Keywords become enforceable quality gates |
| P1 | Phrase extraction + stop words (EN/AR) | `generation-engine.ts`, `meta-enrichment.ts` | Better autofill candidates |
| P1 | Template tokens for primary keyword | Appearance templates, enrichers | Titles/descriptions carry the phrase by default |
| P1 | Recommendations: “keyword missing in title/H1” | `recommendation.service.ts`, analysis panel | Actionable editor workflow |
| P2 | GSC query ↔ primary keyword alignment | `analytics/` + admin performance UI | Optimize for real demand |
| P2 | Density / stuffing warnings | Scoring + content snapshot | Protect quality |
| P2 | Schema `about` / entity mapping from primary | Schema builders | Stronger entity signals |
| P3 | Optional: stop emitting public `meta keywords` | `document-to-metadata.ts` | Cleaner public head |
| P3 | Keyword cannibalization report | Quality / reports | Detect competing pages |

These sit on top of the frozen read path (`SeoMeta` → `seoService` → `<head>`) and match the Intelligence Platform direction in `seo-architecture.md`.

---

## 15. Key file index

| Concern | Path |
|---------|------|
| Public service | `src/features/seo/seo.service.ts` |
| Document resolve | `src/features/seo/core/seo-resolver.ts` |
| Document → Metadata | `src/features/seo/core/document-to-metadata.ts` |
| Legacy Metadata adapter | `src/lib/seo.tsx` |
| URL helpers | `src/i18n/seo-helpers.ts` |
| Platform facade | `src/features/seo/platform/` |
| Keyword extract / enrich | `platform/layers/intelligence/generation-engine.ts`, `meta-enrichment.ts` |
| Scoring | `src/features/seo/scoring/seo-scoring.service.ts` |
| Actions | `src/features/seo/actions.ts` |
| Sitemap | `src/features/seo/sitemap.service.ts` |
| Triggers | `src/features/seo/triggers/` |
| Integrations | `src/features/seo/integrations/` |
| Quality | `src/features/seo/quality/` |
| Schema builders | `src/features/seo/platform/schema-pipeline/builders/` |
| Constants | `src/features/seo/constants.ts` |
| Architecture ADRs | `docs/seo-architecture.md` |
| Google ops | `docs/seo-google-operations.md` |

---

## Related docs

- [`seo-architecture.md`](./seo-architecture.md) — ADRs, constraints, intelligence vision, scale epics  
- [`seo-google-operations.md`](./seo-google-operations.md) — GSC, GBP, Merchant Center, content strategy  
- [`architecture-principles.md`](./architecture-principles.md) — platform-wide rules  
)
