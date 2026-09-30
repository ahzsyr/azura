"use client";

import type { CmsPage } from "@prisma/client";
import {
  deleteCmsPage,
  duplicateCmsPage,
  publishCmsPage,
  unpublishCmsPage,
} from "@/features/cms/actions";
import { CMS_WIRED_MARKETING_SLUGS } from "@/features/cms/cms-wired-slugs";
import { getCmsPageLocalizedPublicPath } from "@/features/cms/cms-page-path";
import { CmsStatusBadge } from "./cms-status-badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Pencil, Trash2, Upload } from "lucide-react";
import Link from "next/link";

export type CmsPageListRow = CmsPage & { displayTitle?: string };

export function cmsPageDisplayName(page: CmsPageListRow): string {
  return page.displayTitle?.trim() || page.slug;
}

export function cmsPageEditHref(pageId: string): string {
  return `/admin/pages/${pageId}?tab=content`;
}

type CmsPageRowActionsProps = {
  page: CmsPageListRow;
  /** When true, delete confirm warns that the slug is a wired marketing route. */
  warnWiredDelete?: boolean;
};

export function CmsPageRowActions({
  page,
  warnWiredDelete = false,
}: CmsPageRowActionsProps) {
  const livePath = CMS_WIRED_MARKETING_SLUGS[page.slug];
  const displayName = cmsPageDisplayName(page);
  const isWired = livePath != null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CmsStatusBadge status={page.status} scheduledAt={page.scheduledAt} />
      <Button variant="outline" size="sm" asChild title="Edit page content and blocks">
        <Link href={cmsPageEditHref(page.id)}>
          <Pencil className="h-3 w-3 me-1" />
          Edit
        </Link>
      </Button>
      {page.status === "PUBLISHED" && (
        <>
          <Button variant="ghost" size="sm" asChild>
            <Link href={getCmsPageLocalizedPublicPath("en", page.slug)} target="_blank" title="CMS page">
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
          {isWired && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={getCmsPageLocalizedPublicPath("en", page.slug.replace(/^\/+/, ""))} target="_blank" title="Live marketing page">
                <ExternalLink className="h-4 w-4 text-primary" />
              </Link>
            </Button>
          )}
        </>
      )}
      {page.status !== "PUBLISHED" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            await publishCmsPage(page.id);
            window.location.reload();
          }}
        >
          <Upload className="h-3 w-3 me-1" />
          Publish
        </Button>
      )}
      {page.status === "PUBLISHED" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={async () => {
            await unpublishCmsPage(page.id);
            window.location.reload();
          }}
        >
          Unpublish
        </Button>
      )}
      <Button type="button" variant="ghost" size="sm" onClick={() => duplicateCmsPage(page.id)}>
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive"
        onClick={() => {
          const wiredWarn =
            warnWiredDelete && isWired
              ? ` This is a wired marketing route (${getCmsPageLocalizedPublicPath("en", page.slug)}); the live URL will stop serving CMS content until the page is restored.`
              : "";
          if (confirm(`Delete "${displayName}"?${wiredWarn}`)) deleteCmsPage(page.id);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
