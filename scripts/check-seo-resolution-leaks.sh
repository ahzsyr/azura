#!/usr/bin/env sh
# Fail CI when SEO resolution logic leaks into routes or CMS components.
set -e
if rg -q "pageKeyTranslations|buildCmsPageEditorSeoContext|loadCoalescedStaticPageSeo" \
  src/app src/features/cms \
  --glob '!**/resolve-page-seo-context*' \
  --glob '!**/__tests__/**' \
  --glob '!**/cms-page-seo-context.ts'; then
  echo "SEO resolution leak detected: routes must use resolvePageSeoContext() only."
  exit 1
fi
echo "No SEO resolution leaks in routes."
