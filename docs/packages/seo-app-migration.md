# Advanced SEO app migration

Status: later. Do this only after the installer, dynamic admin, and package ledger are in use.

Advanced SEO stays inside Core today. The read path (`SeoMeta`, sitemap, redirects, basic SEO admin) remains Core. The write path under `src/features/seo/platform/` becomes an app package.

## Move

- Manifest kind `app`, id `advanced-seo`, depending on Core SEO services.
- Admin nav items that are currently the Advanced SEO group become contributions of this package.
- Basic SEO links stay in Core and stay visible when the app is inactive.
- Package SQL is only for tables that are created after the split. Existing Prisma models stay until a reviewed migration copies them.

## Guards

- Activating the app and any required presets happens in one installer save.
- Deactivating it removes its admin links and routes together.
- Pages that store SEO fields continue to render. The public metadata read path does not check the app flag.
