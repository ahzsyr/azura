import Link from "next/link";
import { cmsRepository } from "@/repositories/cms.repository";
import { CmsPagesTable } from "@/features/cms/components/cms-pages-table";
import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function PagesAdminPage() {
  const pages = await cmsRepository.listPages();

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
      <CmsPagesTable pages={pages} />
    </div>
  );
}
