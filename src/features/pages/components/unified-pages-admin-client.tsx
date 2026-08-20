"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Plus, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import {
  AdminList,
  AdminListMeta,
  AdminListMetaSmall,
  AdminListRow,
  AdminListTitle,
} from "@/components/admin/layout/admin-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CMS_WIRED_MARKETING_SLUGS } from "@/features/cms/cms-wired-slugs";
import { CmsPagesTable, type CmsPageListRow } from "@/features/cms/components/cms-pages-table";
import {
  UNIFIED_PAGES_TABS,
  type UnifiedPageEntry,
  type UnifiedPagesTabId,
} from "@/features/pages/types";
import {
  formatLayoutAssignmentLabel,
  validateTemplateId,
} from "@/features/products/layout-templates/registry-meta";
import { ProductPageDesignAdminClient } from "@/features/pages/components/product-page-design-admin-client";
import type { ProductPageDesignInitialProps } from "@/features/pages/load-product-page-design-props";

type Props = {
  pages: UnifiedPageEntry[];
  cmsRows: CmsPageListRow[];
  productPageDesign: ProductPageDesignInitialProps;
};

function isValidTab(value: string | null): value is UnifiedPagesTabId {
  return UNIFIED_PAGES_TABS.some((tab) => tab.id === value);
}

function kindBadgeVariant(kind: UnifiedPageEntry["kind"]) {
  switch (kind) {
    case "base":
      return "secondary" as const;
    case "cms":
      return "default" as const;
    case "product-config":
      return "outline" as const;
    case "category":
    case "brand":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export function UnifiedPagesAdminClient({
  pages,
  cmsRows,
  productPageDesign,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<UnifiedPagesTabId>(() =>
    isValidTab(tabParam) ? tabParam : "all",
  );
  const [query, setQuery] = useState("");

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

  const filteredPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pages.filter((page) => {
      const tabMatch =
        activeTab === "all" ||
        (activeTab === "base" && page.kind === "base") ||
        (activeTab === "cms" && page.kind === "cms") ||
        (activeTab === "product" && page.kind === "product-config") ||
        (activeTab === "category" && page.kind === "category") ||
        (activeTab === "brand" && page.kind === "brand") ||
        (activeTab === "other" && page.kind === "other");
      if (!tabMatch) return false;
      if (!q) return true;
      return (
        page.title.toLowerCase().includes(q) ||
        page.slug.toLowerCase().includes(q) ||
        page.pageTypeLabel.toLowerCase().includes(q) ||
        page.kind.toLowerCase().includes(q)
      );
    });
  }, [pages, activeTab, query]);

  const cmsOnlyRows = useMemo(() => {
    const rows = cmsRows.filter((p) => !(p.slug in CMS_WIRED_MARKETING_SLUGS));
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) => {
      const title = (p.displayTitle || p.slug).toLowerCase();
      return title.includes(q) || p.slug.toLowerCase().includes(q);
    });
  }, [cmsRows, query]);

  const showSearch = activeTab !== "product";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pages"
        description="Unified page index across marketing, CMS, catalog, and product layout settings. Edits open in the source editor for each page type."
      />

      {showSearch ? (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, slug, or page type…"
            className="pl-9"
          />
        </div>
      ) : null}

      <AdminSettingsLayout
        tabs={UNIFIED_PAGES_TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        layout="wrap"
        layoutId="unified-pages-ribbon"
      >
        {(tab) => {
          if (tab === "cms") {
            return (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button asChild>
                    <Link href="/admin/pages/new">
                      <Plus className="h-4 w-4 me-1" />
                      New CMS page
                    </Link>
                  </Button>
                </div>
                <CmsPagesTable
                  pages={cmsOnlyRows}
                  emptyMessage="No CMS pages yet. Create your first page."
                />
              </div>
            );
          }

          if (tab === "product") {
            return <ProductPageDesignAdminClient {...productPageDesign} />;
          }

          return (
            <UnifiedPagesTable pages={filteredPages} />
          );
        }}
      </AdminSettingsLayout>
    </div>
  );
}

function UnifiedPagesTable({ pages }: { pages: UnifiedPageEntry[] }) {
  if (pages.length === 0) {
    return (
      <AdminList>
        <p className="p-8 text-center text-sm text-muted-foreground">
          No pages match this filter.
        </p>
      </AdminList>
    );
  }

  return (
    <AdminList>
      {pages.map((page) => (
        <AdminListRow key={page.id}>
          <div className="min-w-0 flex-1">
            <AdminListTitle href={page.editHref}>{page.title}</AdminListTitle>
            <AdminListMeta>
              <Badge variant={kindBadgeVariant(page.kind)} className="me-2">
                {page.pageTypeLabel}
              </Badge>
              {page.publicPath}
            </AdminListMeta>
            <AdminListMetaSmall>
              slug: {page.slug}
              {page.status ? ` · ${page.status}` : ""}
              {" · "}
              {page.layoutAssignmentLabel ||
                (page.layoutTemplate
                  ? formatLayoutAssignmentLabel(
                      validateTemplateId(page.layoutTemplate),
                      "site",
                    )
                  : "layout: —")}
            </AdminListMetaSmall>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={page.editHref}>Edit</Link>
            </Button>
            {page.viewHref ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={page.viewHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        </AdminListRow>
      ))}
    </AdminList>
  );
}
