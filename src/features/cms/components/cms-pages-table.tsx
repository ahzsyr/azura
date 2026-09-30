"use client";

import { CMS_WIRED_MARKETING_SLUGS } from "@/features/cms/cms-wired-slugs";
import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import {
  AdminList,
  AdminListMeta,
  AdminListMetaSmall,
  AdminListRow,
  AdminListTitle,
} from "@/components/admin/layout/admin-list";
import {
  CmsPageRowActions,
  cmsPageDisplayName,
  cmsPageEditHref,
  type CmsPageListRow,
} from "./cms-page-row-actions";
import type { PageBlocks } from "@/types/builder";

export type { CmsPageListRow };

function getBlockCount(blocks: unknown): number {
  return Array.isArray(blocks) ? blocks.length : 0;
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
        const displayName = cmsPageDisplayName(page);
        const isWired = livePath != null;

        return (
          <AdminListRow key={page.id}>
            <div className="min-w-0 flex-1">
              <AdminListTitle href={cmsPageEditHref(page.id)}>{displayName}</AdminListTitle>
              <AdminListMeta>
                /en{getCmsPagePublicPath(page.slug)}
                {isWired && <> · live: /en{livePath || "/"}</>}
              </AdminListMeta>
              <AdminListMetaSmall>
                {blockCount} block{blockCount !== 1 ? "s" : ""}
                {page.templateKey ? ` · Template: ${page.templateKey}` : ""}
              </AdminListMetaSmall>
            </div>
            <CmsPageRowActions page={page} warnWiredDelete={warnWiredDelete} />
          </AdminListRow>
        );
      })}
    </AdminList>
  );
}
