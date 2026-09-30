"use client";

import Link from "next/link";
import { Copy, ExternalLink, Pencil, Trash2, Upload } from "lucide-react";
import type { ContentStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  CmsPageRowActions,
  type CmsPageListRow,
} from "@/features/cms/components/cms-page-row-actions";
import { CmsStatusBadge } from "@/features/cms/components/cms-status-badge";
import {
  publishCategoryPage,
  unpublishCategoryPage,
} from "@/features/pages/actions";
import type {
  UnifiedPageEntry,
  UnifiedPageStatus,
} from "@/features/pages/types";

type Props = {
  page: UnifiedPageEntry;
  cmsRow?: CmsPageListRow;
  localePrefix: string;
};

function toContentStatus(status?: UnifiedPageStatus): ContentStatus | null {
  switch (status) {
    case "published":
      return "PUBLISHED";
    case "draft":
      return "DRAFT";
    case "scheduled":
      return "SCHEDULED";
    case "archived":
      return "ARCHIVED";
    default:
      return null;
  }
}

function localizedViewHref(localePrefix: string, viewHref?: string): string | null {
  if (!viewHref) return null;
  const prefix = localePrefix.replace(/^\/+|\/+$/g, "") || "en";
  if (viewHref === "/" || viewHref === "") return `/${prefix}`;
  return viewHref.startsWith(`/${prefix}/`) || viewHref === `/${prefix}`
    ? viewHref
    : `/${prefix}${viewHref.startsWith("/") ? viewHref : `/${viewHref}`}`;
}

function unsupportedTitle(action: string, pageType: string): string {
  return `${action} is not available for ${pageType} pages`;
}

export function UnifiedPageRowActions({ page, cmsRow, localePrefix }: Props) {
  if (cmsRow) {
    return (
      <CmsPageRowActions
        page={cmsRow}
        warnWiredDelete={page.kind === "base"}
      />
    );
  }

  const contentStatus = toContentStatus(page.status) ?? "PUBLISHED";
  const isPublished = contentStatus === "PUBLISHED";
  const viewHref = localizedViewHref(localePrefix, page.viewHref);
  const canUnpublishCategory = page.kind === "category" && isPublished;
  const canPublishCategory = page.kind === "category" && !isPublished;
  const pageType = page.pageTypeLabel || page.kind;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CmsStatusBadge status={contentStatus} />
      <Button variant="outline" size="sm" asChild title="Edit page">
        <Link href={page.editHref}>
          <Pencil className="h-3 w-3 me-1" />
          Edit
        </Link>
      </Button>
      {viewHref ? (
        <Button variant="ghost" size="sm" asChild>
          <Link href={viewHref} target="_blank" rel="noopener noreferrer" title="View page">
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}
      {canPublishCategory ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            await publishCategoryPage(page.slug);
            window.location.reload();
          }}
        >
          <Upload className="h-3 w-3 me-1" />
          Publish
        </Button>
      ) : null}
      {canUnpublishCategory ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={async () => {
            await unpublishCategoryPage(page.slug);
            window.location.reload();
          }}
        >
          Unpublish
        </Button>
      ) : isPublished && page.kind !== "category" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled
          title={unsupportedTitle("Unpublish", pageType)}
        >
          Unpublish
        </Button>
      ) : !isPublished && page.kind !== "category" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          title={unsupportedTitle("Publish", pageType)}
        >
          <Upload className="h-3 w-3 me-1" />
          Publish
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled
        title={unsupportedTitle("Duplicate", pageType)}
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive"
        disabled
        title={unsupportedTitle("Delete", pageType)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
