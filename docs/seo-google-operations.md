# Google Search Operations Guide

Operational steps outside the codebase to support Structured Data Platform outcomes.

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
