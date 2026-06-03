import Link from "next/link";
import { cmsRepository } from "@/repositories/cms.repository";
import { CmsPagesTable } from "@/features/cms/components/cms-pages-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function PagesAdminPage() {
  const pages = await cmsRepository.listPages();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">CMS Pages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            CMS URLs: /en/pages/[slug] and /ar/pages/[slug]. Wired pages (home, about, contact, etc.)
            also drive live marketing routes when published with blocks.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/pages/new">
            <Plus className="h-4 w-4 me-1" />
            New page
          </Link>
        </Button>
      </div>
      <CmsPagesTable pages={pages} />
    </div>
  );
}
