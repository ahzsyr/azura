"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  applyEditorSaveNavigation,
  buildPostEditorPath,
  readEditorContentQueryParams,
  readEditorHashTab,
  replaceEditorHashUrl,
} from "@/lib/editor-url-sync";
import { useEditorPublishStatus, markEditorPlainSavePending } from "@/hooks/use-editor-publish-status";
import { SLUG_INPUT_PATTERN } from "@/lib/slug-pattern";
import type { Post, PostAuthor, PostCategory, PostTag, SeoMeta, EntityTranslation, ContentStatus } from "@prisma/client";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { legacyShapeFromTranslations } from "@/features/portal/lib/portal-translation-shape";
import type { PublicLocale } from "@/i18n/locale-config";
import { LocalizedSlugEditor } from "@/features/translation/components/localized-slug-editor";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import {
  BlockTranslationProvider,
  BlockTranslationsHiddenInput,
} from "@/features/builder/block-translation-context";
import { SeoMetaPanel } from "@/features/seo/components/seo-meta-panel";
import {
  savePostFromEditor,
  duplicatePost,
} from "@/features/cms/actions";
import { formatScheduledInput } from "@/features/cms/scheduling-utils";
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
} from "@/features/layout-engine/composition-editor-helpers";
import { isArabicLocale } from "@/shared/layout/direction/direction-resolver";
import { PostFeaturedPhotoPanel } from "./post-featured-photo-panel";
import { parsePostFeaturedImageSettings, type PostFeaturedImageSettings } from "@/schemas/featured-image-settings";
import { TaxonomySelect } from "./taxonomy-select";
import { RelatedPostsSelect } from "./related-posts-select";
import { CmsStatusBadge } from "./cms-status-badge";
import { AdminFormProvider, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PageBlocks } from "@/types/builder";
import { migrateLegacyCatalogBlocks } from "@/features/builder/migrate-legacy-blocks";
import Link from "next/link";
import { Copy, ExternalLink } from "lucide-react";
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
import {
  isBlockInspectorTab,
  type BlockInspectorTabId,
} from "@/features/builder/constants/block-inspector-tabs";

const BlockEditor = dynamic(
  () => import("@/features/builder/components/block-editor").then((m) => m.BlockEditor),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 text-sm text-muted-foreground animate-pulse">Loading block editor…</div>
    ),
  },
);

const POST_TABS = [
  { id: "general", label: "General" },
  { id: "content", label: "Content" },
  { id: "layout", label: "Page Layout" },
  { id: "preview", label: "Preview" },
  { id: "seo", label: "SEO" },
] as const;

const POST_TAB_IDS = new Set<string>(POST_TABS.map((t) => t.id));

function isPostTab(id: string | null): id is (typeof POST_TABS)[number]["id"] {
  return id != null && POST_TAB_IDS.has(id);
}

type PostFull = Post & {
  categories: { categoryId: string }[];
  tags: { tagId: string }[];
  featuredImage?: { url: string } | null;
  seoMeta?: SeoMeta | null;
};

type PostOption = {
  id: string;
  slug: string;
  displayTitle: string;
  status: string;
};

type Props = {
  post?: PostFull;
  categories: PostCategory[];
  tags: PostTag[];
  authors: PostAuthor[];
  postPickerOptions?: PostOption[];
  galleryOptions?: GalleryBuilderOption[];
  faqSetOptions?: FaqSetBuilderOption[];
  testimonialOptions?: TestimonialBuilderOption[];
  testimonialCollectionOptions?: TestimonialCollectionBuilderOption[];
  collectionOptions?: CollectionBuilderOption[];
  productOptions?: ProductBuilderOption[];
  brandOptions?: BrandBuilderOption[];
  locales?: PublicLocale[];
  initialTranslations?: EntityTranslation[];
  initialBlockTranslations?: EntityTranslation[];
};

