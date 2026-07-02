# Localization Admin Audit Report

Audit and remediation for making the admin dashboard locale-dynamic (driven by `LocaleConfig` / `EntityTranslation`) instead of hardcoded en/ar pairs.

## Root causes (RC1–RC10)

| ID | Issue | Status |
|----|-------|--------|
| RC1 | `bilingualFieldValues` / `loadAdminRowsWithBilingualFields` dropped locales beyond en/ar | **Fixed** — `loadAdminRowsWithLocalizedFields()` + `legacyShapeFromTranslations()` |
| RC2 | Hardcoded en/ar form state in status, docs, KB, custom-404, post nested rows | **Fixed** — dynamic loaders + `NestedLocalizedRowInput` / `AdminLocalizedFormField` |
| RC3 | Admin edit mode showed English fallback for empty translations | **Fixed** — `resolveAdminFieldValue()` (no cross-locale fallback) |
| RC4 | Hidden locale fields could clobber translations on save | **Fixed** — `AdminLocalizedFormField` uses `useEntityTranslations` + controlled hidden inputs |
| RC5 | `SeoMetaForm` edited N locales but saved en/ar only | **Fixed** — dynamic `byLocale` + `getLocalizedFormFieldName()` on save |
| RC6 | Legacy `*En/*Ar` props in admin list UIs | **Partial** — list pages use `displayTitle`; some edit forms still expose legacy keys in types |
| RC7 | Mixed `titleEn` vs `title_fr` naming | **Mitigated** — `getLocalizedFormFieldName()` + parsers accept both |
| RC8 | Builder blocks partial coverage + legacy prop fallback | **Partial** — registry updated; nested announcement items not flat-translated |
| RC9 | Products separate locale path | **Verified OK** — uses `EntityTranslation` + admin locale switcher |
| RC10 | Hardcoded locale lists in routing fallback | **Acceptable** — DB overrides at runtime |

## Implementation by phase

### Phase 1 — Shared admin primitives

- `src/features/translation/admin-field-value.ts` — `resolveAdminFieldValue()`, hints without prefill
- `src/features/translation/form-field-names.ts` — `getLocalizedFormFieldName()`
- Updated: `localized-fields.tsx`, `admin-localized-text-field.tsx`, `admin-localized-form-field.tsx`, `localized-block-field.tsx`, `seo-meta-form.tsx`, footer/menu modals
- Tests: `admin-field-value.test.ts`, `localized-block-field.test.ts`

### Phase 2 — Admin loaders

- `loadAdminRowsWithLocalizedFields()` in `admin-entity-helpers.ts`
- List pages: FAQs, gallery, testimonials, content, post taxonomy, studio, discover filters

### Phase 3 — Tier-2 forms

- Status board: `status-board-form-data.ts`, `NestedLocalizedRowInput`, full form rewrite
- Doc portal: `doc-portal-form-data.ts`, versions/sections use active admin locale
- Knowledge base: `knowledge-base-form-data.ts`, categories/articles locale-dynamic
- Custom 404: single entity + `AdminLocalizedFormField` + header locale switcher
- Post editor: `entityType`/`entityId` + `legacyShapeFromTranslations` for title/excerpt/content

### Phase 4 — Builder

- `BLOCK_TRANSLATABLE_FIELDS`: explicit layout blocks (`spacer`, `divider`, `section`, `rowSection`), `announcementBar.separator`
- `resolveBuilderOptionTitle()` for gallery/FAQ/collection picker labels in preview + field editor
- Block inspector already uses `LocalizedBlockField` via `BlockTranslationProvider`

### Phase 5 — Legacy inventory & QA

#### Remaining `titleEn` / `titleAr` in admin (classification)

