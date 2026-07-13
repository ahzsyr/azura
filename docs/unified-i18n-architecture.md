# Unified Internationalization (i18n) Architecture

## Overview

The platform uses a unified multilingual architecture for scalability, maintainability, and consistent behavior across public and admin interfaces.

Language management, UI translations, and content translations are separate layers with a single source of truth for locale configuration and content localization.

Built on Next.js, Supabase Database, Supabase Storage, and next-intl.

## Layers

| # | Layer | Storage | Rule |
|---|-------|---------|------|
| 1 | Locale management | `LocaleConfig` | Single source of truth for enabled languages, defaults, RTL/LTR, URL prefixes |
| 2 | UI translations | `messages/*.json` | File-based only via next-intl; not in `EntityTranslation` |
| 3 | Content translations | `EntityTranslation` | All dynamic business content |
| 4 | Localized URLs | `LocalizedSlug` | Independent from content field translations |
| 5 | Resolution | `translationService.resolveField` | Single resolver for server-side content reads |
| 6 | Header/footer | Workspace JSON + `EntityTranslation` | Structure in JSON; display text in ET |
| 7 | Builder | Block JSON + `EntityTranslation` | Structure/settings in JSON; copy in ET |
| 8 | Media | Supabase Storage + `EntityTranslation` | Files once; alt/caption/title/description translated |
| 9 | Admin editing locale | Zustand + provider | Controls which locale admins edit; never changes structure |

## Migration status

See [i18n-admin-audit.md](./i18n-admin-audit.md) for per-module status and QA matrix.

### Allowed storage

- `LocaleConfig` — locale metadata
- `messages/{code}.json` — UI strings
- `EntityTranslation` — all translatable content fields
- `LocalizedSlug` — per-locale URLs
- JsonStore workspace namespaces — menu/footer **structure only** (no display text after Phase 3)
- Builder block JSON — layout/settings only (no translatable copy after Phase 4)

### Forbidden storage (target)

- `UiMessage` database table
- `titleEn` / `titleAr` columns or suffixed props on entities
- Display text in header/footer workspace JSON
- Translatable text embedded in builder block props
- Module-specific translation tables or custom lookup logic

## Adding a new language

1. Create a `LocaleConfig` entry in `/admin/languages`
2. Scaffold `messages/{code}.json` (auto on locale create)
3. Add translated content via `EntityTranslation` (admin locale switcher or bulk scaffold)

## Verification

```bash
npm run test:i18n
npm run i18n:verify-parity
npm run i18n:verify-architecture
```