function PostTabPanel({
  post,
  tab,
  slug,
  setSlug,
  status,
  setStatus,
  authorId,
  setAuthorId,
  scheduledAt,
  setScheduledAt,
  selectedBlockId,
  onSelectBlock,
  inspectorTab,
  onInspectorTabChange,
  composition,
  selectedRegion,
  onSelectRegion,
  handleCompositionChange,
  handleBlocksChange,
  blocksRef,
  onGoToLayout,
  categoryIds,
  setCategoryIds,
  tagIds,
  setTagIds,
  relatedPostIds,
  setRelatedPostIds,
  setFeaturedImageId,
  featuredImageUrl,
  setFeaturedImageUrl,
  featuredImageSettings,
  setFeaturedImageSettings,
  categories,
  tags,
  authors,
  postPickerOptions,
  postLegacy,
  postTitleEn,
  postTitleAr,
  postExcerptEn,
  postExcerptAr,
  onPublish,
  galleryOptions,
  faqSetOptions,
  testimonialOptions,
  testimonialCollectionOptions,
  collectionOptions,
  productOptions,
  brandOptions,
  locales,
  initialBlockTranslations,
  markDirty,
}: {
  post?: PostFull;
  tab: string;
  slug: string;
  setSlug: (value: string) => void;
  status: ContentStatus;
  setStatus: (value: ContentStatus) => void;
  authorId: string;
  setAuthorId: (value: string) => void;
  scheduledAt: string;
  setScheduledAt: (value: string) => void;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  inspectorTab: BlockInspectorTabId;
  onInspectorTabChange: (tab: BlockInspectorTabId) => void;
  composition: Composition;
  selectedRegion: RegionId;
  onSelectRegion: (region: RegionId) => void;
  handleCompositionChange: (composition: Composition) => void;
  handleBlocksChange: (next: PageBlocks) => void;
  blocksRef: React.MutableRefObject<PageBlocks>;
  onGoToLayout: () => void;
  categoryIds: string[];
  setCategoryIds: (ids: string[]) => void;
  tagIds: string[];
  setTagIds: (ids: string[]) => void;
  relatedPostIds: string[];
  setRelatedPostIds: (ids: string[]) => void;
  setFeaturedImageId: (id: string) => void;
  featuredImageUrl: string;
  setFeaturedImageUrl: (url: string) => void;
  featuredImageSettings: PostFeaturedImageSettings;
  setFeaturedImageSettings: (settings: PostFeaturedImageSettings) => void;
  categories: PostCategory[];
  tags: PostTag[];
  authors: PostAuthor[];
  postPickerOptions: PostOption[];
  postLegacy: ReturnType<typeof legacyShapeFromTranslations>;
  postTitleEn: string;
  postTitleAr: string;
  postExcerptEn: string;
  postExcerptAr: string;
  onPublish?: () => void | Promise<boolean | void>;
  galleryOptions: GalleryBuilderOption[];
  faqSetOptions: FaqSetBuilderOption[];
  testimonialOptions: TestimonialBuilderOption[];
  testimonialCollectionOptions: TestimonialCollectionBuilderOption[];
  collectionOptions: CollectionBuilderOption[];
  productOptions: ProductBuilderOption[];
  brandOptions: BrandBuilderOption[];
  locales: PublicLocale[];
  initialBlockTranslations: EntityTranslation[];
  markDirty: () => void;
}) {
  const defaultLocaleCode = locales?.find((l) => l.isDefault)?.code ?? "en";
  const isRtl = isArabicLocale(defaultLocaleCode);
  const activeRegions = getEditableRegions(composition);
  const editorBlocks = composition.regions[selectedRegion] ?? [];

  if (!post?.id && tab !== "general") {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Save the post first to manage {tab.replace(/([A-Z])/g, " $1").toLowerCase()}.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {tab === "general" && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Main details</CardTitle>
                <CardDescription>Core post information and publishing settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Slug</Label>
                    <Input
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value);
                        markDirty();
                      }}
                      required
                      pattern={SLUG_INPUT_PATTERN}
                    />
                    <p className="text-xs text-muted-foreground mt-1">URL: /[locale]/blog/[slug]</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value as ContentStatus);
                        markDirty();
                      }}
                      className="w-full border rounded-md h-10 px-3"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                  <div>
                    <Label>Author</Label>
                    <select
                      value={authorId}
                      onChange={(e) => {
                        setAuthorId(e.target.value);
                        markDirty();
                      }}
                      className="w-full border rounded-md h-10 px-3"
                    >
                      <option value="">—</option>
                      {authors.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Link href="/admin/posts/authors" className="text-primary underline">
                        Manage authors
                      </Link>
                    </p>
                  </div>
                  <div>
                    <Label>Schedule publish</Label>
                    <Input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => {
                        setScheduledAt(e.target.value);
                        markDirty();
                      }}
                    />
                  </div>
                </div>
                <AdminLocalizedFormField
                  fieldKey="title"
                  label="Title"
                  entityType="Post"
                  entityId={post?.id}
                  legacyEntity={postLegacy}
                  required
                />
                <AdminLocalizedFormField
                  fieldKey="excerpt"
                  label="Excerpt"
                  entityType="Post"
                  entityId={post?.id}
                  legacyEntity={postLegacy}
                  multiline
                  rows={2}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Featured photo</CardTitle>
                <CardDescription>Hero image, display options, alt text, and caption.</CardDescription>
              </CardHeader>
              <CardContent>
                <PostFeaturedPhotoPanel
                  postId={post?.id}
                  postLegacy={postLegacy}
                  featuredImageUrl={featuredImageUrl}
                  onFeaturedImageUrlChange={setFeaturedImageUrl}
                  onFeaturedImageIdChange={setFeaturedImageId}
                  settings={featuredImageSettings}
                  onSettingsChange={setFeaturedImageSettings}
                  markDirty={markDirty}
                />
              </CardContent>
            </Card>
          </div>

          {post?.id ? (
            <LocalizedSlugEditor
              entityType="Post"
              entityId={post.id}
              defaultSlug={post.slug}
              pathPrefix="/blog"
            />
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Taxonomy</CardTitle>
                <CardDescription>Categories and tags for this post.</CardDescription>
              </CardHeader>
              <CardContent>
                <TaxonomySelect
                  categories={categories}
                  tags={tags}
                  selectedCategoryIds={categoryIds}
                  selectedTagIds={tagIds}
                  onCategoriesChange={(ids) => {
                    setCategoryIds(ids);
                    markDirty();
                  }}
                  onTagsChange={(ids) => {
                    setTagIds(ids);
                    markDirty();
                  }}
                />
              </CardContent>
            </Card>

            {post?.id && postPickerOptions.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Related posts</CardTitle>
                  <CardDescription>Suggest other posts to readers at the end of this article.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RelatedPostsSelect
                    posts={postPickerOptions}
                    selectedIds={relatedPostIds}
                    onChange={(ids) => {
                      setRelatedPostIds(ids);
                      markDirty();
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Related posts</CardTitle>
                  <CardDescription>Save the post first to link related articles.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Related posts become available after the first save.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === "content" && (
        <div className="space-y-6">
          {post?.status !== "PUBLISHED" && getCompositionBlocks(composition).length > 0 && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="py-4 text-sm text-muted-foreground">
                This post is{" "}
                <span className="font-medium text-foreground">{post?.status ?? "DRAFT"}</span>.
                Blocks are saved in the admin but{" "}
                <span className="font-medium text-foreground">will not appear on the public website</span>{" "}
                until you set status to Published and save, or use the Publish button.
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
                  blocksRef.current = composition.regions[regionId] ?? [];
                }}
              >
                {getCompositionRegionLabel(regionId, isRtl)}
              </Button>
            ))}
          </div>

          <BlockTranslationProvider
            locales={locales}
            initialRows={initialBlockTranslations}
            initialBlocks={editorBlocks}
            parentType="Post"
            parentId={post?.id ?? "new"}
          >
            <BlockEditor
              blocks={editorBlocks}
              onChange={handleBlocksChange}
              blocksRef={blocksRef}
              embeddedTemplates={false}
              embeddedHistory={false}
              includeHiddenInput={false}
              selectedId={selectedBlockId}
              onSelectBlock={onSelectBlock}
              inspectorTab={inspectorTab}
              onInspectorTabChange={onInspectorTabChange}
              onGoToTemplates={onGoToLayout}
              galleryOptions={galleryOptions}
              faqSetOptions={faqSetOptions}
              testimonialOptions={testimonialOptions}
              testimonialCollectionOptions={testimonialCollectionOptions}
              collectionOptions={collectionOptions}
              productOptions={productOptions}
              brandOptions={brandOptions}
              locales={locales}
              blockParentType="Post"
              blockParentId={post?.id ?? null}
              initialBlockTranslations={initialBlockTranslations}
            />
            <BlockTranslationsHiddenInput />
          </BlockTranslationProvider>
        </div>
      )}

      {tab === "layout" && (
        <div className="space-y-6">
          <PageLayoutPanel
            composition={composition}
            dir={isRtl ? "rtl" : "ltr"}
            onChange={(next) => {
              handleCompositionChange(next);
              markDirty();
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
              blocksRef.current = nextBlocks;
              onSelectRegion(targetRegion);
              handleCompositionChange(patchCompositionRegion(composition, targetRegion, nextBlocks));
              markDirty();
            }}
          />
        </div>
      )}

      {tab === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle>Post preview</CardTitle>
            <CardDescription>Preview how your post blocks will look across devices.</CardDescription>
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
      )}

      {tab === "seo" && post?.id && (
        <SeoMetaPanel
          embedded
          useTopBarActions
          onPublish={onPublish}
          canPublish={Boolean(post?.id)}
          postId={post.id}
          meta={post.seoMeta}
          defaultTitleEn={postTitleEn}
          defaultTitleAr={postTitleAr}
          defaultDescEn={postExcerptEn}
          defaultDescAr={postExcerptAr}
        />
      )}

      {tab === "seo" && !post?.id && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Save the post first to configure SEO settings.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function PostEditorForm({
  post,
  categories,
  tags,
  authors,
  postPickerOptions = [],
  galleryOptions = [],
  faqSetOptions = [],
  testimonialOptions = [],
  testimonialCollectionOptions = [],
  collectionOptions = [],
  productOptions = [],
  brandOptions = [],
  locales = [],
  initialTranslations = [],
  initialBlockTranslations = [],
}: Props) {
  const translationCtx = { translations: initialTranslations };
  const postLegacy = legacyShapeFromTranslations(initialTranslations, [
    "title",
    "excerpt",
    "featuredImageAlt",
    "featuredImageCaption",
  ]);
  const postTitleEn = resolveTranslation("title", "en", translationCtx);
  const postTitleAr = resolveTranslation("title", "ar", translationCtx);
  const postExcerptEn = resolveTranslation("excerpt", "en", translationCtx);
  const postExcerptAr = resolveTranslation("excerpt", "ar", translationCtx);

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);
  const migratedBlocks = migrateLegacyCatalogBlocks(
    Array.isArray(post?.blocks) ? (post.blocks as PageBlocks) : []
  );
  const [composition, setComposition] = useState<Composition>(() =>
    compositionService.load({
      composition:
        post && "composition" in post
          ? (post as PostFull & { composition?: unknown }).composition
          : undefined,
      blocks: migratedBlocks,
    }),
  );
  const [selectedRegion, setSelectedRegion] = useState<RegionId>("primary");
  const blocksRef = useRef<PageBlocks>(composition.regions.primary);
  const [categoryIds, setCategoryIds] = useState(post?.categories?.map((c) => c.categoryId) ?? []);
  const [tagIds, setTagIds] = useState(post?.tags?.map((t) => t.tagId) ?? []);
  const [relatedPostIds, setRelatedPostIds] = useState<string[]>(() => {
    const raw = post?.relatedPostIds;
    return Array.isArray(raw) ? (raw as string[]) : [];
  });
  const [featuredImageId, setFeaturedImageId] = useState(post?.featuredImageId ?? "");
  const [featuredImageUrl, setFeaturedImageUrl] = useState(post?.featuredImage?.url ?? "");
  const [featuredImageSettings, setFeaturedImageSettings] = useState<PostFeaturedImageSettings>(() =>
    parsePostFeaturedImageSettings(post?.featuredImageSettings),
  );
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [status, setStatus] = useState<ContentStatus>(post?.status ?? "DRAFT");
  const [authorId, setAuthorId] = useState(post?.authorId ?? "");
  const [scheduledAt, setScheduledAt] = useState(formatScheduledInput(post?.scheduledAt));
  const formRef = useRef<HTMLFormElement>(null);
  const urlHydratedRef = useRef(false);

  useEditorPublishStatus(post?.id, status);

  const [newPostTab, setNewPostTab] = useState<string>("general");
  const [activeTab, setActiveTab] = useState<(typeof POST_TABS)[number]["id"]>("general");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<BlockInspectorTabId>("content");

  useEffect(() => {
    if (!post?.id || urlHydratedRef.current) return;
    urlHydratedRef.current = true;

    const tabFromUrl = readEditorHashTab(POST_TAB_IDS, "general");
    const { block, inspector, region } = readEditorContentQueryParams();

    if (isPostTab(tabFromUrl)) setActiveTab(tabFromUrl);
    setSelectedBlockId(block);
    if (isBlockInspectorTab(inspector)) setInspectorTab(inspector);
    if (region) setSelectedRegion(region);

    const normalizedPath = buildPostEditorPath(
      post.id,
      isPostTab(tabFromUrl) ? tabFromUrl : "general",
      block,
      isBlockInspectorTab(inspector) ? inspector : "content",
      region,
    );
    replaceEditorHashUrl(normalizedPath);
  }, [post?.id]);

  const displayActiveTab = post?.id
    ? activeTab
    : isPostTab(newPostTab)
      ? newPostTab
      : "general";

  const syncPostEditorUrl = useCallback(
    (tabId: string, blockId: string | null, inspector: BlockInspectorTabId, region: RegionId) => {
      if (!post?.id) return;
      replaceEditorHashUrl(buildPostEditorPath(post.id, tabId, blockId, inspector, region));
    },
    [post?.id],
  );

  const handleTabChange = useCallback(
    (tabId: string) => {
      if (!post?.id) {
        setNewPostTab(tabId);
        return;
      }
      if (!isPostTab(tabId)) return;
      setActiveTab(tabId);
      syncPostEditorUrl(tabId, selectedBlockId, inspectorTab, selectedRegion);
    },
    [inspectorTab, post?.id, selectedBlockId, selectedRegion, syncPostEditorUrl],
  );

  const handleSelectBlock = useCallback(
    (id: string | null) => {
      setSelectedBlockId(id);
      if (!post?.id) return;
      setActiveTab("content");
      syncPostEditorUrl("content", id, inspectorTab, selectedRegion);
    },
    [inspectorTab, post?.id, selectedRegion, syncPostEditorUrl],
  );

  const handleInspectorTabChange = useCallback(
    (tab: BlockInspectorTabId) => {
      setInspectorTab(tab);
      if (!post?.id) return;
      setActiveTab("content");
      syncPostEditorUrl("content", selectedBlockId, tab, selectedRegion);
    },
    [post?.id, selectedBlockId, selectedRegion, syncPostEditorUrl],
  );

  const markDirty = useCallback(() => {
    markUnsaved();
  }, [markUnsaved]);

  const syncFormInputs = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const blocksInput = form.querySelector('input[name="blocks"]') as HTMLInputElement | null;
    const compositionInput = form.querySelector('input[name="composition"]') as HTMLInputElement | null;
    if (blocksInput) {
      blocksInput.value = JSON.stringify(composition.regions.primary);
    }
    if (compositionInput) {
      compositionInput.value = JSON.stringify(composition);
    }
  }, [composition]);

  const handleBlocksChange = useCallback(
    (next: PageBlocks) => {
      blocksRef.current = next;
      setComposition((prev) => patchCompositionRegion(prev, selectedRegion, next));
      markDirty();
    },
    [markDirty, selectedRegion],
  );

  const handleCompositionChange = useCallback((next: Composition) => {
    setComposition(next);
    blocksRef.current = next.regions[selectedRegion] ?? [];
  }, [selectedRegion]);

  const submitPostForm = useCallback(
    async (statusOverride?: ContentStatus): Promise<boolean> => {
      const form = formRef.current;
      if (!form) return false;

      syncFormInputs();

      if (statusOverride) {
        setStatus(statusOverride);
        const statusInput = form.querySelector('input[name="status"]') as HTMLInputElement | null;
        if (statusInput) statusInput.value = statusOverride;
      }

      setSaveStatus("saving");
      const result = await savePostFromEditor(new FormData(form));
      if (result.ok) {
        markSaved();
        if (!statusOverride) {
          markEditorPlainSavePending();
        }
        applyEditorSaveNavigation(result.redirectTo, router, { useHashUrl: true });
        return true;
      }

      setSaveStatus("error");
      console.error("[post-editor] save failed:", result.error);
      return false;
    },
    [markSaved, router, setSaveStatus, syncFormInputs],
  );

  const handleFormSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      void submitPostForm();
    },
    [submitPostForm],
  );

  const handleSave = useCallback(async () => submitPostForm(), [submitPostForm]);

  const handlePublish = useCallback(async () => {
    if (!slug.trim()) {
      setActiveTab("general");
      throw new Error("Slug is required before publishing.");
    }
    const ok = await submitPostForm("PUBLISHED");
    if (!ok) throw new Error("Publish failed");
    return true;
  }, [slug, submitPostForm]);

  const handlePreview = useCallback(() => {
    handleTabChange("preview");
  }, [handleTabChange]);

  const handleCancel = useCallback(() => {
    if (!post) {
      router.push("/admin/posts");
      return;
    }
    const migrated = migrateLegacyCatalogBlocks((post.blocks as PageBlocks) ?? []);
    const nextComposition = compositionService.load({
      composition:
        "composition" in post
          ? (post as PostFull & { composition?: unknown }).composition
          : undefined,
      blocks: migrated,
    });
    setComposition(nextComposition);
    blocksRef.current = nextComposition.regions[selectedRegion] ?? [];
    setCategoryIds(post.categories?.map((c) => c.categoryId) ?? []);
    setTagIds(post.tags?.map((t) => t.tagId) ?? []);
    setRelatedPostIds(Array.isArray(post.relatedPostIds) ? (post.relatedPostIds as string[]) : []);
    setFeaturedImageId(post.featuredImageId ?? "");
    setFeaturedImageUrl(post.featuredImage?.url ?? "");
    setFeaturedImageSettings(parsePostFeaturedImageSettings(post.featuredImageSettings));
    setSlug(post.slug);
    setStatus(post.status);
    setAuthorId(post.authorId ?? "");
    setScheduledAt(formatScheduledInput(post.scheduledAt));

    const tabFromUrl = readEditorHashTab(POST_TAB_IDS, "general");
    const { block, inspector, region } = readEditorContentQueryParams();
    setSelectedBlockId(block);
    setInspectorTab(isBlockInspectorTab(inspector) ? inspector : "content");
    if (region) setSelectedRegion(region);
    if (isPostTab(tabFromUrl)) setActiveTab(tabFromUrl);
    router.refresh();
  }, [post, router, selectedRegion]);

  const handleDuplicate = useCallback(() => {
    if (!post) return;
    startTransition(async () => {
      await duplicatePost(post.id);
    });
  }, [post]);

  const postTitle = postTitleEn || postTitleAr || post?.slug || "";
  const title = post ? `Edit: ${postTitle}` : "New Post";
  const description = post
    ? "Update post content, blocks, and publishing settings."
    : "Create a new blog post with the block builder.";

  const isSeoTab = displayActiveTab === "seo";
  const canPublishFromPage = !isSeoTab;

  const tabPanelProps = {
    post,
    slug,
    setSlug,
    status,
    setStatus,
    authorId,
    setAuthorId,
    scheduledAt,
    setScheduledAt,
    selectedBlockId,
    onSelectBlock: handleSelectBlock,
    inspectorTab,
    onInspectorTabChange: handleInspectorTabChange,
    composition,
    selectedRegion,
    onSelectRegion: (region: RegionId) => {
      setSelectedRegion(region);
      blocksRef.current = composition.regions[region] ?? [];
      if (post?.id) {
        syncPostEditorUrl("content", selectedBlockId, inspectorTab, region);
      }
    },
    handleCompositionChange,
    handleBlocksChange,
    blocksRef,
    onGoToLayout: () => handleTabChange("layout"),
    categoryIds,
    setCategoryIds,
    tagIds,
    setTagIds,
    relatedPostIds,
    setRelatedPostIds,
    setFeaturedImageId,
    featuredImageUrl,
    setFeaturedImageUrl,
    featuredImageSettings,
    setFeaturedImageSettings,
    categories,
    tags,
    authors,
    postPickerOptions,
    postLegacy,
    postTitleEn,
    postTitleAr,
    postExcerptEn,
    postExcerptAr,
    onPublish: handlePublish,
    galleryOptions,
    faqSetOptions,
    testimonialOptions,
    testimonialCollectionOptions,
    collectionOptions,
    productOptions,
    brandOptions,
    locales,
    initialBlockTranslations,
    markDirty,
  };

  return (
    <AdminFormProvider
      suppressPageActions={isSeoTab}
      onSave={isSeoTab ? undefined : handleSave}
      onCancel={handleCancel}
      onPublish={canPublishFromPage ? handlePublish : undefined}
      onPreview={isSeoTab ? undefined : handlePreview}
      canPublish={canPublishFromPage}
      canCancel
      trackFormId="post-editor-form"
    >
      <AdminPageHeader
        title={title}
        description={description}
        actions={
          post ? (
            <div className="flex flex-wrap items-center gap-2">
              <CmsStatusBadge status={post.status} scheduledAt={post.scheduledAt} />
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
              {post.status === "PUBLISHED" && (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/en/blog/${post.slug}`} target="_blank">
                    <ExternalLink className="h-3.5 w-3.5 me-1" />
                    View
                  </Link>
                </Button>
              )}
            </div>
          ) : null
        }
      />
      <form
        id="post-editor-form"
        ref={formRef}
        onSubmit={handleFormSubmit}
        className="flex flex-col min-h-0 flex-1 w-full"
      >
        {post?.id && <input type="hidden" name="id" value={post.id} />}
        <input type="hidden" name="slug" value={slug} readOnly />
        <input type="hidden" name="status" value={status} readOnly />
        <input type="hidden" name="authorId" value={authorId} readOnly />
        <input type="hidden" name="scheduledAt" value={scheduledAt} readOnly />
        <input type="hidden" name="editorTab" value={displayActiveTab} readOnly />
        <input type="hidden" name="editorRegion" value={selectedRegion} readOnly />
        <input type="hidden" name="selectedBlockId" value={selectedBlockId ?? ""} readOnly />
        <input type="hidden" name="editorInspector" value={inspectorTab} readOnly />
        <input type="hidden" name="categoryIds" value={JSON.stringify(categoryIds)} />
        <input type="hidden" name="tagIds" value={JSON.stringify(tagIds)} />
        <input type="hidden" name="relatedPostIds" value={JSON.stringify(relatedPostIds)} />
        <input type="hidden" name="featuredImageId" value={featuredImageId} readOnly />
        <input
          type="hidden"
          name="featuredImageSettings"
          value={JSON.stringify(featuredImageSettings)}
          readOnly
        />
        <input type="hidden" name="blocks" value={JSON.stringify(composition.regions.primary)} readOnly />
        <input type="hidden" name="composition" value={JSON.stringify(composition)} readOnly />

        <AdminSettingsLayout
          tabs={[...POST_TABS]}
          activeTab={displayActiveTab}
          onTabChange={handleTabChange}
          layoutId="post-editor-ribbon"
        >
          {() => <PostTabPanel tab={displayActiveTab} {...tabPanelProps} />}
        </AdminSettingsLayout>
      </form>
    </AdminFormProvider>
  );
}
