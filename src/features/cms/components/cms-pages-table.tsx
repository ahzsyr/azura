"use client";

import type { CmsPage } from "@prisma/client";
import {
  deleteCmsPage,
  duplicateCmsPage,
  publishCmsPage,
  unpublishCmsPage,
} from "@/features/cms/actions";
import { CMS_WIRED_MARKETING_SLUGS } from "@/features/builder/constants";
import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import {
  AdminList,
  AdminListMeta,
  AdminListMetaSmall,
  AdminListRow,
  AdminListTitle,
} from "@/components/admin/layout/admin-list";
import { CmsStatusBadge } from "./cms-status-badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Pencil, Trash2, Upload } from "lucide-react";
import type { PageBlocks } from "@/types/builder";
import Link from "next/link";

export type CmsPageListRow = CmsPage & { displayTitle?: string };

function getBlockCount(blocks: unknown): number {
  return Array.isArray(blocks) ? blocks.length : 0;
}

function pageDisplayName(page: CmsPageListRow): string {
  return page.displayTitle?.trim() || page.slug;
}

function pageEditHref(pageId: string): string {
  return `/admin/pages/${pageId}?tab=content`;
}

type CmsPagesTableProps = {
  pages: CmsPageListRow[];
  emptyMessage?: string;
  /** When true, delete confirm warns that the slug is a wired marketing route. */
  warnWiredDelete?: boolean;
};

export function CmsPagesTable({
  pages,
  emptyMessage = "No pages yet. Create your first CMS page.",
  warnWiredDelete = false,
}: CmsPagesTableProps) {
  if (pages.length === 0) {
    return (
      <AdminList>
        <p className="p-8 text-center text-muted-foreground">{emptyMessage}</p>
      </AdminList>
    );
  }

  return (
    <AdminList>
      {pages.map((page) => {
        const blockCount = getBlockCount(page.blocks as PageBlocks);
        const livePath = CMS_WIRED_MARKETING_SLUGS[page.slug];
        const displayName = pageDisplayName(page);
        const isWired = livePath != null;

        return (
          <AdminListRow key={page.id}>
            <div className="min-w-0 flex-1">
              <AdminListTitle href={pageEditHref(page.id)}>{displayName}</AdminListTitle>
              <AdminListMeta>
                /en{getCmsPagePublicPath(page.slug)}
                {isWired && <> · live: /en{livePath || "/"}</>}
              </AdminListMeta>
              <AdminListMetaSmall>
                {blockCount} block{blockCount !== 1 ? "s" : ""}
                {page.templateKey ? ` · Template: ${page.templateKey}` : ""}
              </AdminListMetaSmall>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CmsStatusBadge status={page.status} scheduledAt={page.scheduledAt} />
              <Button variant="outline" size="sm" asChild title="Edit page content and blocks">
                <Link href={pageEditHref(page.id)}>
                  <Pencil className="h-3 w-3 me-1" />
                  Edit
                </Link>
              </Button>
              {page.status === "PUBLISHED" && (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/en${getCmsPagePublicPath(page.slug)}`} target="_blank" title="CMS page">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                  {isWired && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/en${livePath}`} target="_blank" title="Live marketing page">
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
                      ? ` This is a wired marketing route (/en${livePath || "/"}); the live URL will stop serving CMS content until the page is restored.`
                      : "";
                  if (confirm(`Delete "${displayName}"?${wiredWarn}`)) deleteCmsPage(page.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </AdminListRow>
        );
      })}
    </AdminList>
  );
}
