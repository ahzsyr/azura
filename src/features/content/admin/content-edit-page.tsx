"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { replaceBrowserUrl } from "@/lib/editor-url-sync";
import Link from "next/link";
import { Copy, ExternalLink } from "lucide-react";
import type { ContentCollection, ContentItem, ContentItemMedia, ContentType } from "@prisma/client";
import { EntityAdminShell } from "@/features/catalog/admin/entity-admin-shell";
import { EntityDisplayPreview } from "@/features/catalog/admin/entity-display-preview";
import { BlockEditor } from "@/features/builder/components/block-editor";
import {
  duplicateContentItem,
  setContentItemStatus,
  upsertContentItem,
} from "@/features/content/actions";
import { resolveFieldSchema } from "@/features/content/content-type.registry";
import { ContentItemFormFields } from "@/features/content/admin/content-item-form-fields";
import { ContentMediaManager } from "@/features/content/admin/content-media-manager";
import { ContentMediaSortList } from "@/features/content/admin/content-media-sort-list";
import { mergeDisplaySettings } from "@/schemas/content/display-settings";
import type { PublicLocale } from "@/i18n/locale-config";
import type { EntityTranslation } from "@prisma/client";
import {
  BlockTranslationProvider,
  BlockTranslationsHiddenInput,
} from "@/features/builder/block-translation-context";
import { getContentFieldSuffix } from "@/i18n/locale-config";
import { updateBlockInTree } from "@/features/builder/block-tree";
import { migrateBlocksToBlockSystem } from "@/features/builder/migration/upgrade-blocks";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import {
  isBlockInspectorTab,
  type BlockInspectorTabId,
} from "@/features/builder/constants/block-inspector-tabs";
import type { PageBlocks } from "@/types/builder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LocaleTabPanel } from "@/features/translation/components/locale-tab-panel";
import { LocalizedSlugEditor } from "@/features/translation/components/localized-slug-editor";
import { useAdminUiStore } from "@/stores/admin-ui-store";

const TABS = [
  { id: "details", label: "Details" },
  { id: "blocks", label: "Blocks" },
  { id: "add-media", label: "Add Media" },
  { id: "media", label: "Media" },
  { id: "display", label: "Display" },
  { id: "settings", label: "Settings" },
] as const;

const TAB_IDS = new Set<string>(TABS.map((t) => t.id));

function isContentTab(id: string | null): id is (typeof TABS)[number]["id"] {
  return id != null && TAB_IDS.has(id);
}

type ItemWithType = ContentItem & {
  contentType: ContentType;
  collection: ContentCollection | null;
  media: ContentItemMedia[];
};

type Props = {
  item?: ItemWithType;
  contentType: ContentType;
  collections: ContentCollection[];
  isNew?: boolean;
  locales: PublicLocale[];
  initialBlockTranslations?: EntityTranslation[];
  initialItemTranslations?: EntityTranslation[];
};

