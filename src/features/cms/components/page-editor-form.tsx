"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CmsPage, CmsPageRevision, ContentStatus, SeoMeta } from "@prisma/client";
import { SeoMetaPanel } from "@/features/seo/components/seo-meta-panel";
import {
  upsertCmsPage,
  publishCmsPage,
  duplicateCmsPage,
  deleteCmsPage,
  restorePageRevision,
  unpublishCmsPage,
} from "@/features/cms/actions";
import { formatScheduledInput } from "@/features/cms/scheduling-utils";
import { BlockEditor, BlockEditorHistory } from "@/features/builder/components/block-editor";
import { BlockPresetPanel } from "@/features/builder/components/block-preset-panel";
import { BlockDevicePreview } from "@/features/builder/components/block-device-preview";
import { cloneBlocks, updateBlockInTree } from "@/features/builder/block-tree";
import { migrateLegacyCatalogBlocks } from "@/features/builder/migrate-legacy-blocks";
import {
  CMS_WIRED_MARKETING_SLUGS,
  resolveBuiltinTemplate,
} from "@/features/builder/constants";
import { buildDefaultPageBlocksFromTemplate } from "@/features/cms/page-default-blocks";
import {
  BlockTranslationProvider,
  BlockTranslationsHiddenInput,
} from "@/features/builder/block-translation-context";
import { getContentFieldSuffix, type PublicLocale } from "@/i18n/locale-config";
import type { EntityTranslation } from "@prisma/client";
import { LocalizedFields } from "@/features/translation/components/localized-fields";
import { LocaleTabPanel } from "@/features/translation/components/locale-tab-panel";
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
import type { PageVisualSettings } from "@/schemas/visual-settings";
import { parsePageVisualSettings } from "@/schemas/visual-settings";
import { PageLookAndFeelPanel } from "@/features/cms/components/page-look-and-feel-panel";
import { getPageFormValidationError } from "@/features/cms/page-form-validation";

const PAGE_TABS = [
  { id: "general", label: "General" },
  { id: "content", label: "Content" },
  { id: "lookAndFeel", label: "Look & Feel" },
  { id: "templates", label: "Templates" },
  { id: "preview", label: "Preview" },
  { id: "seo", label: "SEO" },
  { id: "history", label: "History" },
] as const;

type PageWithRevisions = CmsPage & { revisions?: CmsPageRevision[]; seoMeta?: SeoMeta | null };

type PageLocaleFields = Record<string, Record<string, string>>;

