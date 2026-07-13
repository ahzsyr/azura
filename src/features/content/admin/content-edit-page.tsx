"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { replaceBrowserUrl, applyEditorSaveNavigation, isEditorRegionId } from "@/lib/editor-url-sync";
import { useEditorPublishStatus, markEditorPlainSavePending } from "@/hooks/use-editor-publish-status";
import Link from "next/link";
import { Copy, ExternalLink } from "lucide-react";
import { compositionService } from "@/features/layout-engine/composition.service";
import type { Composition, RegionId } from "@/features/layout-engine/types";
import { PageLayoutPanel } from "@/features/layout-engine/components/page-layout-panel";
import { CompositionPresetsPanel } from "@/features/layout-engine/components/composition-presets-panel";
import { compositionPresetsRegistry } from "@/features/layout-engine/composition-presets-registry";
import { CompositionDevicePreview } from "@/features/layout-engine/components/composition-device-preview";
import {
  getCompositionBlocks,
  getCompositionRegionLabel,
  getEditableRegions,
  patchCompositionRegion,
  updateCompositionBlock,
} from "@/features/layout-engine/composition-editor-helpers";
import { isArabicLocale } from "@/shared/layout/direction/direction-resolver";
import { BlockEditor, BlockEditorHistory } from "@/features/builder/components/block-editor";
import { PageLookAndFeelPanel } from "@/features/cms/components/page-look-and-feel-panel";
import type { ContentCollection, ContentItem, ContentType } from "@prisma/client";
import type { ContentItemMediaAdmin } from "@/features/content/types";
import { EntityAdminShell } from "@/features/catalog/admin/entity-admin-shell";
import {
  duplicateContentItem,
  saveContentItemFromEditor,
  restoreContentItemRevision,
} from "@/features/content/actions";
import { resolveFieldSchema } from "@/features/content/content-type.registry";
import { ContentItemDetailsSidebar } from "@/features/content/admin/content-item-details-sidebar";
import { ContentMediaPanel } from "@/features/content/admin/content-media-panel";
import { ContentItemSeoPanel } from "@/features/content/admin/content-item-seo-panel";
import { mergeDisplaySettings, type DisplaySettings } from "@/schemas/catalog/display-settings";
import { parsePageVisualSettings, type PageVisualSettings } from "@/schemas/visual-settings";
import type { PublicLocale } from "@/i18n/locale-config";
import type { EntityTranslation, ContentItemRevision } from "@prisma/client";
import {
  BlockTranslationProvider,
  BlockTranslationsHiddenInput,
} from "@/features/builder/block-translation-context";
import { getContentFieldSuffix } from "@/i18n/locale-config";
import { cloneBlocks } from "@/features/builder/block-tree";
import { migrateBlocksToBlockSystem } from "@/features/builder/migration/upgrade-blocks";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import {
  isBlockInspectorTab,
  type BlockInspectorTabId,
} from "@/features/builder/constants/block-inspector-tabs";
import type { PageBlocks, ContentTypeOption } from "@/types/builder";
import type { GalleryBuilderOption } from "@/features/gallery/types";
import type { FaqSetBuilderOption } from "@/features/faq/types";
import type {
  TestimonialBuilderOption,
  TestimonialCollectionBuilderOption,
} from "@/features/testimonials/types";
import type {
  CollectionBuilderOption,
  ProductBuilderOption,
} from "@/features/builder/blocks/commerce/product-blocks/types";
import type { BrandBuilderOption } from "@/features/builder/blocks/commerce/commerce-showcase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LocalizedSlugEditor } from "@/features/translation/components/localized-slug-editor";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import type { BlockParentType } from "@/features/translation/block-translation";

const TABS = [
  { id: "details", label: "Details" },
  { id: "blocks", label: "Content" },
  { id: "lookAndFeel", label: "Look & Feel" },
  { id: "layout", label: "Page Layout" },
  { id: "preview", label: "Preview" },
  { id: "media", label: "Media" },
  { id: "seo", label: "SEO" },
  { id: "settings", label: "Settings" },
  { id: "history", label: "History" },
] as const;

const TAB_IDS = new Set<string>(TABS.map((t) => t.id));

function isContentTab(id: string | null): id is (typeof TABS)[number]["id"] {
  return id != null && TAB_IDS.has(id);
}

type ItemWithType = ContentItem & {
  contentType: ContentType;
  collection: ContentCollection | null;
  media: ContentItemMediaAdmin[];
};

