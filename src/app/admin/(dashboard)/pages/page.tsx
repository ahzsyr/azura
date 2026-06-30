import Link from "next/link";
import { cmsRepository } from "@/repositories/cms.repository";
import { CmsPagesTable } from "@/features/cms/components/cms-pages-table";
import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
    <div className="space-y-6">
      <AdminPageHeader
        title="CMS Pages"
        description="CMS URLs: /en/pages/[slug]. Wired pages (home, about, contact, etc.) also drive live marketing routes when published with blocks."
        actions={
          <Button asChild>
            <Link href="/admin/pages/new">
              <Plus className="h-4 w-4 me-1" />
              New page
            </Link>
          </Button>
        }
      />
      <CmsPagesTable pages={rows} />
    </div>
  );
}
