# Block Source vs Admin Content Audit

Maps page-builder block data sources to admin content lists, documents profile gating gaps, and validation steps.

## Root cause (packages / hotels / services missing)

The admin sidebar declares **Packages**, **Properties**, and **Services** in [`src/config/admin-nav.ts`](../src/config/admin-nav.ts), pointing to:

| Sidebar label | Route |
|---------------|-------|
| Packages | `/admin/content/catalog-items` |
| Properties (hotels) | `/admin/content/listings` |
| Services | `/admin/content/offerings` |

The enterprise profile enables these nav item IDs in [`docs/profiles/enterprise.yaml`](./profiles/enterprise.yaml).

However, [`scripts/build/generate-deployment-profile.mjs`](../scripts/build/generate-deployment-profile.mjs) also added **legacy manifest entries** (`catalog-hub-legacy`, `catalog-items-legacy`, `listings-legacy`, `offerings-legacy`) with `profiles: []` to `disabledAdminPrefixes`. Because prefix matching is prefix-based (`/admin/content` blocks `/admin/content/catalog-items`), enabled routes were incorrectly blocked and hidden from the sidebar via `isAdminHrefEnabled()`.

**Fix:** Skip legacy/removed nav manifest items when computing disabled prefixes, and remove any disabled prefix that would block an enabled admin href.

---

## Content type mapping (catalog blocks)

Defined in [`src/features/content/content-type.registry.ts`](../src/features/content/content-type.registry.ts):

| Block `source` (legacy) | Content type slug | Admin list | Sidebar label |
|-------------------------|-------------------|------------|---------------|
| `packages` | `catalog-items` | `/admin/content/catalog-items` | Packages |
| `hotels` | `listings` | `/admin/content/listings` | Properties |
| `services` | `offerings` | `/admin/content/offerings` | Services |

Legacy redirects: `/admin/packages`, `/admin/hotels`, `/admin/services` → same content routes.

---

## Block source → admin content inventory

### Catalog & content blocks

| Block type | Source field(s) | Values | Admin content list |
|------------|-----------------|--------|-------------------|
| `catalog` | `source` | `packages`, `hotels`, `services` | Packages, Properties, Services |
| `contentList` | `contentTypeSlug` | `catalog-items`, `listings`, `offerings` | Same three lists |
| `comparison` | `source`, `catalogSource`, `contentTypeSlug` | `manual`, `contentType`, `catalog` + legacy catalog sources | Content hub + type-specific lists |
| `relatedContent` | `contentTypeSlug`, `collectionSlug` | Any enabled content type slug | `/admin/content/{slug}` |
| `categoryExplorer` | `source` | `contentCollections` + `contentTypeSlug` | Content collections per type |
| `pricing` | `source` | `packages`, `planSet` | Packages + `/admin/pricing-plans` |
| `advancedFilters` | `scope` | `content` + `contentTypeSlug` | Content hub |

### Product & commerce blocks

| Block type | Source field(s) | Values | Admin content list |
|------------|-----------------|--------|-------------------|
| `productGrid`, `productCarousel` | `source` | `collection`, `manual`, `featured`, `tags` | `/admin/products`, `/admin/collections` |
| `productShowcase`, `taxonomyProductTabs` | `source`, tabs | Extended product sources | Products, Collections, Brands & Tags |
| `relatedProducts`, `productComparison` | `rule`, `productSlugs` | Product slugs | `/admin/products` |
| `categoryShowcase` | `source` | `collections`, `productCategories`, `manual` | Collections, Brands & Tags |
| `brandShowcase` | `source` | `catalogProfiles`, `manual` | Brands & Tags |
| `megaCollectionShowcase` | collection/brand slugs | — | Collections, Products |

### Preset / portal blocks

| Block type | Slug field | Admin content list |
|------------|------------|-------------------|
| `testimonials` | `testimonialCollectionSlug` | `/admin/testimonials` |
| `faq` | `faqSetSlug` | `/admin/faqs` |
| `gallery`, `videoGallery`, `masonryGallery` | `gallerySlug` | `/admin/gallery` |
| `changelog` | `releaseSetSlug` | `/admin/releases` |
| `knowledgeBase` | `knowledgeBaseSlug` | `/admin/knowledge-base` |
| `teamDirectory` | `teamDirectorySlug` | `/admin/team` |
| `partnerDirectory` | `partnerProgramSlug` | `/admin/partners` |
| `documentationNav` | `docPortalSlug` | `/admin/documentation` |
| `statusDashboard` | `statusBoardSlug` | `/admin/status` |
| `pricingCalculator` | `pricingCalculatorSlug` | `/admin/pricing-calculators` |

### Conversion blocks

| Block type | Source field | Admin content list |
|------------|--------------|-------------------|
| `leadForm`, `contactFormBuilder`, `multiStepForm` | `templateId` | `/admin/forms` |
| `downloadGate` | `templateId`, `mediaAssetId` | Form Templates, Media Library |

### Blog & discovery

| Block type | Source | Admin content list |
|------------|--------|-------------------|
| `relatedContent` (posts) | `entityTypes` includes `POST` | `/admin/posts` |
| `categoryExplorer` | `postCategories` | Blog categories (via posts) |
| `searchBlock` | `entityTypes` | Search settings |

---

## Gaps not fixed by profile gating

| Gap | Status | Notes |
|-----|--------|-------|
| `projects`, `case-studies` in enterprise profile | Planned | No sidebar entries or routes yet |
| `products` content type vs `/admin/products` | By design | Products managed via product catalog, not content hub picker |
| `contentList` block picker | Narrow | Only `catalog-items`, `listings`, `offerings` — not custom types |
| Content collections admin | Partial | Assigned per item in edit form; no dedicated collections manager for content types |

---

## Post-fix validation checklist

Run after `npm run profile:generate`:

1. **Profile verify:** `npm run profiles:verify` — enterprise content routes must not appear in `disabledAdminPrefixes`.
2. **Sidebar:** Content section shows **Packages**, **Properties**, **Services** (enterprise/tourism profiles).
3. **Direct routes** (no 404 / profile gate):
   - `/admin/content`
   - `/admin/content/catalog-items`
   - `/admin/content/listings`
   - `/admin/content/offerings`
4. **Legacy redirects:**
   - `/admin/packages` → catalog-items list
   - `/admin/hotels` → listings list
   - `/admin/services` → offerings list
5. **Builder:** Catalog block source `packages` / `hotels` / `services` loads items edited in the matching admin list.