type Props = {
  item?: ItemWithType;
  contentType: ContentType;
  collections: ContentCollection[];
  isNew?: boolean;
  locales: PublicLocale[];
  initialItemBlockTranslations?: EntityTranslation[];
  blocksOwnerType: BlockParentType;
  blocksOwnerId: string;
  initialEditorBlocks: PageBlocks;
  initialEditorBlockTranslations?: EntityTranslation[];
  initialItemTranslations?: EntityTranslation[];
  contentTypeOptions?: ContentTypeOption[];
  galleryOptions?: GalleryBuilderOption[];
  faqSetOptions?: FaqSetBuilderOption[];
  testimonialOptions?: TestimonialBuilderOption[];
  testimonialCollectionOptions?: TestimonialCollectionBuilderOption[];
  collectionOptions?: CollectionBuilderOption[];
  productOptions?: ProductBuilderOption[];
  brandOptions?: BrandBuilderOption[];
  initialRevisions?: ContentItemRevision[];
};

export function ContentEditPage({
  item,
  contentType,
  collections,
  isNew,
  locales,
  initialItemBlockTranslations = [],
  blocksOwnerType,
  blocksOwnerId,
  initialEditorBlocks,
  initialEditorBlockTranslations = [],
  initialItemTranslations = [],
  contentTypeOptions,
  galleryOptions = [],
  faqSetOptions = [],
  testimonialOptions = [],
  testimonialCollectionOptions = [],
  collectionOptions = [],
  productOptions = [],
  brandOptions = [],
  initialRevisions = [],
}: Props) {
  const itemField = (field: string, locale = "en") =>
    resolveTranslation(field, locale, { translations: initialItemTranslations });
  const itemTitle = itemField("title", "en");
  const router = useRouter();
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const blockParam = searchParams.get("block");
  const inspectorParam = searchParams.get("inspector");
  const regionParam = searchParams.get("region");

  const [newItemTab, setNewItemTab] = useState("details");
  const [activeTab, setActiveTab] = useState(() => {
    if (!item?.id) return "details";
    return isContentTab(tabParam) ? tabParam : "details";
  });

  const [composition, setComposition] = useState<Composition>(() =>
    compositionService.load({
      composition:
        item && "composition" in item
          ? (item as ItemWithType & { composition?: unknown }).composition
          : undefined,
      blocks: migrateBlocksToBlockSystem(initialEditorBlocks ?? []).blocks,
    }),
  );
  const [selectedRegion, setSelectedRegion] = useState<RegionId>(() =>
    isEditorRegionId(regionParam) ? regionParam : "primary",
  );
  const blocksRef = useRef<PageBlocks>(composition.regions.primary);
  const blocks = composition.regions[selectedRegion] ?? [];
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(blockParam);
  const [inspectorTab, setInspectorTab] = useState<BlockInspectorTabId>(() =>
    isBlockInspectorTab(inspectorParam) ? inspectorParam : "content"
  );

  const [displaySettings, setDisplaySettings] = useState<Partial<DisplaySettings>>(() =>
    mergeDisplaySettings(item?.displaySettings as Record<string, unknown>)
  );

  const [visualSettings, setVisualSettings] = useState<PageVisualSettings>(() =>
    parsePageVisualSettings(item?.visualSettings as Record<string, unknown>)
  );

  const [revisionMessage, setRevisionMessage] = useState("");

  useEditorPublishStatus(item?.id, item?.status, item?.isVisible);

  useEffect(() => {
    if (item?.id && isContentTab(tabParam)) setActiveTab(tabParam);
  }, [item?.id, tabParam]);

  useEffect(() => setSelectedBlockId(blockParam), [blockParam]);

  useEffect(() => {
    if (isBlockInspectorTab(inspectorParam)) setInspectorTab(inspectorParam);
  }, [inspectorParam]);

  const displayActiveTab = item?.id
    ? activeTab
    : isContentTab(newItemTab)
      ? newItemTab
      : "details";

  const itemCompositionKey = item
    ? JSON.stringify({
        blocks: item.blocks,
        composition: "composition" in item ? item.composition : undefined,
      })
    : "";
  useEffect(() => {
    if (!item) return;
    if (blocksOwnerType !== "ContentItem") return;
    const nextComposition = compositionService.load({
      composition:
        "composition" in item
          ? (item as ItemWithType & { composition?: unknown }).composition
          : undefined,
      blocks: migrateBlocksToBlockSystem((item.blocks as PageBlocks) ?? []).blocks,
    });
    setComposition(nextComposition);
    blocksRef.current = nextComposition.regions[selectedRegion] ?? [];
  }, [blocksOwnerType, item?.id, itemCompositionKey, selectedRegion]);

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
        params.delete("region");
      } else {
        params.set("region", selectedRegion);
        if (selectedBlockId) {
          params.set("block", selectedBlockId);
          params.set("inspector", inspectorTab);
        }
      }
      syncContentEditorUrl(params);
    },
    [contentType.slug, inspectorTab, item?.id, searchParams, selectedBlockId, selectedRegion, syncContentEditorUrl]
  );

  const handleSelectBlock = useCallback(
    (id: string | null) => {
      setSelectedBlockId(id);
      if (!item?.id) return;
      setActiveTab("blocks");
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "blocks");
      params.set("region", selectedRegion);
      if (id) params.set("block", id);
      else params.delete("block");
      params.set("inspector", inspectorTab);
      syncContentEditorUrl(params);
    },
    [inspectorTab, item?.id, searchParams, selectedRegion, syncContentEditorUrl]
  );

  const handleInspectorTabChange = useCallback(
    (tab: BlockInspectorTabId) => {
      setInspectorTab(tab);
      if (!item?.id) return;
      setActiveTab("blocks");
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "blocks");
      params.set("region", selectedRegion);
      params.set("inspector", tab);
      if (selectedBlockId) params.set("block", selectedBlockId);
      syncContentEditorUrl(params);
    },
    [contentType.slug, item?.id, searchParams, selectedBlockId, selectedRegion, syncContentEditorUrl]
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
    setComposition((prev) =>
      updateCompositionBlock(prev, blockId, (block) =>
        patchBlockSettings(block, { [`${field}${suffix}`]: value }),
      ),
    );
  };

  const handleCancel = useCallback(() => {
    if (!item) return;
    const nextComposition = compositionService.load({
      composition:
        "composition" in item
          ? (item as ItemWithType & { composition?: unknown }).composition
          : undefined,
      blocks: migrateBlocksToBlockSystem((item.blocks as PageBlocks) ?? []).blocks,
    });
    setComposition(nextComposition);
    blocksRef.current = nextComposition.regions[selectedRegion] ?? [];
    setSelectedBlockId(blockParam);
    setInspectorTab(isBlockInspectorTab(inspectorParam) ? inspectorParam : "content");
    if (isContentTab(tabParam)) setActiveTab(tabParam);
    router.refresh();
  }, [item, blockParam, inspectorParam, tabParam, router, selectedRegion]);

  const handleSelectRegion = useCallback(
    (regionId: RegionId) => {
      setSelectedRegion(regionId);
      blocksRef.current = composition.regions[regionId] ?? [];
      if (!item?.id) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "blocks");
      params.set("region", regionId);
      if (selectedBlockId) {
        params.set("block", selectedBlockId);
        params.set("inspector", inspectorTab);
      }
      syncContentEditorUrl(params);
    },
    [composition.regions, inspectorTab, item?.id, searchParams, selectedBlockId, syncContentEditorUrl],
  );

  const submitContentForm = useCallback(async (): Promise<boolean> => {
    const form = document.getElementById("content-item-form") as HTMLFormElement | null;
    if (!form) return false;

    setSaveStatus("saving");
    const result = await saveContentItemFromEditor(new FormData(form));
    if (result.ok) {
      markSaved();
      markEditorPlainSavePending();
      applyEditorSaveNavigation(result.redirectTo, router);
      return true;
    }

    setSaveStatus("error");
    console.error("[content-editor] save failed:", result.error);
    return false;
  }, [displayActiveTab, item?.id, markSaved, router, setSaveStatus]);

  const handlePublish = useCallback(async (): Promise<boolean> => {
    if (!item) return false;
    const form = document.getElementById("content-item-form") as HTMLFormElement | null;
    if (!form) return false;
    const statusFields = form.querySelectorAll('[name="status"]');
    if (statusFields.length > 0) {
      statusFields.forEach((field) => {
        if (field instanceof HTMLSelectElement || field instanceof HTMLInputElement) {
          field.value = "PUBLISHED";
        }
      });
    } else {
      const override = document.createElement("input");
      override.type = "hidden";
      override.name = "status";
      override.value = "PUBLISHED";
      form.appendChild(override);
    }
    return submitContentForm();
  }, [item, submitContentForm]);

  const [pending, startTransition] = useTransition();
  const fields = resolveFieldSchema(contentType, contentType.slug);
  const attributes = (item?.attributes ?? {}) as Record<string, unknown>;

  const handleDuplicate = () => {
    if (!item) return;
    startTransition(async () => {
      await duplicateContentItem(item.id);
    });
  };

  const defaultLocale = locales.find((l) => l.isDefault) ?? locales[0];
  const defaultLocalePrefix = defaultLocale?.urlPrefix ?? "en";

  const publicItemPath = (() => {
    if (!contentType.routePrefix) return undefined;
    if (item?.slug) return `/${contentType.routePrefix}/${item.slug}`;
    return `/${contentType.routePrefix}`;
  })();

  const previewHref = publicItemPath
    ? publicItemPath.startsWith("http")
      ? publicItemPath
      : `/${defaultLocalePrefix}${publicItemPath.startsWith("/") ? publicItemPath : `/${publicItemPath}`}`
    : undefined;

  const needsItemFieldSnapshot =
    item &&
    (displayActiveTab === "blocks" ||
      displayActiveTab === "media" ||
      displayActiveTab === "settings" ||
      displayActiveTab === "lookAndFeel" ||
      displayActiveTab === "layout" ||
      displayActiveTab === "preview" ||
      displayActiveTab === "history");

  const renderTabPanel = (tab: string) => {
    if (isNew && tab !== "details") {
      return (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Save the item first to manage {tab.replace("-", " ")}.
        </p>
      );
    }

    // --- Details tab ---
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
          <input
            type="hidden"
            name="displaySettings"
            value={JSON.stringify(displaySettings)}
            readOnly
          />
          <ContentItemDetailsSidebar
            fields={fields}
            item={item}
            attributes={attributes}
            collections={collections}
            contentType={contentType}
            locales={locales}
            itemTranslations={initialItemTranslations}
            displaySettings={displaySettings}
            onDisplaySettingsChange={(next) => {
              markUnsaved();
              setDisplaySettings((prev) => ({ ...prev, ...next }));
            }}
          />
          {item?.id && contentType.routePrefix && item.slug ? (
            <div className="mt-6 pt-4 border-t">
              <LocalizedSlugEditor
                entityType="ContentItem"
                entityId={item.id}
                defaultSlug={item.slug}
                pathPrefix={`/${contentType.routePrefix}`}
              />
            </div>
          ) : null}
        </>
      );
    }

    // --- Content tab: BlockEditor ---
    if (tab === "blocks" && item) {
      const defaultLocaleCode = defaultLocale?.code ?? "en";
      const isRtl = isArabicLocale(defaultLocaleCode);
      const activeRegions = getEditableRegions(composition);

      return (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {activeRegions.map((regionId) => (
              <Button
                key={regionId}
                type="button"
                variant={selectedRegion === regionId ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  handleSelectRegion(regionId);
                }}
              >
                {getCompositionRegionLabel(regionId, isRtl)}
              </Button>
            ))}
          </div>
          <BlockEditor
            blocks={blocks}
            blocksRef={blocksRef}
            onChange={(next) => {
              markUnsaved();
              blocksRef.current = next;
              setComposition((prev) => patchCompositionRegion(prev, selectedRegion, next));
            }}
            includeHiddenInput={false}
            embeddedTemplates={false}
            embeddedHistory={false}
            onGoToTemplates={() => handleTabChange("layout")}
            selectedId={selectedBlockId}
            onSelectBlock={handleSelectBlock}
            inspectorTab={inspectorTab}
            onInspectorTabChange={handleInspectorTabChange}
            locales={locales}
            blockParentType={blocksOwnerType}
            blockParentId={blocksOwnerId}
            initialBlockTranslations={initialEditorBlockTranslations}
            contentTypeOptions={contentTypeOptions}
            galleryOptions={galleryOptions}
            faqSetOptions={faqSetOptions}
            testimonialOptions={testimonialOptions}
            testimonialCollectionOptions={testimonialCollectionOptions}
            collectionOptions={collectionOptions}
            productOptions={productOptions}
            brandOptions={brandOptions}
          />
        </div>
      );
    }

    // --- Look & Feel tab ---
    if (tab === "lookAndFeel" && item) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Look &amp; Feel</CardTitle>
            <CardDescription>
              Override or disable site-wide canvas effects and motion on this page only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PageLookAndFeelPanel
              value={visualSettings}
              onChange={(next) => {
                markUnsaved();
                setVisualSettings(next);
              }}
            />
          </CardContent>
        </Card>
      );
    }

    // --- Page Layout tab ---
    if (tab === "layout" && item) {
      const defaultLocaleCode = defaultLocale?.code ?? "en";
      const isRtl = isArabicLocale(defaultLocaleCode);

      return (
        <div className="space-y-6">
          <PageLayoutPanel
            composition={composition}
            dir={isRtl ? "rtl" : "ltr"}
            onChange={(next) => {
              markUnsaved();
              setComposition(next);
              blocksRef.current = next.regions[selectedRegion] ?? [];
            }}
          />
          <CompositionPresetsPanel
            onApplyPreset={(presetId) => {
              const preset = compositionPresetsRegistry.get(presetId);
              if (!preset) return;
              const targetRegion = preset.targetRegion;
              const nextBlocks = [
                ...(composition.regions[targetRegion] ?? []),
                ...preset.blocks,
              ];
              markUnsaved();
              blocksRef.current = nextBlocks;
              setSelectedRegion(targetRegion);
              setComposition((prev) => patchCompositionRegion(prev, targetRegion, nextBlocks));
              handleTabChange("blocks");
            }}
          />
        </div>
      );
    }

    // --- Preview tab ---
    if (tab === "preview" && item) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Page preview</CardTitle>
            <CardDescription>Preview how your content blocks will look across devices.</CardDescription>
          </CardHeader>
          <CardContent>
            <CompositionDevicePreview
              composition={composition}
              locales={locales}
              galleryOptions={galleryOptions}
              faqSetOptions={faqSetOptions}
              testimonialOptions={testimonialOptions}
              testimonialCollectionOptions={testimonialCollectionOptions}
              collectionOptions={collectionOptions}
              productOptions={productOptions}
            />
          </CardContent>
        </Card>
      );
    }

    // --- Media tab ---
    if (tab === "media" && item) {
      return (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Media</CardTitle>
            <CardDescription>Images associated with this item.</CardDescription>
          </CardHeader>
          <CardContent>
            <ContentMediaPanel itemId={item.id} media={item.media} />
          </CardContent>
        </Card>
      );
    }

    // --- SEO tab ---
    if (tab === "seo" && item) {
      return (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Search engine optimization</CardTitle>
            <CardDescription>
              Meta titles, descriptions, and social previews for this item&apos;s public page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContentItemSeoPanel
              contentItemId={item.id}
              defaultTitleEn={itemField("title", "en")}
              defaultTitleAr={itemField("title", "ar")}
              defaultDescEn={itemField("description", "en").slice(0, 160)}
              defaultDescAr={itemField("description", "ar").slice(0, 160)}
            />
          </CardContent>
        </Card>
      );
    }

    // --- Settings tab ---
    if (tab === "settings" && item) {
      return (
        <>
          <input type="hidden" name="slug" value={item.slug ?? ""} />
          <input type="hidden" name="collectionId" value={item.collectionId ?? ""} />
          <input type="hidden" name="attributesJson" value={JSON.stringify(attributes)} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status &amp; visibility</CardTitle>
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
              <div className="space-y-2 md:col-span-2">
                <Label>Schedule publish</Label>
                <Input
                  type="datetime-local"
                  name="scheduledAt"
                  defaultValue={
                    (item as ItemWithType & { scheduledAt?: Date | null }).scheduledAt
                      ? new Date(
                          (item as ItemWithType & { scheduledAt?: Date | null }).scheduledAt!
                        )
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isFeatured"
                  value="true"
                  defaultChecked={item.isFeatured}
                />
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

    // --- History tab ---
    if (tab === "history" && item) {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revision note</CardTitle>
              <CardDescription>Optional note saved with this version on next save.</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                name="revisionMessage"
                value={revisionMessage}
                onChange={(e) => setRevisionMessage(e.target.value)}
                placeholder="What changed in this save?"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Version history</CardTitle>
              <CardDescription>Restore or preview previous saved versions.</CardDescription>
            </CardHeader>
            <CardContent>
              <BlockEditorHistory
                revisions={initialRevisions}
                onRestoreRevision={async (revisionId) => {
                  await restoreContentItemRevision(item.id, revisionId);
                  window.location.reload();
                }}
                onPreviewBlocks={(revBlocks) => {
                  const previewComposition = compositionService.load({
                    blocks: migrateBlocksToBlockSystem(cloneBlocks(revBlocks as PageBlocks)).blocks,
                  });
                  setComposition(previewComposition);
                  setSelectedRegion("primary");
                  blocksRef.current = previewComposition.regions.primary;
                  handleTabChange("blocks");
                }}
              />
            </CardContent>
          </Card>
        </div>
      );
    }

    return null;
  };

  const formHiddenFields = item ? (
    <>
      <input type="hidden" name="contentTypeSlug" value={contentType.slug} />
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="blocks" value={JSON.stringify(composition.regions.primary)} readOnly />
      <input type="hidden" name="composition" value={JSON.stringify(composition)} readOnly />
      <input
        type="hidden"
        name="visualSettings"
        value={JSON.stringify(visualSettings)}
        readOnly
      />
      <BlockTranslationsHiddenInput />
      <input
        type="hidden"
        name="displaySettings"
        value={JSON.stringify(
          mergeDisplaySettings(displaySettings as Record<string, unknown>)
        )}
        readOnly
      />
      <input type="hidden" name="editorTab" value={displayActiveTab} readOnly />
      <input type="hidden" name="editorRegion" value={selectedRegion} readOnly />
      <input type="hidden" name="selectedBlockId" value={selectedBlockId ?? ""} readOnly />
      <input type="hidden" name="editorInspector" value={inspectorTab} readOnly />
      {displayActiveTab === "history" ? (
        <input type="hidden" name="revisionMessage" value={revisionMessage} readOnly />
      ) : null}
      {needsItemFieldSnapshot ? (
        <>
          <input type="hidden" name="slug" value={item.slug ?? ""} />
          <input type="hidden" name="collectionId" value={item.collectionId ?? ""} />
          <input type="hidden" name="attributesJson" value={JSON.stringify(attributes)} />
          <input type="hidden" name="status" value={item.status} />
          <input type="hidden" name="sortOrder" value={String(item.sortOrder ?? 0)} />
          {item.isFeatured ? (
            <input type="hidden" name="isFeatured" value="true" />
          ) : null}
          <input
            type="hidden"
            name="isVisible"
            value={item.isVisible ? "true" : "false"}
          />
        </>
      ) : null}
    </>
  ) : null;

  const shell = (
    <EntityAdminShell
      title={isNew ? `New ${contentType.slug}` : `Edit: ${itemTitle || item!.slug || "item"}`}
      description={
        isNew
          ? contentType.slug
          : `${item!.slug ? `/${item!.slug}` : "—"} · ${item!.collection?.slug ?? contentType.slug}`
      }
      tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
      activeTab={displayActiveTab}
      onTabChange={handleTabChange}
      trackFormId="content-item-form"
      onSave={() => {
        if (displayActiveTab === "seo") return;
        void submitContentForm();
      }}
      onCancel={item ? handleCancel : undefined}
      onPreview={previewHref ? () => window.open(previewHref, "_blank") : undefined}
      onPublish={item ? handlePublish : undefined}
      canPreview={item?.status === "PUBLISHED"}
      headerActions={
        item ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={item.status === "PUBLISHED" ? "default" : "secondary"}>
              {item.status}
            </Badge>
            {item.isFeatured ? <Badge variant="outline">Featured</Badge> : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDuplicate}
              disabled={pending}
            >
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
          tab === "seo" ? (
            <div className="space-y-6">{renderTabPanel(tab)}</div>
          ) : (
            <form
              id="content-item-form"
              className="contents"
              onSubmit={(e) => {
                e.preventDefault();
                void submitContentForm();
              }}
            >
              {formHiddenFields}
              <div className="space-y-6">{renderTabPanel(tab)}</div>
            </form>
          )
        ) : tab === "details" ? (
          <form
            id="content-item-form"
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              void submitContentForm();
            }}
          >
            <input type="hidden" name="contentTypeSlug" value={contentType.slug} />
            <input type="hidden" name="blocks" value={JSON.stringify(composition.regions.primary)} readOnly />
      <input type="hidden" name="composition" value={JSON.stringify(composition)} readOnly />
            <input
              type="hidden"
              name="visualSettings"
              value={JSON.stringify(visualSettings)}
              readOnly
            />
            <BlockTranslationsHiddenInput />
            <input
              type="hidden"
              name="displaySettings"
              value={JSON.stringify(
                mergeDisplaySettings(displaySettings as Record<string, unknown>)
              )}
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
      parentType={blocksOwnerType}
      parentId={blocksOwnerId}
      initialBlocks={getCompositionBlocks(composition)}
      initialRows={initialEditorBlockTranslations}
      onLegacyPropUpdate={handleLegacyPropUpdate}
    >
      {shell}
    </BlockTranslationProvider>
  );
}