type PageFormState = {
  slug: string;
  status: ContentStatus;
  titleEn: string;
  titleAr: string;
  excerptEn: string;
  excerptAr: string;
  templateKey: string;
  scheduledAt: string;
  revisionMessage: string;
  blocks: PageBlocks;
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

function buildPageLocaleFields(
  page: PageWithRevisions | undefined,
  translations: EntityTranslation[]
): PageLocaleFields {
  const fields: PageLocaleFields = { title: {}, excerpt: {} };
  if (page) {
    if (page.titleEn) fields.title!.en = page.titleEn;
    if (page.titleAr) fields.title!.ar = page.titleAr;
    if (page.excerptEn) fields.excerpt!.en = page.excerptEn;
    if (page.excerptAr) fields.excerpt!.ar = page.excerptAr;
  }
  for (const row of translations) {
    if (row.field === "title" || row.field === "excerpt") {
      if (!fields[row.field]) fields[row.field] = {};
      fields[row.field]![row.languageCode] = row.value;
    }
  }
  return fields;
}

function toValidationFields(state: PageFormState) {
  return {
    slug: state.slug,
    titleEn: state.localeFields.title?.en ?? state.titleEn,
    titleAr: state.localeFields.title?.ar ?? state.titleAr,
    excerptEn: state.localeFields.excerpt?.en ?? state.excerptEn,
    excerptAr: state.localeFields.excerpt?.ar ?? state.excerptAr,
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

function findBlockById(blocks: PageBlocks, id: string): BlockNode | null {
  for (const b of blocks) {
    if (b.id === id) return b;
    if (b.children?.length) {
      const found = findBlockById(b.children, id);
      if (found) return found;
    }
  }
  return null;
}

function buildInitialFormState(
  page?: PageWithRevisions,
  pageTranslations: EntityTranslation[] = []
): PageFormState {
  const localeFields = buildPageLocaleFields(page, pageTranslations);
  return {
    slug: page?.slug ?? "",
    status: page?.status ?? "DRAFT",
    titleEn: page?.titleEn ?? "",
    titleAr: page?.titleAr ?? "",
    excerptEn: page?.excerptEn ?? "",
    excerptAr: page?.excerptAr ?? "",
    templateKey: page?.templateKey ?? "",
    scheduledAt: formatScheduledInput(page?.scheduledAt),
    revisionMessage: "",
    blocks: migrateLegacyCatalogBlocks((page?.blocks as PageBlocks) ?? []),
    localeFields,
    visualSettings: parsePageVisualSettings(
      page && "visualSettings" in page ? (page as PageWithRevisions & { visualSettings?: unknown }).visualSettings : {},
    ),
  };
}

function PageActions({ page }: { page: PageWithRevisions }) {
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={async () => {
          await publishCmsPage(page.id);
          window.location.reload();
        }}
      >
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
  formState,
  updateFormState,
  onSave,
  galleryOptions = [],
  faqSetOptions = [],
  testimonialOptions = [],
  testimonialCollectionOptions = [],
  locales = [],
  initialBlockTranslations = [],
  initialPageTranslations = [],
}: {
  page?: PageWithRevisions;
  title: string;
  description: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  formState: PageFormState;
  updateFormState: (patch: Partial<PageFormState>) => void;
  onSave: () => void;
  galleryOptions?: GalleryBuilderOption[];
  faqSetOptions?: FaqSetBuilderOption[];
  testimonialOptions?: TestimonialBuilderOption[];
  testimonialCollectionOptions?: TestimonialCollectionBuilderOption[];
  locales?: PublicLocale[];
  initialBlockTranslations?: EntityTranslation[];
  initialPageTranslations?: EntityTranslation[];
  onLegacyPropUpdate?: (
    blockId: string,
    field: string,
    localeCode: string,
    value: string
  ) => void;
}) {
  const { setDirty } = useAdminForm();
  const defaultLocaleCode = locales?.find((l) => l.isDefault)?.code ?? "en";
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const selectedBlock =
    selectedBlockId != null ? findBlockById(formState.blocks, selectedBlockId) : null;

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
      const suffix = getContentFieldSuffix(localeCode);
      const next: Partial<PageFormState> = { localeFields };
      if (fieldKey === "title" && suffix === "En") next.titleEn = value;
      if (fieldKey === "title" && suffix === "Ar") next.titleAr = value;
      if (fieldKey === "excerpt" && suffix === "En") next.excerptEn = value;
      if (fieldKey === "excerpt" && suffix === "Ar") next.excerptAr = value;
      patch(next);
    },
    [formState.localeFields, patch]
  );

  const handleBlocksChange = useCallback(
    (next: PageBlocks) => patch({ blocks: next }),
    [patch]
  );

  const insertPresetBlock = (block: BlockNode) => {
    patch({ blocks: [...formState.blocks, block] });
    setSelectedBlockId(block.id);
    setActiveTab("content");
  };

  const liveMarketingPath = CMS_WIRED_MARKETING_SLUGS[formState.slug];
  const recommendedTemplate = resolveBuiltinTemplate(formState.templateKey, formState.slug);

  const applyRecommendedTemplate = () => {
    if (!recommendedTemplate) return;
    const blocks = buildDefaultPageBlocksFromTemplate(formState.templateKey, formState.slug);
    if (blocks.length === 0) return;
    if (
      formState.blocks.length > 0 &&
      !confirm(`Replace all blocks with "${recommendedTemplate.name}"?`)
    ) {
      return;
    }
    handleBlocksChange(cloneBlocks(blocks));
    setActiveTab("content");
  };

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
                    href={`/en/pages/${page.slug}`}
                    target="_blank"
                    className="text-xs text-primary flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> CMS EN
                  </Link>
                  <Link
                    href={`/ar/pages/${page.slug}`}
                    target="_blank"
                    className="text-xs text-primary flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> CMS AR
                  </Link>
                  {CMS_WIRED_MARKETING_SLUGS[page.slug] != null && (
                    <>
                      <Link
                        href={`/en${CMS_WIRED_MARKETING_SLUGS[page.slug]}`}
                        target="_blank"
                        className="text-xs text-primary flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" /> Live EN
                      </Link>
                      <Link
                        href={`/ar${CMS_WIRED_MARKETING_SLUGS[page.slug]}`}
                        target="_blank"
                        className="text-xs text-primary flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" /> Live AR
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
          )
        }
      />

      <AdminSettingsLayout tabs={[...PAGE_TABS]} activeTab={activeTab} onTabChange={setActiveTab}>
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
                      pattern="[a-z0-9-]+"
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
                  {locales && locales.length > 0 ? (
                    <>
                      <div className="md:col-span-2">
                        <LocalizedFields
                          field={{ field: "title", label: "Title", type: "text", required: true }}
                          locales={locales}
                          defaultLocaleCode={defaultLocaleCode}
                          values={translationsToFieldValues(initialPageTranslations ?? [], "title")}
                          legacyEntity={page ?? { titleEn: formState.titleEn, titleAr: formState.titleAr }}
                          registerFieldNames={false}
                          onFieldChange={(code, value) => patchLocaleField("title", code, value)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <LocalizedFields
                          field={{ field: "excerpt", label: "Excerpt", type: "textarea" }}
                          locales={locales}
                          defaultLocaleCode={defaultLocaleCode}
                          values={translationsToFieldValues(initialPageTranslations ?? [], "excerpt")}
                          legacyEntity={{
                            excerptEn: formState.excerptEn,
                            excerptAr: formState.excerptAr,
                          }}
                          registerFieldNames={false}
                          onFieldChange={(code, value) => patchLocaleField("excerpt", code, value)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label>Title EN</Label>
                        <Input
                          value={formState.titleEn}
                          onChange={(e) => patch({ titleEn: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label>Title AR</Label>
                        <Input
                          value={formState.titleAr}
                          onChange={(e) => patch({ titleAr: e.target.value })}
                          dir="rtl"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Excerpt EN</Label>
                        <Textarea
                          value={formState.excerptEn}
                          onChange={(e) => patch({ excerptEn: e.target.value })}
                          rows={2}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Excerpt AR</Label>
                        <Textarea
                          value={formState.excerptAr}
                          onChange={(e) => patch({ excerptAr: e.target.value })}
                          dir="rtl"
                          rows={2}
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <Label>Template key</Label>
                    <Input
                      value={formState.templateKey}
                      onChange={(e) => patch({ templateKey: e.target.value })}
                      placeholder="home, about, ..."
                    />
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
                <>
                <LocaleTabPanel
                  entityType="CmsPage"
                  entityId={page.id}
                  sourceData={{
                    title: formState.titleEn,
                    subtitle: formState.excerptEn ?? "",
                    description: formState.excerptEn ?? "",
                    content: "",
                    seoTitle: page.seoMeta?.titleEn ?? formState.titleEn,
                    seoDescription: page.seoMeta?.descriptionEn ?? formState.excerptEn ?? "",
                  }}
                />
                <LocalizedSlugEditor
                  entityType="CmsPage"
                  entityId={page.id}
                  defaultSlug={formState.slug}
                  pathPrefix="/pages"
                />
                </>
              ) : null}
              </>
            )}

            {tab === "content" && (
              <div className="space-y-4">
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
                {formState.blocks.length === 0 && recommendedTemplate && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Recommended template</CardTitle>
                      <CardDescription>
                        {recommendedTemplate.name}
                        {recommendedTemplate.description
                          ? ` — ${recommendedTemplate.description}`
                          : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button type="button" onClick={applyRecommendedTemplate}>
                        Apply recommended template
                      </Button>
                    </CardContent>
                  </Card>
                )}
                <BlockEditor
                blocks={formState.blocks}
                onChange={handleBlocksChange}
                embeddedTemplates={false}
                embeddedHistory={false}
                includeHiddenInput={false}
                onGoToTemplates={() => setActiveTab("templates")}
                onSelectBlock={setSelectedBlockId}
                galleryOptions={galleryOptions}
                faqSetOptions={faqSetOptions}
                testimonialOptions={testimonialOptions}
                testimonialCollectionOptions={testimonialCollectionOptions}
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

            {tab === "templates" && (
              <div className="space-y-6">
                <BlockPresetPanel
                  selectedBlock={selectedBlock}
                  currentBlocks={formState.blocks}
                  onInsertBlock={insertPresetBlock}
                  onApplyTemplate={handleBlocksChange}
                  templatesOnly
                />
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Block presets</CardTitle>
                    <CardDescription>Saved block configurations you can insert quickly.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BlockPresetPanel
                      selectedBlock={selectedBlock}
                      currentBlocks={formState.blocks}
                      onInsertBlock={insertPresetBlock}
                      onApplyTemplate={handleBlocksChange}
                      presetsOnly
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === "preview" && (
              <Card>
                <CardHeader>
                  <CardTitle>Page preview</CardTitle>
                  <CardDescription>Preview how your page blocks will look across devices.</CardDescription>
                </CardHeader>
                <CardContent>
                  <BlockDevicePreview
                    blocks={formState.blocks}
                    pageId={page?.id}
                    locales={locales}
                    galleryOptions={galleryOptions}
                    faqSetOptions={faqSetOptions}
                    testimonialOptions={testimonialOptions}
                    testimonialCollectionOptions={testimonialCollectionOptions}
                  />
                </CardContent>
              </Card>
            )}

            {tab === "seo" && page?.id && (
              <SeoMetaPanel
                cmsPageId={page.id}
                meta={page.seoMeta}
                defaultTitleEn={formState.titleEn}
                defaultTitleAr={formState.titleAr}
                defaultDescEn={formState.excerptEn}
                defaultDescAr={formState.excerptAr}
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
                        handleBlocksChange(migrateLegacyCatalogBlocks(cloneBlocks(revBlocks)));
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

      <div className="flex flex-wrap gap-3 pt-4 border-t lg:hidden">
        <Button type="button" onClick={onSave}>
          Save
        </Button>
        {page?.id && <PageActions page={page} />}
      </div>
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
}: {
  page?: PageWithRevisions;
  locales?: PublicLocale[];
  initialBlockTranslations?: EntityTranslation[];
  initialPageTranslations?: EntityTranslation[];
  galleryOptions?: GalleryBuilderOption[];
  faqSetOptions?: FaqSetBuilderOption[];
  testimonialOptions?: TestimonialBuilderOption[];
  testimonialCollectionOptions?: TestimonialCollectionBuilderOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const handleSaveRef = useRef<() => void>(() => {});
  const [activeTab, setActiveTab] = useState<string>("general");
  const [formState, setFormState] = useState<PageFormState>(() =>
    buildInitialFormState(page, initialPageTranslations)
  );

  const updateFormState = useCallback((patch: Partial<PageFormState>) => {
    setFormState((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSave = useCallback(() => {
    handleSaveRef.current();
  }, []);

  const handlePublish = useCallback(async () => {
    if (!page?.id) return;
    await publishCmsPage(page.id);
    window.location.reload();
  }, [page?.id]);

  const handlePreview = useCallback(() => {
    setActiveTab("preview");
  }, []);

  const title = page ? `Edit: ${page.titleEn}` : "New Page";
  const description = page
    ? "Update page content, blocks, and publishing settings."
    : "Create a new CMS page with the block builder.";

  const handleLegacyPropUpdate = useCallback(
    (blockId: string, field: string, localeCode: string, value: string) => {
      const suffix = getContentFieldSuffix(localeCode);
      if (suffix !== "En" && suffix !== "Ar") return;
      setFormState((prev) => ({
        ...prev,
        blocks: updateBlockInTree(prev.blocks, blockId, (block) => ({
          ...block,
          props: { ...block.props, [`${field}${suffix}`]: value },
        })),
      }));
    },
    []
  );

  const editorTree = (
    <AdminFormProvider
      onSave={handleSave}
      onPublish={page?.id ? handlePublish : undefined}
      onPreview={handlePreview}
      canPublish={Boolean(page?.id)}
    >
      <PageEditorSaveGuard
        formRef={formRef}
        formState={formState}
        handleSaveRef={handleSaveRef}
        setActiveTab={setActiveTab}
      />
      <form ref={formRef} action={upsertCmsPage} data-page-editor className="contents">
        {page?.id && <input type="hidden" name="id" value={page.id} />}
        <input type="hidden" name="slug" value={formState.slug} readOnly />
        <input type="hidden" name="status" value={formState.status} readOnly />
        <input type="hidden" name="templateKey" value={formState.templateKey} readOnly />
        <input type="hidden" name="scheduledAt" value={formState.scheduledAt} readOnly />
        <input type="hidden" name="blocks" value={JSON.stringify(formState.blocks)} readOnly />
        <input
          type="hidden"
          name="visualSettings"
          value={JSON.stringify(formState.visualSettings)}
          readOnly
        />
        <BlockTranslationsHiddenInput />
        {locales.length > 0 ? (
          <PageLocalizedFormHiddens localeFields={formState.localeFields} locales={locales} />
        ) : (
          <>
            <input type="hidden" name="titleEn" value={formState.titleEn} readOnly />
            <input type="hidden" name="titleAr" value={formState.titleAr} readOnly />
            <input type="hidden" name="excerptEn" value={formState.excerptEn} readOnly />
            <input type="hidden" name="excerptAr" value={formState.excerptAr} readOnly />
          </>
        )}

        <PageEditorFields
        page={page}
        title={title}
        description={description}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        formState={formState}
        updateFormState={updateFormState}
        onSave={handleSave}
        galleryOptions={galleryOptions}
        faqSetOptions={faqSetOptions}
        testimonialOptions={testimonialOptions}
        testimonialCollectionOptions={testimonialCollectionOptions}
        locales={locales}
        initialBlockTranslations={initialBlockTranslations}
        initialPageTranslations={initialPageTranslations}
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
      initialBlocks={formState.blocks}
      initialRows={initialBlockTranslations}
      onLegacyPropUpdate={handleLegacyPropUpdate}
    >
      {editorTree}
    </BlockTranslationProvider>
  );
}

function PageEditorSaveGuard({
  formRef,
  formState,
  handleSaveRef,
  setActiveTab,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  formState: PageFormState;
  handleSaveRef: React.MutableRefObject<() => void>;
  setActiveTab: (tab: string) => void;
}) {
  const { showToast } = useAdminForm();

  useEffect(() => {
    handleSaveRef.current = () => {
      const error = getPageFormValidationError(toValidationFields(formState));
      if (error) {
        showToast(error, "error");
        setActiveTab("general");
        return;
      }
      formRef.current?.requestSubmit();
    };
  }, [formRef, formState, handleSaveRef, setActiveTab, showToast]);

  return null;
}
