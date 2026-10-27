# SEO System Upgrade — Audit and Recommended Direction

## Executive summary

The proposal is directionally sound about matching search intent to useful pages, supporting category and product discovery, connecting related pages, and using real performance data. Its implementation plan is generic, however, and would duplicate much of Azura's existing SEO platform if followed literally.

Azura already has the centralized metadata read path, an SEO write/intelligence platform, structured-data builders, localized SEO fields, validation and recommendations, sitemap and indexing controls, Search Console ingestion, and internal-linking/search-intelligence capabilities. The useful upgrade is to connect those capabilities around **intent-to-page ownership and rendered-page evidence**, then close the specific gaps below. It is not a second metadata engine or a new `src/lib/seo` subsystem.

The router examples are illustrative only. Azura is a multi-tenant site platform, so the system should support customer sites and entity types generally; a router category page is content created for a particular site, not a platform-wide route or hard-coded SEO target.

## Audit of the proposal against Azura

| Proposal area | Existing foundation | Assessment / remaining work |
|---|---|---|
| Shared metadata resolver and Next.js integration | `seoService.resolveMetadata()` → SEO document → metadata contributors; canonical and hreflang URL helpers | Already implemented. Keep route code on this path. Do not add a parallel `buildMetadata()` API or hand-build canonical URLs. |
| Keyword and page profiles | Locale-aware `focusKeywords`, generation templates, content snapshots, SEO strategies and knowledge | Partial. Keywords are mostly an undifferentiated list; there is no clear primary intent/topic ownership model or cross-page collision view. Add a lightweight planning model before changing persistence. |
| Content analysis | Content snapshots and block extraction; signals include headings, links, images and page text | Exists. Avoid a second generic `ContentAnalysisEngine`. Extend current signals only where actual rendered or entity data is missing. |
| Generation and templates | Rule-based and provider-backed generation, template engine, provenance, diff/preview, autofill and bulk services | Exists. Improve phrase extraction and primary-topic-aware candidates; generated data must remain reviewable and not auto-publish by default. |
| Validation and recommendations | Rule/validation engines, scoring, quality audits, recommendation service | Exists, but focus-keyword scoring is presence-only and current recommendations are not a complete intent-to-page/content workflow. Add evidence-based checks rather than another score. |
| Product/category/article structured data | Schema pipeline and builders for product, brand, article, FAQ, breadcrumbs, organization and local business | Exists. Keep schema grounded in the actual visible entity/offer. Do not infer unsupported product fields or add schema solely to target a keyword. |
| Internal linking | Search Intelligence has internal-linking and operation capabilities; SEO snapshot signals count links; SEO audits cover technical issues | Partial across the boundary. Connect proposed links to canonical entity/locale identities, provide source/target/anchor rationale, and audit rendered crawlable links and orphan/high-value pages. Do not store a duplicate URL graph inside the SEO feature. |
| Sitemap, robots, canonical and locale controls | Sitemap services, indexability policy, canonical normalization, hreflang and submission workflows | Exists. Reuse them when registering planned pages; do not build another sitemap/robots system. |
| Search performance | GSC/GA4 ingestion, metrics and operator UI | Exists, but proposed keyword ownership is not yet clearly tied to query/page observations for prioritization. Add a reporting view that distinguishes observed queries from declared targets. |
| Category/product landing pages | Reusable platform content/catalog entities can be analyzed and resolved; actual routes/content depend on each tenant site | This is a site-content strategy, not a missing universal SEO module. Create pages only for a tenant's real inventory and demand, through its existing CMS/catalog architecture. |
| SEO landing-page builder | Existing CMS/builder, SEO admin, content intelligence and operational approval surfaces | Do not build a second page builder. A planning brief/target assignment can be added to an existing workspace if users need it. Never generate and publish thin pages at scale. |

## Important corrections to the proposal

1. **Don't add keyword tags as a ranking feature.** Search Console query data and primary/supporting topics are useful for editorial planning and auditing. The HTML `meta keywords` tag is not a Google ranking signal. Keep `focusKeywords` as internal guidance if useful, but do not claim its public emission improves ranking; consider removing that tag from public metadata in a separately verified compatibility change.
2. **Don't require exact phrase presence everywhere.** A literal substring test misses morphology, Arabic normalization, transliteration, synonyms, and legitimate semantic matches. Checks should be locale-aware guidance with evidence and a human override, not a hard publish blocker.
3. **Don't use fixed title/description character ranges as correctness rules.** Length can be a diagnostic, but search engines may rewrite snippets and display widths vary. Score clarity, uniqueness, intent fit, and truncation risk as guidance rather than guaranteeing SERP appearance.
4. **Don't put `targetUrl` in untrusted, manually maintained strings.** Resolve ownership through stable entity identity plus locale, then derive the canonical URL through Azura's URL layer. This avoids stale slug, locale, redirect, and canonical conflicts.
5. **Don't equate a page audit score with ranking potential.** Report technical eligibility and actionable content evidence separately from search performance. Neither a passing audit nor structured data guarantees ranking or rich results.
6. **Treat GSC as observed evidence, not a complete keyword research database.** Its query/page reports can be aggregated or omit low-volume queries. Show date range, country, device, search type, and data freshness; do not label estimates as actual universal rank or volume.
7. **Do not add AI providers, a new strategy system, or an extensible plugin SDK.** Those abstractions already exist. Extend the current `SeoPlatform` facade and registries only when a concrete capability is missing.

## Recommended target model

Start with an intent assignment attached to a stable page/entity and locale. Keep it in the existing search-intelligence/content-planning domain unless product requirements show it belongs in persistent SEO metadata. `SeoMeta` remains the source of head metadata; an editorial target is not itself a metadata field.