| Area | Files | Classification |
|------|-------|------------------|
| List page fallbacks | `faqs/page.tsx`, `gallery/page.tsx`, `testimonials/page.tsx` | **Safe shim** — `displayTitle` resolution with legacy keys as fallback |
| Post edit enrichments | `posts/[id]/page.tsx` | **Migration pending** — taxonomy picker still en/ar shaped |
| SEO admin | `seo/audit/page.tsx`, `structured-data` | **Legacy read** — low traffic |
| Gallery/FAQ forms | `gallery-*`, `faq-set-*`, `testimonial-*` | **Partial** — parent uses `AdminLocalizedFormField`; types still en/ar |
| Builder option types | `gallery/types.ts`, etc. | **Public read shim** — options loaded with en/ar; `resolveBuilderOptionTitle` reads dynamic keys when present |
| Seeds / scripts | `scripts/**`, `prisma/**` | **Migration script** — not admin UI |

#### QA matrix (add locale `fr`, verify)

| Section | Expected |
|---------|----------|
| Languages admin | Create/enable `fr` without code changes |
| CMS Pages | Load/edit/save/publish all locales; blocks + SEO |
| Posts | Title/excerpt/content per locale; SEO panel saves `fr` |
| Products | Slug + fields follow admin locale |
| Menus / Footer | Empty `fr` fields stay empty; save does not clobber `ar` |
| SEO Meta | All enabled locales persist |
| FAQ / Gallery / Testimonials | Lists show `displayTitle`; forms save N locales |
| Knowledge Base / Docs / Status | Nested rows edit via locale switcher |
| Custom 404 | Title/body per locale |
| Builder blocks | Inspector shows empty non-default locales; block copy saves via `EntityTranslation` |
| UI Messages | Already dynamic |

#### Verification commands

```bash
npm run test:i18n
tsx --test src/features/translation/__tests__/admin-field-value.test.ts
tsx --test src/features/translation/components/localized-block-field.test.ts
npm run i18n:verify-parity
```

## Known gaps (follow-up)

1. **Announcement bar items** — `message`/`title`/`description` live in nested `items[]`; not covered by flat `BLOCK_TRANSLATABLE_FIELDS`.
2. **Builder option loaders** — `fetchGalleriesForBuilder` etc. still populate `titleEn`/`titleAr`; extend to N-locale shapes when those APIs are refactored.
3. **Content item custom attributes** — suffix attrs, not `EntityTranslation`.
4. **Post taxonomy pickers** — categories/tags/authors enriched with en/ar only on edit page.
5. **`syncLegacyShapeTranslationsTx`** — seed/import helper still en/ar only (intentional for migrations).

## Architecture reference

```
LocaleConfig → EntityTranslation → translationService.resolveField (public, with fallback)
Admin edit:   resolveAdminFieldValue (no fallback) + hidden fields from DB state
Save:         parseFormTranslations / syncEntityTranslationsFromForm (all enabled locales)
Nested JSON:  NestedLocalizedRowInput + syncEntityRowTranslations
UI strings:   messages/*.json only (next-intl) — not EntityTranslation
URLs:         LocalizedSlug — independent from field translations
```

## Allowed / forbidden storage (unified architecture)

| Data | Allowed | Forbidden |
|------|---------|-----------|
| Locale list | `LocaleConfig` | Hardcoded locale arrays in feature modules |
| UI copy (buttons, labels) | `messages/*.json` | `UiMessage` DB, inline hardcoded strings in components |
| CMS/product/menu copy | `EntityTranslation` | `titleEn`/`titleAr` columns, suffixed JSON props |
| URLs | `LocalizedSlug` | Locale-specific slug fields on entity rows |
| Menu/footer layout | Workspace JsonStore | Display text in workspace JSON |
| Builder layout | Block JSON tree | Translatable strings in block props |
| Media files | Supabase Storage once | Per-locale file copies |
| Media metadata | `EntityTranslation` on `MediaAsset` | `altEn`/`altAr` columns |

Full spec: [unified-i18n-architecture.md](./unified-i18n-architecture.md)
