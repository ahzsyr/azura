"use client";

import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";
import { StaticPagesSeoPanel } from "@/features/seo/admin/static-pages-seo-panel";
import type { PageSeoContext } from "@/features/seo/page-seo-context.types";

type Props = {
  contextsByKey: Record<string, PageSeoContext>;
};

export function AdminSeoHub({ contextsByKey }: Props) {
  return (
    <div className="space-y-6 max-w-6xl">
      <AdminPageHeader
        title="Metadata"
        description="Titles, descriptions, and Open Graph for static pages. Use Fix all for bulk updates."
      />
      <p className="text-sm text-muted-foreground">
        {STATIC_SEO_PAGES.length} static marketing pages. Dynamic CMS and blog SEO is edited on each
        page.{" "}
        <Link href="/admin/seo/autofill" className="text-primary hover:underline">
          Open auto-fill
        </Link>
        .
      </p>
      <StaticPagesSeoPanel contextsByKey={contextsByKey} />
    </div>
  );
}