```ts
type SearchIntent =
  | "informational"
  | "commercial"
  | "transactional"
  | "navigational";

type PageSearchTarget = {
  entity: { type: string; id: string };
  locale: string;
  primaryTopic: string;
  supportingTopics: string[];
  intent: SearchIntent;
  clusterId?: string;
  status: "draft" | "assigned" | "published" | "monitored";
  priority?: number;
};
```

Search volume and difficulty should be nullable, source-attributed observations, not required fields. Keep observed GSC queries and metrics in the analytics domain with their date window and dimensions; do not mix observations with declared editorial targets. Do not persist a raw URL as identity. A cluster can group related targets, but one target page should own a given intent/locale/topic combination unless an explicit exception explains why.

## Upgrade sequence

### Phase 0 — Align the source documentation

The two source documents conflict on maturity: the guide describes implemented content snapshots, generation, governance, recommendations and strategy registries, while the architecture vision section still says the entire upstream intelligence path is absent and that no analyzer exists. Reconcile those status statements first. Label each capability **implemented**, **partial**, or **proposed**, and keep one canonical implementation map.

Also reconcile the keyword policy: the guide says `focusKeywords` are emitted as `meta keywords`, while the pasted proposal correctly says not to treat that tag as ranking work. State that focus keywords are internal editorial data and public emission has no promised ranking benefit.

### Phase 1 — Establish intent ownership without schema churn

- Prototype page targets in the existing Search Intelligence content-intelligence workspace or as a planning-only configuration.
- Resolve page identity through entity type/id and locale; derive canonical URLs using the existing SEO URL resolution layer.
- Show duplicate ownership and missing target pages as review findings. Do not automatically create routes or alter slugs.
- Confirm the workflow fits CMS pages, posts, catalog entities, and static pages before choosing persistence.

### Phase 2 — Improve content evidence and recommendations

- Extend the existing `ContentSnapshot`/signals and `recommendationService` with locale-aware primary-topic checks for title, H1, opening content, and descriptive inbound links.
- Use normalization and phrase-aware matching appropriate to the locale; explain which page evidence triggered each finding.
- Distinguish page-rendered facts from editor-entered targets. Do not infer whether text is meaningful from token count alone.
- Keep fixes as suggestions/change sets through existing diff, approval, and persist boundaries. No silent bulk rewrite of populated metadata.

### Phase 3 — Connect linking and page architecture

- Reuse Search Intelligence internal-link recommendations and operation approval. Link source and target entities, locale, anchor, relationship, and rationale; resolve final href at render time through the current route/locale system.
- Audit crawlable rendered links, relevant incoming links, orphan pages, and whether category/guide/product relationships make sense for the tenant's actual content.
- Do not generate doorway pages or index every filter/parameter combination. The site's existing canonical, robots, sitemap and indexability policy remains authoritative.

### Phase 4 — Tie targets to measured demand

- Extend the existing GSC performance view to compare declared targets with observed query/page data by locale/country/device/search type and date range.
- Report query overlap, target/page mismatch, impressions, clicks, CTR, and average position with caveats and freshness. Recommendations should prioritize meaningful opportunities, not just low CTR or a nominal ranking threshold.
- Keep third-party volume/difficulty optional and label provider/source/date. Avoid implying GSC reports every query.

### Phase 5 — Validate rollout safely

- Add targeted checks for target ownership uniqueness, locale/canonical resolution, metadata parity, structured-data consistency with visible content, internal link href/indexability, and noindex/sitemap conflicts.
- Run checks against representative static, CMS, post, and product pages and both supported locales. Use existing SEO test suites and validators; do not create a second testing harness.
- Roll out as admin guidance first. Consider blocking persistence only for deterministic technical errors (for example malformed canonical or invalid schema), never for subjective keyword/content recommendations.

## Proposed acceptance criteria

- Editors can assign one primary topic and intent to an entity per locale and add a small set of supporting topics without changing public metadata resolution.
- Admins can identify conflicting ownership, unassigned high-priority pages, and observed GSC queries that differ from the declared target.
- Content recommendations point to specific rendered evidence and remain overrideable; generated changes use the existing preview/approval/persist flow.
- Internal link suggestions resolve to valid, canonical, indexable targets and do not create parameterized crawl traps.
- Existing public metadata, localization, canonical/hreflang, schema, sitemap, and async submission behavior remain on their established service paths.
- Documentation labels features by actual maturity and makes no ranking guarantee.

## Out of scope until evidence supports it

- New SEO metadata resolver or parallel `src/lib/seo` module tree.
- A universal keyword-research database with speculative search-volume fields.
- Automatic category or programmatic SEO page creation and publication.
- A new page builder, schema system, analytics pipeline, cache layer, provider abstraction, or plugin framework.
- Keyword density thresholds, exact-match gates, and a single “SEO score” presented as ranking probability.

## Implementation status

**Phases 0–5 landed** (docs maturity map, site-scoped page targets + Content Intelligence UI, topic evidence recommendations, linking enrichment, GSC target compare, tests). See the maturity map in [`seo-system-guide.md`](./seo-system-guide.md) and reconciled platform status in [`seo-architecture.md`](./seo-architecture.md).

## Repository references

- [SEO system guide](./seo-system-guide.md)
- [SEO architecture](./seo-architecture.md)
- Search-intelligence internal linking: `src/features/search-intelligence/internal-linking/`
- SEO platform content and generation: `src/features/seo/platform/layers/content/` and `src/features/seo/platform/layers/intelligence/`
- SEO scoring and recommendations: `src/features/seo/scoring/` and `src/features/seo/platform/services/recommendation.service.ts`
- SEO analytics/integrations: `src/features/seo/analytics/` and `src/features/seo/integrations/`