export function ContentEditPage({
  item,
  contentType,
  collections,
  isNew,
  locales,
  initialBlockTranslations = [],
  initialItemTranslations = [],
}: Props) {
  const router = useRouter();
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const blockParam = searchParams.get("block");
  const inspectorParam = searchParams.get("inspector");

  const [newItemTab, setNewItemTab] = useState("details");
  const [activeTab, setActiveTab] = useState(() => {
    if (!item?.id) return "details";
    return isContentTab(tabParam) ? tabParam : "details";
  });

  const [blocks, setBlocks] = useState<PageBlocks>(() => (item?.blocks as PageBlocks) ?? []);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(blockParam);
  const [inspectorTab, setInspectorTab] = useState<BlockInspectorTabId>(() =>
    isBlockInspectorTab(inspectorParam) ? inspectorParam : "content"
  );

  useEffect(() => {
    if (item?.id && isContentTab(tabParam)) setActiveTab(tabParam);
  }, [item?.id, tabParam]);

  useEffect(() => {
    setSelectedBlockId(blockParam);
  }, [blockParam]);

  useEffect(() => {
    if (isBlockInspectorTab(inspectorParam)) setInspectorTab(inspectorParam);
  }, [inspectorParam]);

  const displayActiveTab = item?.id
    ? activeTab
    : isContentTab(newItemTab)
      ? newItemTab
      : "details";

  const itemBlocksKey = item ? JSON.stringify(item.blocks) : "";
  useEffect(() => {
    if (!item) return;
    setBlocks(migrateBlocksToBlockSystem((item.blocks as PageBlocks) ?? []).blocks);
  }, [item?.id, itemBlocksKey]);

  const syncContentEditorUrl = useCallback(
    (params: URLSearchParams) => {
      if (!item?.id) return;
      replaceBrowserUrl(`/admin/content/${contentType.slug}/${item.id}?${params.toString()}`);
    },
    [contentType.slug, item?.id]
  );

  const handleTabChange = useCallback(
    (tabId: string) => {
      if (!item?.id) {
        setNewItemTab(tabId);
        return;
      }
      if (!isContentTab(tabId)) return;
      setActiveTab(tabId);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tabId);
      if (tabId !== "blocks") {
        params.delete("block");
        params.delete("inspector");
      } else if (selectedBlockId) {
        params.set("block", selectedBlockId);
        params.set("inspector", inspectorTab);
      }
      syncContentEditorUrl(params);
    },
    [contentType.slug, inspectorTab, item?.id, searchParams, selectedBlockId, syncContentEditorUrl]
  );

  const handleSelectBlock = useCallback(
    (id: string | null) => {
      setSelectedBlockId(id);
      if (!item?.id) return;
      setActiveTab("blocks");
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "blocks");
      if (id) params.set("block", id);
      else params.delete("block");
      params.set("inspector", inspectorTab);
      syncContentEditorUrl(params);
    },
    [contentType.slug, inspectorTab, item?.id, searchParams, syncContentEditorUrl]
  );

  const handleInspectorTabChange = useCallback(
    (tab: BlockInspectorTabId) => {
      setInspectorTab(tab);
      if (!item?.id) return;
      setActiveTab("blocks");
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "blocks");
      params.set("inspector", tab);
      if (selectedBlockId) params.set("block", selectedBlockId);
      syncContentEditorUrl(params);
    },
    [contentType.slug, item?.id, searchParams, selectedBlockId, syncContentEditorUrl]
  );

  const handleLegacyPropUpdate = (
    blockId: string,
    field: string,
    localeCode: string,
    value: string
  ) => {
    const suffix = getContentFieldSuffix(localeCode);
    if (suffix !== "En" && suffix !== "Ar") return;
    markUnsaved();
    setBlocks((prev) =>
      updateBlockInTree(prev, blockId, (block) =>
        patchBlockSettings(block, { [`${field}${suffix}`]: value }),
      ),
    );
  };

  const handleCancel = useCallback(() => {
    router.refresh();
  }, [router]);

  const [pending, startTransition] = useTransition();
  const fields = resolveFieldSchema(contentType, contentType.slug);
  const attributes = (item?.attributes ?? {}) as Record<string, unknown>;
  const displaySettings = mergeDisplaySettings(item?.displaySettings as Record<string, unknown>);

  const handleDuplicate = () => {
    if (!item) return;
    startTransition(async () => {
      await duplicateContentItem(item.id);
    });
  };

  const previewHref =
    item?.slug && contentType.routePrefix
      ? `/en/${contentType.routePrefix === "packages" ? `packages/${item.slug}` : contentType.routePrefix}`
      : contentType.routePrefix
        ? `/en/${contentType.routePrefix}`
        : undefined;

  const renderTabPanel = (tab: string) => {
    if (isNew && tab !== "details") {
      return (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Save the item first to manage {tab.replace("-", " ")}.
        </p>
      );
    }

    if (tab === "details") {
      return (
        <>
          {isNew ? (
            <>
              <input type="hidden" name="status" value="DRAFT" />
              <input type="hidden" name="isVisible" value="true" />
              <input type="hidden" name="isFeatured" value="false" />
              <input type="hidden" name="sortOrder" value="0" />
            </>
          ) : null}
          <ContentItemFormFields
            fields={fields}
            item={item}
            attributes={attributes}
            collections={collections}
            contentType={contentType}
            locales={locales}
            itemTranslations={initialItemTranslations}
          />
          {item?.id ? (
            <>
              <LocaleTabPanel
                entityType="ContentItem"
                entityId={item.id}
                sourceData={{
                  title: item.titleEn,
                  subtitle: item.excerptEn ?? "",
                  description: item.descriptionEn ?? "",
                  shortDescription: item.excerptEn ?? "",
                  features: JSON.stringify(
                    Array.isArray(attributes.features) ? attributes.features : []
                  ),
                  seoTitle: item.titleEn,
                  seoDescription: item.excerptEn ?? "",
                }}
              />
              {contentType.routePrefix && item.slug ? (
                <LocalizedSlugEditor
                  entityType="ContentItem"
                  entityId={item.id}
                  defaultSlug={item.slug}
                  pathPrefix={`/${contentType.routePrefix}`}
                />
              ) : null}
            </>
          ) : null}
        </>
      );
    }

    if (tab === "settings" && item) {
      return (
        <>
          <input type="hidden" name="titleEn" value={item.titleEn} />
          <input type="hidden" name="titleAr" value={item.titleAr} />
          <input type="hidden" name="slug" value={item.slug ?? ""} />
          <input type="hidden" name="collectionId" value={item.collectionId ?? ""} />
          <input type="hidden" name="excerptEn" value={item.excerptEn ?? ""} />
          <input type="hidden" name="excerptAr" value={item.excerptAr ?? ""} />
          <input type="hidden" name="descriptionEn" value={item.descriptionEn ?? ""} />
          <input type="hidden" name="descriptionAr" value={item.descriptionAr ?? ""} />
          <input type="hidden" name="attributesJson" value={JSON.stringify(attributes)} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status & visibility</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  name="status"
                  className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                  defaultValue={item.status ?? "DRAFT"}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Sort order</Label>
                <input
                  name="sortOrder"
                  type="number"
                  className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                  defaultValue={item.sortOrder ?? 0}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isFeatured" value="true" defaultChecked={item.isFeatured} />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isVisible"
                  value="true"
                  defaultChecked={item.isVisible ?? true}
                />
                Visible on site
              </label>
            </CardContent>
          </Card>
        </>
      );
    }

    if (tab === "blocks" && item) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content blocks</CardTitle>
            <CardDescription>
              Flexible sections for detail pages — reusable across all content types.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BlockEditor
              blocks={blocks}
              onChange={setBlocks}
              includeHiddenInput={false}
              selectedId={selectedBlockId}
              onSelectBlock={handleSelectBlock}
              inspectorTab={inspectorTab}
              onInspectorTabChange={handleInspectorTabChange}
              locales={locales}
              blockParentType="ContentItem"
              blockParentId={item.id}
              initialBlockTranslations={initialBlockTranslations}
            />
          </CardContent>
        </Card>
      );
    }

    if (tab === "add-media" && item) {
      return <ContentMediaManager itemId={item.id} />;
    }

    if (tab === "media" && item) {
      return <ContentMediaSortList itemId={item.id} media={item.media} />;
    }

    if (tab === "display" && item) {
      const previewImages = item.media
        .filter((m) => m.isPublished && !m.isHidden)
        .map((m) => ({ url: m.url, altEn: m.altEn, altAr: m.altAr }));
      return (
        <EntityDisplayPreview
          source={
            contentType.slug === "catalog-items"
              ? "packages"
              : contentType.slug === "listings"
                ? "hotels"
                : "services"
          }
          item={{
            id: item.id,
            slug: item.slug ?? undefined,
            source:
              contentType.slug === "catalog-items"
                ? "packages"
                : contentType.slug === "listings"
                  ? "hotels"
                  : "services",
            nameEn: item.titleEn,
            nameAr: item.titleAr,
            excerptEn: item.excerptEn,
            excerptAr: item.excerptAr,
            images: previewImages,
            ...(attributes as object),
          }}
          initialSettings={item.displaySettings as Record<string, unknown>}
        />
      );
    }

    return null;
  };

  const needsItemFieldSnapshot =
    item &&
    (displayActiveTab === "blocks" ||
      displayActiveTab === "add-media" ||
      displayActiveTab === "media" ||
      displayActiveTab === "display");

  const formHiddenFields = item ? (
    <>
      <input type="hidden" name="contentTypeSlug" value={contentType.slug} />
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="blocks" value={JSON.stringify(blocks)} readOnly />
      <BlockTranslationsHiddenInput />
      <input type="hidden" name="displaySettings" value={JSON.stringify(displaySettings)} readOnly />
      <input type="hidden" name="editorTab" value={displayActiveTab} readOnly />
      <input type="hidden" name="selectedBlockId" value={selectedBlockId ?? ""} readOnly />
      <input type="hidden" name="editorInspector" value={inspectorTab} readOnly />
      {needsItemFieldSnapshot ? (
        <>
          <input type="hidden" name="titleEn" value={item.titleEn} />
          <input type="hidden" name="titleAr" value={item.titleAr} />
          <input type="hidden" name="slug" value={item.slug ?? ""} />
          <input type="hidden" name="collectionId" value={item.collectionId ?? ""} />
          <input type="hidden" name="excerptEn" value={item.excerptEn ?? ""} />
          <input type="hidden" name="excerptAr" value={item.excerptAr ?? ""} />
          <input type="hidden" name="descriptionEn" value={item.descriptionEn ?? ""} />
          <input type="hidden" name="descriptionAr" value={item.descriptionAr ?? ""} />
          <input type="hidden" name="attributesJson" value={JSON.stringify(attributes)} />
          <input type="hidden" name="status" value={item.status} />
          <input type="hidden" name="sortOrder" value={String(item.sortOrder ?? 0)} />
          {item.isFeatured ? (
            <input type="hidden" name="isFeatured" value="true" />
          ) : null}
          <input type="hidden" name="isVisible" value={item.isVisible ? "true" : "false"} />
        </>
      ) : null}
    </>
  ) : null;

  const shell = (
    <EntityAdminShell
      title={isNew ? `New ${contentType.labelSingularEn}` : `Edit: ${item!.titleEn}`}
      description={
        isNew
          ? contentType.nameEn
          : `${item!.slug ? `/${item!.slug}` : "—"} · ${item!.collection?.nameEn ?? contentType.nameEn}`
      }
      tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
      activeTab={displayActiveTab}
      onTabChange={handleTabChange}
      trackFormId="content-item-form"
      onSave={() => {
        const form = document.getElementById("content-item-form") as HTMLFormElement | null;
        form?.requestSubmit();
      }}
      onCancel={item ? handleCancel : undefined}
      onPreview={previewHref ? () => window.open(previewHref, "_blank") : undefined}
      onPublish={
        item
          ? () =>
              startTransition(async () => {
                await setContentItemStatus(item.id, "PUBLISHED");
                router.refresh();
              })
          : undefined
      }
      canPreview={item?.status === "PUBLISHED"}
      headerActions={
        item ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={item.status === "PUBLISHED" ? "default" : "secondary"}>
              {item.status}
            </Badge>
            {item.isFeatured ? <Badge variant="outline">Featured</Badge> : null}
            <Button type="button" size="sm" variant="outline" onClick={handleDuplicate} disabled={pending}>
              <Copy className="h-3.5 w-3.5 me-1" />
              Duplicate
            </Button>
            {previewHref ? (
              <Button asChild size="sm" variant="outline">
                <Link href={previewHref} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5 me-1" />
                  View
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      {(tab) =>
        item ? (
          <form id="content-item-form" action={upsertContentItem} className="contents">
            {formHiddenFields}
            <div className="space-y-6">{renderTabPanel(tab)}</div>
          </form>
        ) : tab === "details" ? (
          <form id="content-item-form" action={upsertContentItem} className="space-y-6">
            <input type="hidden" name="contentTypeSlug" value={contentType.slug} />
            <input type="hidden" name="blocks" value={JSON.stringify(blocks)} readOnly />
            <BlockTranslationsHiddenInput />
            <input
              type="hidden"
              name="displaySettings"
              value={JSON.stringify(displaySettings)}
              readOnly
            />
            <input type="hidden" name="editorTab" value="details" readOnly />
            {renderTabPanel(tab)}
          </form>
        ) : (
          renderTabPanel(tab)
        )
      }
    </EntityAdminShell>
  );

  if (!item?.id || locales.length === 0) {
    return shell;
  }

  return (
    <BlockTranslationProvider
      locales={locales}
      parentType="ContentItem"
      parentId={item.id}
      initialBlocks={blocks}
      initialRows={initialBlockTranslations}
      onLegacyPropUpdate={handleLegacyPropUpdate}
    >
      {shell}
    </BlockTranslationProvider>
  );
}
