"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import type { ContentType } from "@prisma/client";
import type { ContentListItem } from "@/features/content/types";
import {
  duplicateContentItem,
  reorderContentItems,
  setContentItemStatus,
  softDeleteContentItem,
  toggleContentItemVisibility,
} from "@/features/content/actions";
import { EntityListManager } from "@/features/catalog/admin/entity-list-manager";
import type { CatalogListItem } from "@/features/catalog/types";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentAdminTabs } from "@/features/content/admin/content-admin-tabs";
import {
  readAdminDefaultLocaleField,
  type AdminLocalizedEntityView,
} from "@/features/translation/admin-localized-view";

type Props = {
  contentType: AdminLocalizedEntityView<ContentType>;
  items: ContentListItem[];
  initialSearch?: string;
};

function toCatalogListItem(item: ContentListItem): CatalogListItem {
  return {
    id: item.id,
    titleEn: item.titleEn,
    titleAr: item.titleAr,
    subtitle: item.subtitle,
    thumbnailUrl: item.thumbnailUrl,
    isPublished: item.status === "PUBLISHED" && item.isVisible,
    sortOrder: item.sortOrder,
    badge: item.badge,
    meta: item.meta,
    editHref: item.editHref,
  };
}

export function ContentListPage({ contentType, items, initialSearch = "" }: Props) {
  const [search, setSearch] = useState(initialSearch);
  const typeSlug = contentType.slug;
  const typeName = readAdminDefaultLocaleField(contentType, "name", contentType.displayTitle);
  const pluralLabel = readAdminDefaultLocaleField(
    contentType,
    "labelPlural",
    contentType.displayTitle
  );
  const singularLabel = readAdminDefaultLocaleField(contentType, "labelSingular", "item");

  const filtered = search.trim()
    ? items.filter(
        (i) =>
          i.titleEn.toLowerCase().includes(search.toLowerCase()) ||
          i.titleAr.includes(search) ||
          (i.slug?.includes(search) ?? false)
      )
    : items;

  return (
    <div className="space-y-6">
      <ContentAdminTabs />
      <AdminPageHeader
        title={pluralLabel}
        description={typeName}
        actions={
          <Button asChild>
            <Link href={`/admin/content/${typeSlug}/new`}>
              <Plus className="h-4 w-4 me-1" />
              Add {singularLabel.toLowerCase()}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">All items</CardTitle>
              <CardDescription>
                {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                {search ? ` matching "${search}"` : ""}
              </CardDescription>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search title or slug…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EntityListManager
            items={filtered.map(toCatalogListItem)}
            emptyMessage={`No ${pluralLabel.toLowerCase()} yet.`}
            onReorder={(ids) => reorderContentItems(typeSlug, ids)}
            onTogglePublished={(id, isPublished) =>
              isPublished
                ? setContentItemStatus(id, "PUBLISHED").then(() => toggleContentItemVisibility(id, true))
                : toggleContentItemVisibility(id, false)
            }
            onDelete={(id) => softDeleteContentItem(id)}
          />

          {filtered.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
              <Badge variant="outline">{items.filter((i) => i.status === "PUBLISHED").length} published</Badge>
              <Badge variant="outline">{items.filter((i) => i.isFeatured).length} featured</Badge>
              <Badge variant="outline">{items.filter((i) => i.status === "DRAFT").length} drafts</Badge>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
