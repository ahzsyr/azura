import { Suspense } from "react";
import { cmsRepository } from "@/repositories/cms.repository";
import { prisma } from "@/lib/prisma";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { localeService } from "@/features/i18n/locale.service";
import { UnifiedPagesAdminClient } from "@/features/pages/components/unified-pages-admin-client";
import {
  getDefaultLocalePrefix,
  listUnifiedPages,
} from "@/features/pages/page-registry.service";
import { loadProductPageDesignInitialProps } from "@/features/pages/load-product-page-design-props";

export default async function PagesAdminPage() {
  const [pages, defaultPrefix, productPageDesign] = await Promise.all([
    cmsRepository.listPages(),
    getDefaultLocalePrefix(),
    loadProductPageDesignInitialProps(),
  ]);
  const enabledLocales = await localeService.listEnabled();
  const defaultCode = enabledLocales.find((l) => l.isDefault)?.code ?? "en";
  const translations = pages.length
    ? await prisma.entityTranslation.findMany({
        where: { entityType: "CmsPage", entityId: { in: pages.map((p) => p.id) }, field: "title" },
      })
    : [];
  const byPage = new Map<string, typeof translations>();
  for (const row of translations) {
    const list = byPage.get(row.entityId) ?? [];
    list.push(row);
    byPage.set(row.entityId, list);
  }

  const cmsDisplayTitles = new Map<string, string>();
  const cmsRows = pages.map((page) => {
    const displayTitle = resolveTranslation("title", defaultCode, {
      translations: byPage.get(page.id),
    });
    cmsDisplayTitles.set(page.id, displayTitle);
    return { ...page, displayTitle };
  });

  const unifiedPages = await listUnifiedPages({
    cmsPages: pages,
    cmsDisplayTitles,
    localePrefix: defaultPrefix,
  });

  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading pages…</div>}>
      <UnifiedPagesAdminClient
        pages={unifiedPages}
        cmsRows={cmsRows}
        productPageDesign={productPageDesign}
      />
    </Suspense>
  );
}
