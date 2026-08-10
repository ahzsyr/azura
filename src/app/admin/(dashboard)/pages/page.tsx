import { Suspense } from "react";
import { cmsRepository } from "@/repositories/cms.repository";
import { CmsPagesAdminClient } from "@/features/cms/components/cms-pages-admin-client";
import { prisma } from "@/lib/prisma";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { localeService } from "@/features/i18n/locale.service";

export default async function PagesAdminPage() {
  const pages = await cmsRepository.listPages();
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

  const rows = pages.map((page) => ({
    ...page,
    displayTitle: resolveTranslation("title", defaultCode, { translations: byPage.get(page.id) }),
  }));

  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading pages…</div>}>
      <CmsPagesAdminClient pages={rows} />
    </Suspense>
  );
}
