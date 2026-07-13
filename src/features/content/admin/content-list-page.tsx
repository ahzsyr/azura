"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import type { ContentType } from "@prisma/client";
import type { ContentListItem } from "@/features/content/types";
import {
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
import { getBuiltinContentType } from "@/features/content/content-type.registry";
import { useAdminFormState } from "@/hooks/use-admin-form";

function getAspectClass(aspect: string): string {
  switch (aspect) {
    case "16:9": return "aspect-video";
    case "4:3":  return "aspect-[4/3]";
    case "1:1":  return "aspect-square";
    case "3:4":  return "aspect-[3/4]";
    default:     return "aspect-auto min-h-[8rem]";
  }
}

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
  const router = useRouter();

  // Read saved image aspect ratio from contentType settings (set in the content type config page).
  const imageAspect =
    ((contentType.adminConfig as Record<string, unknown>)?.adminListImageAspect as string) ?? "16:9";

  const typeSlug = contentType.slug;
  const builtin = getBuiltinContentType(typeSlug);
  const typeName =
    readAdminDefaultLocaleField(contentType, "name", "") || builtin?.nameEn || typeSlug;
  const pluralLabel =
    readAdminDefaultLocaleField(contentType, "labelPlural", "") ||
    builtin?.labelPluralEn ||
    contentType.displayTitle ||
    typeSlug;
  const singularLabel =
    readAdminDefaultLocaleField(contentType, "labelSingular", "") ||
    builtin?.labelSingularEn ||
    "item";

  // Local ordered copy for staged drag-reorder (not committed until Save is clicked).
  const [localItems, setLocalItems] = useState<ContentListItem[]>(items);
  // Track the last server-fetched snapshot so we can detect staged divergence.
  const serverSnapshotRef = useRef(items.map((i) => i.id).join(","));

  // When the server refreshes items (e.g. after delete / visibility toggle), re-sync
  // local order only if the user has not staged any reorder changes.
  useEffect(() => {
    const serverIds = items.map((i) => i.id).join(",");
    const hasStaged = localItems.map((i) => i.id).join(",") !== serverSnapshotRef.current;
    serverSnapshotRef.current = serverIds;
    if (!hasStaged) {
      setLocalItems(items);
    } else {
      // Keep staged order but sync data (handle added / deleted items).
      const serverMap = new Map(items.map((i) => [i.id, i]));
      setLocalItems((prev) => {
        const updated = prev
          .filter((i) => serverMap.has(i.id))
          .map((i) => serverMap.get(i.id)!);
        const existingIds = new Set(updated.map((i) => i.id));
        const added = items.filter((i) => !existingIds.has(i.id));
        return [...updated, ...added];
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const hasOrderChanges =
    localItems.map((i) => i.id).join(",") !== serverSnapshotRef.current;

  // Draft items available for bulk publish.
  const draftItems = localItems.filter((i) => i.status !== "PUBLISHED" || !i.isVisible);

  const handleSaveOrder = useCallback(async () => {
    await reorderContentItems(typeSlug, localItems.map((i) => i.id));
    serverSnapshotRef.current = localItems.map((i) => i.id).join(",");
    router.refresh();
  }, [typeSlug, localItems, router]);

  const handleCancelOrder = useCallback(() => {
    const serverIds = serverSnapshotRef.current.split(",").filter(Boolean);
    const serverMap = new Map(localItems.map((i) => [i.id, i]));
    const reverted = serverIds.map((id) => serverMap.get(id)).filter(Boolean) as ContentListItem[];
    setLocalItems(reverted);
  }, [localItems]);

  const handlePublishAll = useCallback(async () => {
    for (const item of draftItems) {
      if (item.status !== "PUBLISHED") {
        await setContentItemStatus(item.id, "PUBLISHED");
      }
      if (!item.isVisible) {
        await toggleContentItemVisibility(item.id, true);
      }
    }
    router.refresh();
  }, [draftItems, router]);

  const { markUnsaved } = useAdminFormState({
    onSave: hasOrderChanges ? handleSaveOrder : undefined,
    onCancel: hasOrderChanges ? handleCancelOrder : undefined,
    canCancel: hasOrderChanges,
    onPublish: draftItems.length > 0 ? handlePublishAll : undefined,
    canPublish: draftItems.length > 0,
    publishLabel: draftItems.length > 0 ? `Publish all (${draftItems.length})` : undefined,
    publishTooltip: `Publish ${draftItems.length} draft item${draftItems.length === 1 ? "" : "s"}`,
    saveLabel: "Save order",
    saveTooltip: "Save the new sort order",
    selfManagedSaveStatus: false,
  });

  // Called by EntityListManager when user reorders via drag in staged mode.
  // Only active when search is empty so the full list is visible.
  const handleStagedReorder = useCallback(
    (reordered: CatalogListItem[]) => {
      const idMap = new Map(localItems.map((i) => [i.id, i]));
      const next = reordered.map((c) => idMap.get(c.id)).filter(Boolean) as ContentListItem[];
      setLocalItems(next);
      markUnsaved();
    },
    [localItems, markUnsaved],
  );

  const isSearchActive = Boolean(search.trim());

  const filtered = isSearchActive
    ? localItems.filter(
        (i) =>
          i.titleEn.toLowerCase().includes(search.toLowerCase()) ||
          i.titleAr.includes(search) ||
          (i.slug?.includes(search) ?? false),
      )
    : localItems;

  return (
    <div className="space-y-6">
      <ContentAdminTabs breadcrumbs={[{ label: pluralLabel }]} />
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
          <div className="flex flex-col gap-3">
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
          </div>
        </CardHeader>
        <CardContent>
          <EntityListManager
            items={filtered.map(toCatalogListItem)}
            emptyMessage={`No ${pluralLabel.toLowerCase()} yet.`}
            imageAspectClass={getAspectClass(imageAspect)}
            onReorder={(ids) => reorderContentItems(typeSlug, ids)}
            onStagedReorder={isSearchActive ? undefined : handleStagedReorder}
            onTogglePublished={(id, isPublished) =>
              isPublished
                ? setContentItemStatus(id, "PUBLISHED").then(() =>
                    toggleContentItemVisibility(id, true),
                  )
                : toggleContentItemVisibility(id, false)
            }
            onDelete={(id) => softDeleteContentItem(id)}
          />

          {filtered.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
              <Badge variant="outline">
                {localItems.filter((i) => i.status === "PUBLISHED").length} published
              </Badge>
              <Badge variant="outline">
                {localItems.filter((i) => i.isFeatured).length} featured
              </Badge>
              <Badge variant="outline">
                {localItems.filter((i) => i.status === "DRAFT").length} drafts
              </Badge>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
