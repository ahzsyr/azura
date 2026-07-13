"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { replaceBrowserUrl, applyEditorSaveNavigation, isEditorRegionId } from "@/lib/editor-url-sync";
import { useEditorPublishStatus, markEditorPlainSavePending } from "@/hooks/use-editor-publish-status";
import { SLUG_INPUT_PATTERN } from "@/lib/slug-pattern";
import type { CmsPage, CmsPageRevision, ContentStatus, SeoMeta } from "@prisma/client";
import { SeoMetaPanel } from "@/features/seo/components/seo-meta-panel";
import type { SeoMetaFormPropsFromContext } from "@/features/seo/mappers/to-seo-meta-form-props";
import {
  upsertCmsPage,
  saveCmsPageFromEditor,
  patchCmsPageFromEditor,
  duplicateCmsPage,
  deleteCmsPage,
  restorePageRevision,
  unpublishCmsPage,
} from "@/features/cms/actions";
import { formatScheduledInput } from "@/features/cms/scheduling-utils";
import { BlockEditor, BlockEditorHistory } from "@/features/builder/components/block-editor";
import type { ContentTypeOption } from "@/types/builder";
import { updateBlockInTree } from "@/features/builder/block-tree";
import { migrateBlocksToBlockSystem } from "@/features/builder/migration/upgrade-blocks";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { CMS_WIRED_MARKETING_SLUGS } from "@/features/builder/constants";
import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import {
  BlockTranslationProvider,
  BlockTranslationsHiddenInput,
} from "@/features/builder/block-translation-context";
import { getContentFieldSuffix, type PublicLocale } from "@/i18n/locale-config";
import type { EntityTranslation } from "@prisma/client";
import { LocalizedFields } from "@/features/translation/components/localized-fields";
import { LocalizedSlugEditor } from "@/features/translation/components/localized-slug-editor";
import { translationsToFieldValues } from "@/features/translation/block-translation";
import {
  AdminFormProvider,
  useAdminForm,
} from "@/components/admin/layout/admin-form-provider";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CmsStatusBadge } from "./cms-status-badge";
import type { BlockNode, PageBlocks } from "@/types/builder";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
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
import type { PageVisualSettings } from "@/schemas/visual-settings";
import { parsePageVisualSettings } from "@/schemas/visual-settings";
import { PageLookAndFeelPanel } from "@/features/cms/components/page-look-and-feel-panel";
import { getPageFormValidationError } from "@/features/cms/page-form-validation";
import {
  isBlockInspectorTab,
  type BlockInspectorTabId,
} from "@/features/builder/constants/block-inspector-tabs";
import { validatePageBlocks } from "@/features/builder/validate-page-blocks";
import { buildPageEditorFormData } from "@/features/cms/lib/page-editor-form-data";
import { runPageEditorToolbarSave } from "@/features/cms/lib/page-editor-toolbar-save";
import type { EntityTranslationInput } from "@/features/translation/types";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { compositionService } from "@/features/layout-engine/composition.service";
import type { Composition, RegionId } from "@/features/layout-engine/types";
import { PageLayoutPanel } from "@/features/layout-engine/components/page-layout-panel";
import { CompositionPresetsPanel } from "@/features/layout-engine/components/composition-presets-panel";
import { compositionPresetsRegistry } from "@/features/layout-engine/composition-presets-registry";
import { isArabicLocale } from "@/shared/layout/direction/direction-resolver";
import { CompositionDevicePreview } from "@/features/layout-engine/components/composition-device-preview";
import {
  findBlockById,
  getCompositionBlocks,
  getCompositionRegionLabel,
  getEditableRegions,
  updateCompositionBlock,
} from "@/features/layout-engine/composition-editor-helpers";

const PAGE_TABS = [
  { id: "general", label: "General" },
  { id: "content", label: "Content" },
  { id: "lookAndFeel", label: "Look & Feel" },
  { id: "layout", label: "Page Layout" },
  { id: "preview", label: "Preview" },
  { id: "seo", label: "SEO" },
  { id: "history", label: "History" },
] as const;

const PAGE_TAB_IDS = new Set<string>(PAGE_TABS.map((t) => t.id));

function isPageTab(id: string | null): id is (typeof PAGE_TABS)[number]["id"] {
  return id != null && PAGE_TAB_IDS.has(id);
}

type PageWithRevisions = CmsPage & { revisions?: CmsPageRevision[]; seoMeta?: SeoMeta | null };

type PageLocaleFields = Record<string, Record<string, string>>;

type PageFormState = {
  slug: string;
  status: ContentStatus;
  templateKey: string;
  scheduledAt: string;
  revisionMessage: string;
  composition: Composition;
  localeFields: PageLocaleFields;
  visualSettings: PageVisualSettings;
};

