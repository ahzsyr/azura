# Locale fallback contract (Phase 3)

Canonical resolution for CMS content fields, localized slugs, related-content URLs, and SEO text fallbacks.

## Candidate chain

Implemented by `resolveLocaleCandidates` in `src/i18n/locale-resolution.ts`:

1. Requested locale (`fr-CA`)
2. Language base (`fr`) when hierarchical and enabled
3. Site default locale (DB `LocaleConfig.isDefault`, typically `en`)

Only **enabled** locales participate in the chain.

## Admin vs public

| Context | Behavior |
|---------|----------|
| **Admin editor** | Exact locale only. Missing value → empty. No cross-locale fill (prevents contaminating FR with EN while editing). |
| **Public request** | Walk the candidate chain until a non-empty published value is found. |
| **Draft Mode preview** | Same as public chain for layout, but EntityTranslation rows may include unpublished statuses (`includeUnpublished: true`). |

Helpers:

- `resolveFieldTranslation` / `resolveFieldTranslationFromBundle` — `src/features/translation/resolve-field-translation.ts`
- `resolveTranslation` — public chain over EntityTranslation rows
- `resolveAdminFieldValue` — admin exact (no fallback)
- `getLocalizedSlug` / `getLocalizedSlugFromBundle` / `resolveEntityByLocalizedSlug` — same candidate engine for slugs

## Translation stores

| Store | Role |
|-------|------|
| `EntityTranslation` | Live read/write for admin and public |
| `Revision.translations` Json | Immutable historical snapshot only (re-hydrated on restore) |

`PageAstDocument.meta.locale` is **edit/snapshot context** (which admin locale was active when the revision was created). It does **not** mean the AST is that language.

## SEO publication boundary

Anonymous SEO (metadata, canonical, hreflang, sitemap) uses **published revision + published translations** only. Working draft edits must not appear until atomic publish.

## Related docs

- [page-ast.md](./page-ast.md) — Page AST envelope
- [unified-i18n-architecture.md](../unified-i18n-architecture.md) — platform i18n layers
