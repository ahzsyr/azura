"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { Button } from "@/components/ui/button";
import { CMS_WIRED_MARKETING_SLUGS } from "@/features/builder/constants";
import {
  CmsPagesTable,
  type CmsPageListRow,
} from "@/features/cms/components/cms-pages-table";

const PAGES_TABS = [
  { id: "marketing", label: "Marketing Pages" },
  { id: "cms", label: "CMS Pages" },
] as const;

type PagesTabId = (typeof PAGES_TABS)[number]["id"];

function isValidTab(value: string | null): value is PagesTabId {
  return value === "marketing" || value === "cms";
}

type Props = {
  pages: CmsPageListRow[];
};

export function CmsPagesAdminClient({ pages }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<PagesTabId>(() =>
    isValidTab(tabParam) ? tabParam : "marketing",
  );

  useEffect(() => {
    if (isValidTab(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    if (!isValidTab(tabId)) return;
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`/admin/pages?${params.toString()}`, { scroll: false });
  };

  const { marketingPages, cmsPages } = useMemo(() => {
    const marketing: CmsPageListRow[] = [];
    const cms: CmsPageListRow[] = [];
    for (const page of pages) {
      if (page.slug in CMS_WIRED_MARKETING_SLUGS) marketing.push(page);
      else cms.push(page);
    }
    return { marketingPages: marketing, cmsPages: cms };
  }, [pages]);

  const isMarketing = activeTab === "marketing";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pages"
        description={
          isMarketing
            ? "Wired marketing routes with clean public URLs (e.g. /en/hotels-transport). Publish with blocks to drive the live site."
            : "CMS pages under /en/pages/[slug]. Create custom pages here; wired marketing pages live on the Marketing tab."
        }
        actions={
          !isMarketing ? (
            <Button asChild>
              <Link href="/admin/pages/new">
                <Plus className="h-4 w-4 me-1" />
                New page
              </Link>
            </Button>
          ) : undefined
        }
      />
      <AdminSettingsLayout
        tabs={[...PAGES_TABS]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        layoutId="cms-pages-ribbon"
      >
        {(tab) => (
          <CmsPagesTable
            pages={tab === "marketing" ? marketingPages : cmsPages}
            emptyMessage={
              tab === "marketing"
                ? "No marketing pages yet. Run npm run cms:ensure-pages to seed wired routes."
                : "No CMS pages yet. Create your first page."
            }
            warnWiredDelete={tab === "marketing"}
          />
        )}
      </AdminSettingsLayout>
    </div>
  );
}