function getLocalizedInputName(fieldKey: string, localeCode: string): string {
  const suffix = getContentFieldSuffix(localeCode);
  if (suffix === "En" || suffix === "Ar") {
    return `${fieldKey}${suffix}`;
  }
  return `${fieldKey}_${localeCode}`;
}

function buildPageLocaleFields(translations: EntityTranslation[]): PageLocaleFields {
  const fields: PageLocaleFields = { title: {}, excerpt: {} };
  for (const row of translations) {
    if (row.field === "title" || row.field === "excerpt") {
      if (!fields[row.field]) fields[row.field] = {};
      fields[row.field]![row.localeCode] = row.value;
    }
  }
  return fields;
}

function toValidationFields(state: PageFormState) {
  return {
    slug: state.slug,
    templateKey: state.templateKey,
    status: state.status,
  };
}

function PageLocalizedFormHiddens({
  localeFields,
  locales,
}: {
  localeFields: PageLocaleFields;
  locales: PublicLocale[];
}) {
  const fields = ["title", "excerpt"] as const;
  return (
    <>
      {fields.flatMap((fieldKey) =>
        locales.map((locale) => {
          const name = getLocalizedInputName(fieldKey, locale.code);
          const value = localeFields[fieldKey]?.[locale.code] ?? "";
          return <input key={name} type="hidden" name={name} value={value} readOnly />;
        })
      )}
    </>
  );
}

function buildInitialFormState(
  page?: PageWithRevisions,
  pageTranslations: EntityTranslation[] = []
): PageFormState {
  const localeFields = buildPageLocaleFields(pageTranslations);
  const composition = compositionService.load({
    composition:
      page && "composition" in page ? (page as PageWithRevisions & { composition?: unknown }).composition : undefined,
    blocks: migrateBlocksToBlockSystem((page?.blocks as PageBlocks) ?? []).blocks,
  });
  return {
    slug: page?.slug ?? "",
    status: page?.status ?? "DRAFT",
    templateKey: page?.templateKey ?? "",
    scheduledAt: formatScheduledInput(page?.scheduledAt),
    revisionMessage: "",
    composition,
    localeFields,
    visualSettings: parsePageVisualSettings(
      page && "visualSettings" in page ? (page as PageWithRevisions & { visualSettings?: unknown }).visualSettings : {},
    ),
  };
}

function PageActions({ page, onPublishNow }: { page: PageWithRevisions; onPublishNow: () => void }) {
  return (
    <>
      <Button type="button" variant="secondary" onClick={onPublishNow}>
        Publish now
      </Button>
      <Button type="button" variant="outline" onClick={() => duplicateCmsPage(page.id)}>
        Duplicate
      </Button>
      {page.status === "PUBLISHED" && (
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            await unpublishCmsPage(page.id);
            window.location.reload();
          }}
        >
          Unpublish
        </Button>
      )}
      <Button
        type="button"
        variant="destructive"
        onClick={() => {
          if (confirm("Delete this page?")) deleteCmsPage(page.id);
        }}
      >
        Delete
      </Button>
    </>
  );
}

