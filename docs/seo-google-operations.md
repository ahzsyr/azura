# Google Search Operations Guide

Operational steps outside the codebase to support Structured Data Platform outcomes.

## Google Merchant Center (Shopping feed)

AZURA is a **feed provider**, not a Merchant Center API client. Production catalog path:

1. Product DB → eligibility resolver → `/feeds/google-shopping.xml`
2. Google Merchant Center **scheduled fetch** of that URL
3. Google Ads Shopping / Performance Max (after GMC approval)

The Excel converter (`Converter/google-converter.py`) is **offline/manual import only**. Do not dual-feed Excel + XML as production sources of truth.

**Full Phase 3 go-live runbook:** [`docs/phase-3-shopping-go-live.md`](./phase-3-shopping-go-live.md)

### Launch gate (MVP set, not catalog %)

Before PMax, define an **initial campaign product set** in **Admin → SEO → Google → Merchant Center** (`Initial campaign product set`: one id / slug / MPN per line). Launch when **every product in that set is Approved in GMC** — not when overall catalog approval % looks high.

Keep `validationMode = standard` for the first production cycle. Do not switch to `strict` at launch.

### Inconsistent currencies (price vs shipping)

GMC requires **one currency** for all price attributes on an item. The feed always emits product `g:price` / `g:sale_price` and shipping in the Merchant Center **default currency** (AED for AE). Catalog amounts stored in USD/EUR are converted via `seeds/catalog/currency.config.json` rates. AZURA still records a local `CURRENCY_MISMATCH` warning when the product record currency differs from AED.

### Verified store URL (avoid “Mismatched online store URL”)

Product landing pages in the XML (`g:link`) must use the **same host** as the website verified in GMC Business info — and that host must be the **final URL after redirects**.

For BRT: **`https://brt-me.com`** (apex). `www.brt-me.com` 308-redirects to apex; do **not** put `www` in the feed or leave GMC claimed on `www`.

1. Set **Verified store URL** (`storeUrl`) in Admin → Merchant Center to `https://brt-me.com`.
2. Confirm Feed Health **Store domain (g:link)** and **Final host (not www)** are green.
3. In GMC, claim/verify `https://brt-me.com`; remove Excel or other primary feeds so only scheduled fetch of `/feeds/google-shopping.xml` supplies the catalog.
4. Trigger a feed fetch / wait for Google to reprocess (24–48h+).

Third-party image hosts are unrelated to this error.

### Operator launch checklist

1. Confirm production feed health in **Admin → SEO → Google → Merchant Center**:
   - Open `https://<domain>/feeds/google-shopping.xml`
   - Items &gt; 0, HTTPS images, **store domain matches verified store**, market currency (AED), shipping present
   - Review Ready / Warning / Excluded diagnostics (local AZURA status)
   - Confirm MVP set tokens show **in feed** (not excluded / missing)
2. In [Google Merchant Center](https://merchants.google.com/):
   - Claim and verify the website (**same origin as `storeUrl`**)
   - Configure UAE shipping and returns (account-level)
   - Add a **scheduled fetch** primary feed pointing at `/feeds/google-shopping.xml` (never Excel as production)
   - Target country **AE**, language **en**, destination **Shopping ads**
3. Clear GMC Diagnostics until **each MVP product** is **Approved** (Google’s status, not AZURA Feed Health; catalog % is informational only)
4. Link Merchant Center to Google Ads → create Performance Max or Shopping campaign (UAE, AED, budget); confirm MVP products eligible
5. Tick AZURA operator checklist boxes **only after** each Google-side action is done (flags never change XML)

### First production cycle

Compare AZURA warnings vs GMC diagnostics vs Approved vs impressions. Evaluate `strict` only after GTIN / identifier cleanup. Re-check diagnostics after large imports; weekly GMC Diagnostics for the first month.

### Honest admin semantics

| Layer | Question | Source of truth |
|---|---|---|
| AZURA | What should we send? | Feed Health + eligibility diagnostics |
| Merchant Center | What did Google accept? | GMC Diagnostics / Approved |
| Google Ads | What can enter an ad auction? | Campaign eligibility / impressions |

**Feed Health green ≠ Google Shopping approved.** AZURA never reports a successful Content API product upload.

## Google Business Profile (verified listing)

1. Upload at least 10 high-quality photos: office/storefront, warehouse, products, team, logo.
2. Match NAP (name, address, phone) character-for-character with **Admin → Company** (`/admin/company`).
3. Complete categories, business hours, description, and website URL (production domain).
4. Post regularly and respond to reviews.

The knowledge panel photo gallery is primarily driven by GBP — not website schema alone.

## Google Search Console

1. Connect OAuth at **Admin → SEO → Google** (`/admin/seo/google`).
2. Verify the production domain property.
3. Submit `/sitemap.xml` (includes FAQ set URLs after pipeline deploy).
4. Request indexing for: home, about, contact, `/faq`, top product pages.
5. Monitor **Enhancements → Structured data** for errors/warnings.
6. Review **Coverage** for excluded URLs and **Rich results** reports.

## Content strategy (sitelinks + People Also Ask over time)

1. Link key sections in header and footer: Products, Services, FAQ, Contact, Gallery.
2. Maintain FAQ sets with real search-intent questions in **Admin → FAQs** (`/admin/faqs`). Set each group’s cover image and excerpt there.
3. Customize the `/faq` page layout and hero banner in **Admin → Pages → FAQ** (wired CMS page). After deploy, run `npm run cms:ensure-faq` once so the page exists and is published.
4. Use descriptive page titles and meta descriptions on all static pages.

## Deploy checklist (FAQ CMS)

1. Run DB migration (`npm run db:migrate:deploy` or equivalent) — adds `FaqSet.coverUrl`.
2. Run `npm run cms:ensure-faq` — creates/publishes the wired FAQ CMS page with default blocks when empty.
3. In Admin → Pages → FAQ: edit hero banner (`backgroundImageUrl`), layout blocks, then publish if needed.
4. In Admin → FAQs: set cover images and excerpts per FAQ group.

## What Google controls (not engineering deliverables)

- Knowledge Panel appearance
- Photo gallery in knowledge panel
- Sitelinks under organic results
- People Also Ask accordion
- AI Overview citations
- Popular Products carousel
- Brand entity (Wikipedia/Wikidata tier)

Allow 2–8+ weeks after deploy for Google-controlled surfaces to appear.

## Verification checklist

1. [Google Rich Results Test](https://search.google.com/test/rich-results) — home page shows connected `@graph`
2. GSC URL Inspection — structured data detected on key pages
3. GSC Sitemaps — submitted and processed
4. Brand name search (logged out) — monitor panel/sitelinks over time
