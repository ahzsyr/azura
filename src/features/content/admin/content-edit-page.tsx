"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import type { PageBlocks } from "@/types/builder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LocaleTabPanel } from "@/features/translation/components/locale-tab-panel";
import { LocalizedSlugEditor } from "@/features/translation/components/localized-slug-editor";

const TABS = [
  { id: "details", label: "Details" },
  { id: "blocks", label: "Blocks" },
  { id: "add-media", label: "Add Media" },
  { id: "media", label: "Media" },
  { id: "display", label: "Display" },
  { id: "settings", label: "Settings" },
] as const;

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
  const [activeTab, setActiveTab] = useState("details");
  const [blocksJson, setBlocksJson] = useState(JSON.stringify(item?.blocks ?? [], null, 2));

  const handleLegacyPropUpdate = (
    blockId: string,
    field: string,
    localeCode: string,
    value: string
  ) => {
    const suffix = getContentFieldSuffix(localeCode);
    if (suffix !== "En" && suffix !== "Ar") return;
    const blocks = JSON.parse(blocksJson || "[]") as PageBlocks;
    const next = updateBlockInTree(blocks, blockId, (block) => ({
      ...block,
      props: { ...block.props, [`${field}${suffix}`]: value },
    }));
    setBlocksJson(JSON.stringify(next));
  };
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

  const shell = (
    <EntityAdminShell
      title={isNew ? `New ${contentType.labelSingularEn}` : `Edit: ${item!.titleEn}`}
      description={
        isNew
          ? contentType.nameEn
          : `${item!.slug ? `/${item!.slug}` : "—"} · ${item!.collection?.nameEn ?? contentType.nameEn}`
      }
      tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSave={() => {
        const form = document.getElementById("content-item-form") as HTMLFormElement | null;
        form?.requestSubmit();
      }}
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
            <Badge variant={item.status === "PUBLISHED" ? "default" : "secondary"}>{item.status}</Badge>
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
      {(tab) => {
        if (tab === "details" || tab === "settings") {
          return (
            <form
              id="content-item-form"
              action={upsertContentItem}
              className="space-y-6"
            >
              <input type="hidden" name="blocks" value={blocksJson} />
              <BlockTranslationsHiddenInput />
              <input type="hidden" name="displaySettings" value={JSON.stringify(displaySettings)} />

              {tab === "details" ? (
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
              ) : (
                <>
                  <input type="hidden" name="contentTypeSlug" value={contentType.slug} />
                  {item ? <input type="hidden" name="id" value={item.id} /> : null}
                  <input type="hidden" name="titleEn" value={item?.titleEn ?? ""} />
                  <input type="hidden" name="titleAr" value={item?.titleAr ?? ""} />
                  <input type="hidden" name="slug" value={item?.slug ?? ""} />
                  <input type="hidden" name="collectionId" value={item?.collectionId ?? ""} />
                  <input type="hidden" name="excerptEn" value={item?.excerptEn ?? ""} />
                  <input type="hidden" name="excerptAr" value={item?.excerptAr ?? ""} />
                  <input type="hidden" name="descriptionEn" value={item?.descriptionEn ?? ""} />
                  <input type="hidden" name="descriptionAr" value={item?.descriptionAr ?? ""} />
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
                        defaultValue={item?.status ?? "DRAFT"}
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
                        defaultValue={item?.sortOrder ?? 0}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="isFeatured" value="true" defaultChecked={item?.isFeatured} />
                      Featured
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="isVisible" value="true" defaultChecked={item?.isVisible ?? true} />
                      Visible on site
                    </label>
                  </CardContent>
                </Card>
                </>
              )}
            </form>
          );
        }

        if (tab === "blocks" && item) {
          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Content blocks</CardTitle>
                <CardDescription>Flexible sections for detail pages — reusable across all content types.</CardDescription>
              </CardHeader>
              <CardContent>
                <BlockEditor
                  blocks={JSON.parse(blocksJson || "[]")}
                  onChange={(blocks) => setBlocksJson(JSON.stringify(blocks))}
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

        if (isNew && tab !== "details") {
          return (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Save the item first to manage {tab.replace("-", " ")}.
            </p>
          );
        }

        return null;
      }}
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
      initialBlocks={JSON.parse(blocksJson || "[]")}
      initialRows={initialBlockTranslations}
      onLegacyPropUpdate={handleLegacyPropUpdate}
    >
      {shell}
    </BlockTranslationProvider>
  );
}