function PageEditorFields({
  page,
  title,
  description,
  activeTab,
  setActiveTab,
  selectedRegion,
  onSelectRegion,
  selectedBlockId,
  onSelectBlock,
  inspectorTab,
  onInspectorTabChange,
  formState,
  updateFormState,
  blocksRef,
  onSave,
  onPublish,
  galleryOptions = [],
  faqSetOptions = [],
  testimonialOptions = [],
  testimonialCollectionOptions = [],
  collectionOptions = [],
  productOptions = [],
  brandOptions = [],
  contentTypeOptions,
  locales = [],
  initialBlockTranslations = [],
  initialPageTranslations = [],
  seoFormProps,
}: {
  page?: PageWithRevisions;
  title: string;
  description: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedRegion: RegionId;
  onSelectRegion: (region: RegionId) => void;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  inspectorTab: BlockInspectorTabId;
  onInspectorTabChange: (tab: BlockInspectorTabId) => void;
  formState: PageFormState;
  updateFormState: (patch: Partial<PageFormState>) => void;
  blocksRef: React.MutableRefObject<PageBlocks>;
  onSave: () => void | Promise<boolean | void>;
  onPublish?: () => void | Promise<boolean | void>;
  galleryOptions?: GalleryBuilderOption[];
  faqSetOptions?: FaqSetBuilderOption[];
  testimonialOptions?: TestimonialBuilderOption[];
  testimonialCollectionOptions?: TestimonialCollectionBuilderOption[];
  collectionOptions?: CollectionBuilderOption[];
  productOptions?: ProductBuilderOption[];
  brandOptions?: BrandBuilderOption[];
  contentTypeOptions?: ContentTypeOption[];
  locales?: PublicLocale[];
  initialBlockTranslations?: EntityTranslation[];
  initialPageTranslations?: EntityTranslation[];
  seoFormProps?: SeoMetaFormPropsFromContext;
  onLegacyPropUpdate?: (
    blockId: string,
    field: string,
    localeCode: string,
    value: string
  ) => void;
}) {
  const { setDirty, showToast } = useAdminForm();
  const defaultLocaleCode = locales?.find((l) => l.isDefault)?.code ?? "en";
  const isRtl = isArabicLocale(defaultLocaleCode);
  const activeRegions = getEditableRegions(formState.composition);
  const activeBlocks = formState.composition.regions[selectedRegion] ?? [];

  const selectedBlock =
    selectedBlockId != null ? findBlockById(getCompositionBlocks(formState.composition), selectedBlockId) : null;

  const patch = useCallback(
    (next: Partial<PageFormState>) => {
      updateFormState(next);
      setDirty(true);
    },
    [updateFormState, setDirty]
  );

  const patchLocaleField = useCallback(
    (fieldKey: "title" | "excerpt", localeCode: string, value: string) => {
      const localeFields = {
        ...formState.localeFields,
        [fieldKey]: { ...formState.localeFields[fieldKey], [localeCode]: value },
      };
      patch({ localeFields });
    },
    [formState.localeFields, patch]
  );

  const handleBlocksChange = useCallback(
    (next: PageBlocks) => {
      blocksRef.current = next;
      patch({
        composition: {
          ...formState.composition,
          regions: {
            ...formState.composition.regions,
            [selectedRegion]: next,
          },
        },
      });
    },
    [blocksRef, formState.composition, patch, selectedRegion],
  );

  const insertPresetBlock = (block: BlockNode) => {
    handleBlocksChange([...activeBlocks, block]);
    onSelectBlock(block.id);
    setActiveTab("content");
  };

  const liveMarketingPath = CMS_WIRED_MARKETING_SLUGS[formState.slug];

  return (
    <>
      <AdminPageHeader
        title={title}
        description={description}
        actions={
          page && (
            <div className="flex flex-wrap items-center gap-2">
              <CmsStatusBadge status={page.status} scheduledAt={page.scheduledAt} />
              {page.status === "PUBLISHED" && (
                <>
                  <Link
                    href={`/en${getCmsPagePublicPath(page.slug)}`}
                    target="_blank"
                    className="text-xs text-primary flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> View CMS page
                  </Link>
                  {CMS_WIRED_MARKETING_SLUGS[page.slug] != null && (
                    <Link
                      href={`/en${CMS_WIRED_MARKETING_SLUGS[page.slug]}`}
                      target="_blank"
                      className="text-xs text-primary flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Live site
                    </Link>
                  )}
                </>
              )}
            </div>
          )
        }
      />

      <AdminSettingsLayout
        tabs={[...PAGE_TABS]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        layoutId="page-editor-ribbon"
      >
        {(tab) => (
          <>
            {tab === "general" && (
              <>
              <Card>
                <CardHeader>
                  <CardTitle>Page details</CardTitle>
                  <CardDescription>Slug, status, titles, and scheduling.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Slug</Label>
                    <Input
                      value={formState.slug}
                      onChange={(e) => patch({ slug: e.target.value })}
                      required
                      pattern={SLUG_INPUT_PATTERN}
                    />
                    <p className="text-xs text-muted-foreground mt-1">URL: /[locale]/pages/[slug]</p>
                    {liveMarketingPath != null && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Live route when published: /[locale]{liveMarketingPath || "/"}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select
                      value={formState.status}
                      onChange={(e) => patch({ status: e.target.value as ContentStatus })}
                      className="w-full border rounded-md h-10 px-3"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <LocalizedFields
                      field={{ field: "title", label: "Title", type: "text", required: true }}
                      locales={locales.length > 0 ? locales : [{ code: "en", urlPrefix: "en", label: "English", htmlLang: "en", dir: "ltr", flag: "🇺🇸", isDefault: true }]}
                      defaultLocaleCode={defaultLocaleCode}
                      values={translationsToFieldValues(initialPageTranslations ?? [], "title")}
                      registerFieldNames={false}
                      onFieldChange={(code, value) => patchLocaleField("title", code, value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <LocalizedFields
                      field={{ field: "excerpt", label: "Excerpt", type: "textarea" }}
                      locales={locales.length > 0 ? locales : [{ code: "en", urlPrefix: "en", label: "English", htmlLang: "en", dir: "ltr", flag: "🇺🇸", isDefault: true }]}
                      defaultLocaleCode={defaultLocaleCode}
                      values={translationsToFieldValues(initialPageTranslations ?? [], "excerpt")}
                      registerFieldNames={false}
                      onFieldChange={(code, value) => patchLocaleField("excerpt", code, value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">
                      Page structure is now managed from the <span className="font-medium text-foreground">Page Layout</span> tab.
                      Legacy template keys remain readable for migration compatibility, but new edits no longer rely on them.
                    </p>
                  </div>
                  <div>
                    <Label>Schedule publish</Label>
                    <Input
                      type="datetime-local"
                      value={formState.scheduledAt}
                      onChange={(e) => patch({ scheduledAt: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
              {page?.id ? (
                <LocalizedSlugEditor
                  entityType="CmsPage"
                  entityId={page.id}
                  defaultSlug={formState.slug}
                  pathPrefix="/pages"
                />
              ) : null}
              </>
            )}

            {tab === "content" && (
              <div className="space-y-4">
                {formState.status !== "PUBLISHED" && getCompositionBlocks(formState.composition).length > 0 && (
                  <Card className="border-amber-500/40 bg-amber-500/5">
                    <CardContent className="py-4 text-sm text-muted-foreground">
                      This page is <span className="font-medium text-foreground">{formState.status}</span>.
                      Blocks are saved in the admin but{" "}
                      <span className="font-medium text-foreground">will not appear on the public website</span>{" "}
                      until you set status to Published and save, or use the Publish button.
                      {page?.id && (
                        <>
                          {" "}
                          Live URL when published:{" "}
                          <span className="font-medium text-foreground">
                            /[locale]{getCmsPagePublicPath(formState.slug)}
                          </span>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
                {liveMarketingPath != null && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="py-4 text-sm text-muted-foreground">
                      This page drives the live marketing route{" "}
                      <span className="font-medium text-foreground">
                        /[locale]{liveMarketingPath || "/"}
                      </span>
                      . Publishing replaces that page (not only /pages/[slug]).
                    </CardContent>
                  </Card>
                )}
                <div className="flex flex-wrap gap-2">
                  {activeRegions.map((regionId) => (
                    <Button
                      key={regionId}
                      type="button"
                      variant={selectedRegion === regionId ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        onSelectRegion(regionId);
                        blocksRef.current = formState.composition.regions[regionId] ?? [];
                      }}
                    >
                      {getCompositionRegionLabel(regionId, isRtl)}
                    </Button>
                  ))}
                </div>
                <BlockEditor
                  blocks={activeBlocks}
                  onChange={handleBlocksChange}
                  blocksRef={blocksRef}
                  embeddedTemplates={false}
                  embeddedHistory={false}
                  includeHiddenInput={false}
                  selectedId={selectedBlockId}
                  onSelectBlock={onSelectBlock}
                  inspectorTab={inspectorTab}
                  onInspectorTabChange={onInspectorTabChange}
                  galleryOptions={galleryOptions}
                  faqSetOptions={faqSetOptions}
                  testimonialOptions={testimonialOptions}
                  testimonialCollectionOptions={testimonialCollectionOptions}
                  collectionOptions={collectionOptions}
                  productOptions={productOptions}
                  brandOptions={brandOptions}
                  contentTypeOptions={contentTypeOptions}
                  locales={locales}
                  blockParentType="CmsPage"
                  blockParentId={page?.id ?? null}
                  initialBlockTranslations={initialBlockTranslations}
                />
              </div>
            )}

            {tab === "lookAndFeel" && (
              <Card>
                <CardHeader>
                  <CardTitle>Look & Feel</CardTitle>
                  <CardDescription>
                    Override or disable site-wide canvas effects and motion on this page only.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PageLookAndFeelPanel
                    value={formState.visualSettings}
                    onChange={(visualSettings) => patch({ visualSettings })}
                  />
                </CardContent>
              </Card>
            )}

            {tab === "layout" && (
              <div className="space-y-6">
                <PageLayoutPanel
                  composition={formState.composition}
                  dir={isRtl ? "rtl" : "ltr"}
                  onChange={(composition) => patch({ composition })}
                />
                <CompositionPresetsPanel
                  onApplyPreset={(presetId) => {
                    const preset = compositionPresetsRegistry.get(presetId);
                    if (!preset) return;
                    const targetRegion = preset.targetRegion;
                    const nextBlocks = [
                      ...(formState.composition.regions[targetRegion] ?? []),
                      ...preset.blocks,
                    ];
                    blocksRef.current = nextBlocks;
                    onSelectRegion(targetRegion);
                    patch({
                      composition: {
                        ...formState.composition,
                        regions: {
                          ...formState.composition.regions,
                          [targetRegion]: nextBlocks,
                        },
                      },
                    });
                    setActiveTab("content");
                  }}
                />
              </div>
            )}

            {tab === "preview" && (
              <Card>
                <CardHeader>
                  <CardTitle>Page preview</CardTitle>
                  <CardDescription>Preview how your page blocks will look across devices.</CardDescription>
                </CardHeader>
                <CardContent>
                  <CompositionDevicePreview
                    composition={formState.composition}
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
            )}

            {tab === "seo" && page?.id && seoFormProps && (
              <SeoMetaPanel
                embedded
                useTopBarActions
                onPublish={onPublish}
                canPublish={Boolean(page?.id)}
                {...seoFormProps}
                cmsPageId={seoFormProps.cmsPageId ?? page.id}
              />
            )}

            {tab === "seo" && !page?.id && (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Save the page first to configure SEO settings.
                </CardContent>
              </Card>
            )}

            {tab === "history" && (
              <div className="space-y-6">
                {page?.id && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Revision note</CardTitle>
                      <CardDescription>Optional note saved with this version.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Input
                        value={formState.revisionMessage}
                        onChange={(e) => patch({ revisionMessage: e.target.value })}
                        placeholder="What changed in this save?"
                      />
                    </CardContent>
                  </Card>
                )}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Version history</CardTitle>
                    <CardDescription>Restore or preview previous saved versions.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BlockEditorHistory
                      revisions={page?.revisions ?? []}
                      onRestoreRevision={
                        page?.id
                          ? async (revisionId) => {
                              await restorePageRevision(page.id, revisionId);
                              window.location.reload();
                            }
                          : undefined
                      }
                      onPreviewBlocks={(revBlocks) => {
                        handleBlocksChange(
                          migrateBlocksToBlockSystem(structuredClone(revBlocks) as PageBlocks).blocks,
                        );
                        setActiveTab("content");
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </AdminSettingsLayout>

      {activeTab !== "seo" ? (
        <div className="flex flex-wrap gap-3 pt-4 border-t lg:hidden">
          <Button type="button" onClick={onSave}>
            Save
          </Button>
          {page?.id && onPublish ? <PageActions page={page} onPublishNow={onPublish} /> : null}
        </div>
      ) : null}
    </>
  );
}

export function PageEditorForm({
  page,
  locales = [],
  initialBlockTranslations = [],
  initialPageTranslations = [],
  galleryOptions = [],
  faqSetOptions = [],
  testimonialOptions = [],
  testimonialCollectionOptions = [],
  collectionOptions = [],
  productOptions = [],
  brandOptions = [],
  contentTypeOptions,
  seoFormProps,
}: {
  page?: PageWithRevisions;
  locales?: PublicLocale[];
  initialBlockTranslations?: EntityTranslation[];
  initialPageTranslations?: EntityTranslation[];
  galleryOptions?: GalleryBuilderOption[];
  faqSetOptions?: FaqSetBuilderOption[];
  testimonialOptions?: TestimonialBuilderOption[];
  testimonialCollectionOptions?: TestimonialCollectionBuilderOption[];
  collectionOptions?: CollectionBuilderOption[];
  productOptions?: ProductBuilderOption[];
  brandOptions?: BrandBuilderOption[];
  contentTypeOptions?: ContentTypeOption[];
  seoFormProps?: SeoMetaFormPropsFromContext;
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const blockParam = searchParams.get("block");
  const inspectorParam = searchParams.get("inspector");
  const regionParam = searchParams.get("region");

  const formRef = useRef<HTMLFormElement>(null);
  const handleSaveRef = useRef<() => Promise<boolean>>(async () => false);
  const handlePublishRef = useRef<() => Promise<boolean>>(async () => false);
  const blocksRef = useRef<PageBlocks>([]);
  const serializedInputsRef = useRef<(() => EntityTranslationInput[]) | null>(null);
  const [newPageTab, setNewPageTab] = useState<string>("general");
  const [activeTab, setActiveTab] = useState<(typeof PAGE_TABS)[number]["id"]>(() => {
    if (!page?.id) return "general";
    return isPageTab(tabParam) ? tabParam : "general";
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(() => blockParam);
  const [selectedRegion, setSelectedRegion] = useState<RegionId>(() =>
    isEditorRegionId(regionParam) ? regionParam : "primary",
  );
  const [inspectorTab, setInspectorTab] = useState<BlockInspectorTabId>(() =>
    isBlockInspectorTab(inspectorParam) ? inspectorParam : "content",
  );

  const [formState, setFormState] = useState<PageFormState>(() => {
    const initial = buildInitialFormState(page, initialPageTranslations);
    blocksRef.current = initial.composition.regions.primary;
    return initial;
  });

  useEditorPublishStatus(page?.id, formState.status);

  const formStateRef = useRef(formState);
  formStateRef.current = formState;

  const baselineFormStateRef = useRef<PageFormState>(
    structuredClone(formState),
  );

  useEffect(() => {
    if (page?.id && isPageTab(tabParam)) setActiveTab(tabParam);
  }, [page?.id, tabParam]);

  useEffect(() => {
    setSelectedBlockId(blockParam);
  }, [blockParam]);

  useEffect(() => {
    if (isBlockInspectorTab(inspectorParam)) setInspectorTab(inspectorParam);
  }, [inspectorParam]);

  // Client state is source of truth — replaceBrowserUrl does not refresh useSearchParams().
  const displayActiveTab = page?.id
    ? activeTab
    : isPageTab(newPageTab)
      ? newPageTab
      : "general";

  const displaySelectedBlockId = selectedBlockId;

  const displayInspectorTab = inspectorTab;

  const syncPageEditorUrl = useCallback(
    (params: URLSearchParams) => {
      if (!page?.id) return;
      replaceBrowserUrl(`/admin/pages/${page.id}?${params.toString()}`);
    },
    [page?.id]
  );

  const handleTabChange = useCallback(
    (tabId: string) => {
      if (!page?.id) {
        setNewPageTab(tabId);
        return;
      }
      if (!isPageTab(tabId)) return;
      setActiveTab(tabId);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tabId);
      if (tabId !== "content") {
        params.delete("block");
        params.delete("inspector");
        params.delete("region");
      } else {
        params.set("region", selectedRegion);
        if (displaySelectedBlockId) {
          params.set("block", displaySelectedBlockId);
          params.set("inspector", displayInspectorTab);
        }
      }
      syncPageEditorUrl(params);
    },
    [displayInspectorTab, displaySelectedBlockId, page?.id, searchParams, selectedRegion, syncPageEditorUrl]
  );

  const handleSelectBlock = useCallback(
    (id: string | null) => {
      setSelectedBlockId(id);
      if (!page?.id) return;
      setActiveTab("content");
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "content");
      params.set("region", selectedRegion);
      if (id) params.set("block", id);
      else params.delete("block");
      params.set("inspector", displayInspectorTab);
      syncPageEditorUrl(params);
    },
    [displayInspectorTab, page?.id, searchParams, selectedRegion, syncPageEditorUrl]
  );

  const handleInspectorTabChange = useCallback(
    (tab: BlockInspectorTabId) => {
      setInspectorTab(tab);
      if (!page?.id) return;
      setActiveTab("content");
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "content");
      params.set("region", selectedRegion);
      params.set("inspector", tab);
      if (displaySelectedBlockId) params.set("block", displaySelectedBlockId);
      syncPageEditorUrl(params);
    },
    [displaySelectedBlockId, page?.id, searchParams, selectedRegion, syncPageEditorUrl]
  );

  const handleSelectRegion = useCallback(
    (regionId: RegionId) => {
      setSelectedRegion(regionId);
      blocksRef.current = formStateRef.current.composition.regions[regionId] ?? [];
      if (!page?.id) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "content");
      params.set("region", regionId);
      if (displaySelectedBlockId) {
        params.set("block", displaySelectedBlockId);
        params.set("inspector", displayInspectorTab);
      }
      syncPageEditorUrl(params);
    },
    [displayInspectorTab, displaySelectedBlockId, page?.id, searchParams, syncPageEditorUrl],
  );

  const snapshotEditorState = useCallback((): PageFormState => {
    return structuredClone({
      ...formStateRef.current,
    });
  }, []);

  const pageBlocksKey = page ? JSON.stringify(page.blocks) : "";
  useEffect(() => {
    if (!page) return;
    const composition = compositionService.load({
      composition:
        "composition" in page ? (page as PageWithRevisions & { composition?: unknown }).composition : undefined,
      blocks: migrateBlocksToBlockSystem((page.blocks as PageBlocks) ?? []).blocks,
    });
    const migratedKey = JSON.stringify(composition);
    if (migratedKey === JSON.stringify(formStateRef.current.composition)) return;
    setFormState((prev) => {
      const next = { ...prev, composition };
      formStateRef.current = next;
      blocksRef.current = composition.regions[selectedRegion] ?? [];
      return next;
    });
  }, [page?.id, pageBlocksKey, selectedRegion]);

  const updateFormState = useCallback((patch: Partial<PageFormState>) => {
    setFormState((prev) => {
      const next = { ...prev, ...patch };
      formStateRef.current = next;
      if (patch.composition) {
        blocksRef.current = patch.composition.regions[selectedRegion] ?? [];
      }
      return next;
    });
  }, [selectedRegion]);

  const handleSave = useCallback(async () => handleSaveRef.current(), []);
  const handlePublish = useCallback(async () => handlePublishRef.current(), []);

  const handlePreview = useCallback(() => {
    handleTabChange("preview");
  }, [handleTabChange]);

  const pageTitle =
    formState.localeFields.title?.en ||
    formState.localeFields.title?.[locales.find((l) => l.isDefault)?.code ?? "en"] ||
    page?.slug ||
    "";
  const title = page ? `Edit: ${pageTitle}` : "New Page";
  const description = page
    ? "Update page content, blocks, and publishing settings."
    : "Create a new CMS page with the block builder.";

  const isSeoTab = displayActiveTab === "seo";

  const handleLegacyPropUpdate = useCallback(
    (blockId: string, field: string, localeCode: string, value: string) => {
      const suffix = getContentFieldSuffix(localeCode);
      if (suffix !== "En" && suffix !== "Ar") return;
      setFormState((prev) => {
        const next = {
          ...prev,
          composition: updateCompositionBlock(prev.composition, blockId, (block) =>
            patchBlockSettings(block, { [`${field}${suffix}`]: value }),
          ),
        };
        formStateRef.current = next;
        blocksRef.current = next.composition.regions[selectedRegion] ?? [];
        return next;
      });
    },
    [selectedRegion],
  );

  const editorTree = (
    <AdminFormProvider
      suppressPageActions={isSeoTab}
      onSave={isSeoTab ? undefined : handleSave}
      onPublish={!isSeoTab && page?.id ? handlePublish : undefined}
      onPreview={isSeoTab ? undefined : handlePreview}
      canPublish={!isSeoTab && Boolean(page?.id)}
    >
      <PageEditorSaveGuard
        formStateRef={formStateRef}
        baselineFormStateRef={baselineFormStateRef}
        snapshotEditorState={snapshotEditorState}
        blocksRef={blocksRef}
        serializedInputsRef={serializedInputsRef}
        handleSaveRef={handleSaveRef}
        handlePublishRef={handlePublishRef}
        setActiveTab={handleTabChange}
        pageId={page?.id}
        locales={locales}
        editorTab={displayActiveTab}
        selectedBlockId={displaySelectedBlockId}
        editorInspector={displayInspectorTab}
        editorRegion={selectedRegion}
      />
      <form ref={formRef} action={upsertCmsPage} data-page-editor className="flex flex-col min-h-0 flex-1 w-full">
        {page?.id && <input type="hidden" name="id" value={page.id} />}
        <input type="hidden" name="editorTab" value={displayActiveTab} readOnly />
        <input type="hidden" name="editorRegion" value={selectedRegion} readOnly />
        <input type="hidden" name="selectedBlockId" value={displaySelectedBlockId ?? ""} readOnly />
        <input type="hidden" name="editorInspector" value={displayInspectorTab} readOnly />
        <input type="hidden" name="slug" value={formState.slug} readOnly />
        <input type="hidden" name="status" value={formState.status} readOnly />
        <input type="hidden" name="scheduledAt" value={formState.scheduledAt} readOnly />
        <input type="hidden" name="blocks" value={JSON.stringify(formState.composition.regions.primary)} readOnly />
        <input type="hidden" name="composition" value={JSON.stringify(formState.composition)} readOnly />
        <input
          type="hidden"
          name="visualSettings"
          value={JSON.stringify(formState.visualSettings)}
          readOnly
        />
        <BlockTranslationsHiddenInput />
        {locales.length > 0 ? (
          <PageLocalizedFormHiddens localeFields={formState.localeFields} locales={locales} />
        ) : null}

        <PageEditorFields
        page={page}
        title={title}
        description={description}
        activeTab={displayActiveTab}
        setActiveTab={handleTabChange}
        selectedRegion={selectedRegion}
        onSelectRegion={handleSelectRegion}
        selectedBlockId={displaySelectedBlockId}
        onSelectBlock={handleSelectBlock}
        inspectorTab={displayInspectorTab}
        onInspectorTabChange={handleInspectorTabChange}
        formState={formState}
        updateFormState={updateFormState}
        blocksRef={blocksRef}
        onSave={handleSave}
        onPublish={page?.id ? handlePublish : undefined}
        galleryOptions={galleryOptions}
        faqSetOptions={faqSetOptions}
        testimonialOptions={testimonialOptions}
        testimonialCollectionOptions={testimonialCollectionOptions}
        collectionOptions={collectionOptions}
        productOptions={productOptions}
        brandOptions={brandOptions}
        contentTypeOptions={contentTypeOptions}
        locales={locales}
        initialBlockTranslations={initialBlockTranslations}
        initialPageTranslations={initialPageTranslations}
        seoFormProps={seoFormProps}
        onLegacyPropUpdate={handleLegacyPropUpdate}
        />
      </form>
    </AdminFormProvider>
  );

  if (locales.length === 0) {
    return editorTree;
  }

  return (
    <BlockTranslationProvider
      locales={locales}
      parentType="CmsPage"
      parentId={page?.id ?? null}
      initialBlocks={getCompositionBlocks(formState.composition)}
      initialRows={initialBlockTranslations}
      onLegacyPropUpdate={handleLegacyPropUpdate}
      serializedInputsRef={serializedInputsRef}
    >
      {editorTree}
    </BlockTranslationProvider>
  );
}

function PageEditorSaveGuard({
  formStateRef,
  baselineFormStateRef,
  snapshotEditorState,
  blocksRef,
  serializedInputsRef,
  handleSaveRef,
  handlePublishRef,
  setActiveTab,
  pageId,
  locales,
  editorTab,
  selectedBlockId,
  editorInspector,
  editorRegion,
}: {
  formStateRef: React.MutableRefObject<PageFormState>;
  baselineFormStateRef: React.MutableRefObject<PageFormState>;
  snapshotEditorState: () => PageFormState;
  blocksRef: React.MutableRefObject<PageBlocks>;
  serializedInputsRef: React.MutableRefObject<(() => EntityTranslationInput[]) | null>;
  handleSaveRef: React.MutableRefObject<() => Promise<boolean>>;
  handlePublishRef: React.MutableRefObject<() => Promise<boolean>>;
  setActiveTab: (tab: string) => void;
  pageId?: string;
  locales: PublicLocale[];
  editorTab: string;
  selectedBlockId: string | null;
  editorInspector: string;
  editorRegion: RegionId;
}) {
  const { showToast } = useAdminForm();
  const router = useRouter();

  useLayoutEffect(() => {
    const submitForm = async (statusOverride?: ContentStatus): Promise<boolean> => {
      const formState = formStateRef.current;
      const error = getPageFormValidationError(toValidationFields(formState));
      if (error) {
        showToast(error, "error");
        setActiveTab("general");
        return false;
      }
      try {
        for (const regionBlocks of Object.values(formState.composition.regions)) {
          validatePageBlocks(regionBlocks);
        }
        for (const regionBlocks of Object.values(formState.composition.hiddenRegions)) {
          validatePageBlocks(regionBlocks);
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Block validation failed", "error");
        setActiveTab("content");
        return false;
      }

      const blockTranslations = serializedInputsRef.current?.() ?? null;
      const formData = buildPageEditorFormData(
        formState,
        {
          pageId,
          editorTab,
          selectedBlockId,
          editorInspector,
          editorRegion,
          statusOverride,
        },
        {
          locales,
          blocks: formState.composition.regions.primary,
          composition: formState.composition,
          blockTranslations,
        },
      );

      const blocksJson = JSON.stringify(formState.composition.regions.primary);
      const blockTranslationsJson =
        blockTranslations != null ? JSON.stringify(blockTranslations) : "";
      const payloadBytes =
        blocksJson.length +
        blockTranslationsJson.length +
        formState.slug.length +
        (formState.revisionMessage?.length ?? 0);

      try {
        const patchCurrent = snapshotEditorState();
        const result =
          pageId
            ? await patchCmsPageFromEditor({
                pageId,
                baseline: baselineFormStateRef.current as unknown as Record<string, unknown>,
                current: patchCurrent as unknown as Record<string, unknown>,
                blockTranslationsRaw: blockTranslationsJson || null,
                statusOverride,
                revisionMessage: formState.revisionMessage,
                editorTab,
                selectedBlockId,
                editorInspector,
                editorRegion,
              })
            : await runPageEditorToolbarSave(formData, saveCmsPageFromEditor);
        if (!result.ok && result.step === "patch_disabled") {
          const fallback = await runPageEditorToolbarSave(formData, saveCmsPageFromEditor);
          if (!fallback.ok) {
            showToast(`Save failed at ${fallback.step}: ${fallback.error}`, "error");
            return false;
          }
        baselineFormStateRef.current = structuredClone(snapshotEditorState());
        if (!statusOverride) {
          markEditorPlainSavePending();
        }
        if (fallback.redirectTo) {
            applyEditorSaveNavigation(fallback.redirectTo, router);
          }
          return true;
        }
        if (!result.ok) {
          showToast(`Save failed at ${result.step}: ${result.error}`, "error");
          return false;
        }
        baselineFormStateRef.current = structuredClone(snapshotEditorState());
        if (!statusOverride) {
          markEditorPlainSavePending();
        }
        if (result.redirectTo) {
          applyEditorSaveNavigation(result.redirectTo, router);
        }
        return true;
      } catch (e) {
        if (isRedirectError(e)) throw e;
        showToast(e instanceof Error ? e.message : "Save failed", "error");
        return false;
      }
    };

    handleSaveRef.current = () => submitForm();
    handlePublishRef.current = async () => {
      if (!formStateRef.current.slug.trim()) {
        showToast("Slug is required before publishing.", "error");
        setActiveTab("general");
        return false;
      }
      return submitForm("PUBLISHED");
    };
  }, [
    blocksRef,
    editorTab,
    editorInspector,
    editorRegion,
    formStateRef,
    handlePublishRef,
    handleSaveRef,
    baselineFormStateRef,
    snapshotEditorState,
    locales,
    pageId,
    router,
    selectedBlockId,
    serializedInputsRef,
    setActiveTab,
    showToast,
  ]);

  return null;
}
