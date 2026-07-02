"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { replaceBrowserUrl } from "@/lib/editor-url-sync";
import type { Post, PostAuthor, PostCategory, PostTag, SeoMeta, EntityTranslation } from "@prisma/client";
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
  upsertPost,
  duplicatePost,
  deletePost,
  unpublishPost,
} from "@/features/cms/actions";
import { formatScheduledInput } from "@/features/cms/scheduling-utils";
import { BlockEditor } from "@/features/builder/components/block-editor";
import { BlockDevicePreview } from "@/features/builder/components/block-device-preview";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { TaxonomySelect } from "./taxonomy-select";
import { RelatedPostsSelect } from "./related-posts-select";
import { CmsStatusBadge } from "./cms-status-badge";
import { EntityAdminShell } from "@/features/catalog/admin/entity-admin-shell";
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

const POST_TABS = [
  { id: "general", label: "General" },
  { id: "content", label: "Content" },
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

function PostActions({ post, onPublishNow }: { post: PostFull; onPublishNow?: () => void }) {
  return (
    <>
      {onPublishNow ? (
        <Button type="button" variant="secondary" onClick={onPublishNow}>
          Publish now
        </Button>
      ) : null}
      <Button type="button" variant="outline" onClick={() => duplicatePost(post.id)}>
        Duplicate
      </Button>
      {post.status === "PUBLISHED" && (
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            await unpublishPost(post.id);
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
          if (confirm("Delete this post?")) deletePost(post.id);
        }}
      >
        Delete
      </Button>
    </>
  );
}

function PostTabPanel({
  post,
  tab,
  selectedBlockId,
  onSelectBlock,
  inspectorTab,
  onInspectorTabChange,
  editorBlocks,
  handleBlocksChange,
  blocksRef,
  categoryIds,
  setCategoryIds,
  tagIds,
  setTagIds,
  relatedPostIds,
  setRelatedPostIds,
  setFeaturedImageId,
  featuredImageUrl,
  setFeaturedImageUrl,
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
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  inspectorTab: BlockInspectorTabId;
  onInspectorTabChange: (tab: BlockInspectorTabId) => void;
  editorBlocks: PageBlocks;
  handleBlocksChange: (next: PageBlocks) => void;
  blocksRef: React.MutableRefObject<PageBlocks>;
  categoryIds: string[];
  setCategoryIds: (ids: string[]) => void;
  tagIds: string[];
  setTagIds: (ids: string[]) => void;
  relatedPostIds: string[];
  setRelatedPostIds: (ids: string[]) => void;
  setFeaturedImageId: (id: string) => void;
  featuredImageUrl: string;
  setFeaturedImageUrl: (url: string) => void;
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
                <Card>
                  <CardHeader>
                    <CardTitle>Post details</CardTitle>
                    <CardDescription>Slug, status, titles, author, and scheduling.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Slug</Label>
                      <Input name="slug" defaultValue={post?.slug ?? ""} required pattern="[a-z0-9-]+" />
                      <p className="text-xs text-muted-foreground mt-1">URL: /[locale]/blog/[slug]</p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <select
                        name="status"
                        defaultValue={post?.status ?? "DRAFT"}
                        className="w-full border rounded-md h-10 px-3"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-6">
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
                    </div>
                    <div>
                      <Label>Author</Label>
                      <select
                        name="authorId"
                        defaultValue={post?.authorId ?? ""}
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
                        name="scheduledAt"
                        type="datetime-local"
                        defaultValue={formatScheduledInput(post?.scheduledAt)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <UrlPrimaryMediaPickerField
                        label="Featured image"
                        url={featuredImageUrl}
                        onChange={(url) => {
                          setFeaturedImageUrl(url);
                          markDirty();
                        }}
                        onMediaIdChange={(mediaId) => {
                          setFeaturedImageId(mediaId ?? "");
                          markDirty();
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {post?.id ? (
                  <LocalizedSlugEditor
                    entityType="Post"
                    entityId={post.id}
                    defaultSlug={post.slug}
                    pathPrefix="/blog"
                  />
                ) : null}

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

                {post?.id && postPickerOptions.length > 0 && (
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
                )}

              </div>
            )}

            {tab === "content" && (
              <div className="space-y-6">
                {post?.status !== "PUBLISHED" && editorBlocks.length > 0 && (
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

                <Card>
                  <CardHeader>
                    <CardTitle>Body content</CardTitle>
                    <CardDescription>Main article text (legacy field, shown alongside blocks).</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AdminLocalizedFormField
                      fieldKey="content"
                      label="Content"
                      entityType="Post"
                      entityId={post?.id}
                      legacyEntity={postLegacy}
                      multiline
                      rows={6}
                    />
                  </CardContent>
                </Card>

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

            {tab === "preview" && (
              <Card>
                <CardHeader>
                  <CardTitle>Post preview</CardTitle>
                  <CardDescription>Preview how your post blocks will look across devices.</CardDescription>
                </CardHeader>
                <CardContent>
                  <BlockDevicePreview
                    blocks={editorBlocks}
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
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const blockParam = searchParams.get("block");
  const inspectorParam = searchParams.get("inspector");

  const translationCtx = { translations: initialTranslations };
  const postLegacy = legacyShapeFromTranslations(initialTranslations, ["title", "excerpt", "content"]);
  const postTitleEn = resolveTranslation("title", "en", translationCtx);
  const postTitleAr = resolveTranslation("title", "ar", translationCtx);
  const postExcerptEn = resolveTranslation("excerpt", "en", translationCtx);
  const postExcerptAr = resolveTranslation("excerpt", "ar", translationCtx);

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const migratedBlocks = migrateLegacyCatalogBlocks((post?.blocks as PageBlocks) ?? []);
  const [editorBlocks, setEditorBlocks] = useState<PageBlocks>(migratedBlocks);
  const blocksRef = useRef<PageBlocks>(migratedBlocks);
  const [categoryIds, setCategoryIds] = useState(post?.categories?.map((c) => c.categoryId) ?? []);
  const [tagIds, setTagIds] = useState(post?.tags?.map((t) => t.tagId) ?? []);
  const [relatedPostIds, setRelatedPostIds] = useState<string[]>(() => {
    const raw = post?.relatedPostIds;
    return Array.isArray(raw) ? (raw as string[]) : [];
  });
  const [featuredImageId, setFeaturedImageId] = useState(post?.featuredImageId ?? "");
  const [featuredImageUrl, setFeaturedImageUrl] = useState(post?.featuredImage?.url ?? "");
  const formRef = useRef<HTMLFormElement>(null);

  const [newPostTab, setNewPostTab] = useState<string>("general");
  const [activeTab, setActiveTab] = useState<(typeof POST_TABS)[number]["id"]>(() => {
    if (!post?.id) return "general";
    return isPostTab(tabParam) ? tabParam : "general";
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(() => blockParam);
  const [inspectorTab, setInspectorTab] = useState<BlockInspectorTabId>(() =>
    isBlockInspectorTab(inspectorParam) ? inspectorParam : "content",
  );

  useEffect(() => {
    if (post?.id && isPostTab(tabParam)) setActiveTab(tabParam);
  }, [post?.id, tabParam]);

  useEffect(() => {
    setSelectedBlockId(blockParam);
  }, [blockParam]);

  useEffect(() => {
    if (isBlockInspectorTab(inspectorParam)) setInspectorTab(inspectorParam);
  }, [inspectorParam]);

  const displayActiveTab = post?.id
    ? activeTab
    : isPostTab(newPostTab)
      ? newPostTab
      : "general";

  const syncPostEditorUrl = useCallback(
    (params: URLSearchParams) => {
      if (!post?.id) return;
      replaceBrowserUrl(`/admin/posts/${post.id}?${params.toString()}`);
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
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tabId);
      if (tabId !== "content") {
        params.delete("block");
        params.delete("inspector");
      } else if (selectedBlockId) {
        params.set("block", selectedBlockId);
        params.set("inspector", inspectorTab);
      }
      syncPostEditorUrl(params);
    },
    [inspectorTab, post?.id, searchParams, selectedBlockId, syncPostEditorUrl],
  );

  const handleSelectBlock = useCallback(
    (id: string | null) => {
      setSelectedBlockId(id);
      if (!post?.id) return;
      setActiveTab("content");
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "content");
      if (id) params.set("block", id);
      else params.delete("block");
      params.set("inspector", inspectorTab);
      syncPostEditorUrl(params);
    },
    [inspectorTab, post?.id, searchParams, syncPostEditorUrl],
  );

  const handleInspectorTabChange = useCallback(
    (tab: BlockInspectorTabId) => {
      setInspectorTab(tab);
      if (!post?.id) return;
      setActiveTab("content");
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "content");
      params.set("inspector", tab);
      if (selectedBlockId) params.set("block", selectedBlockId);
      syncPostEditorUrl(params);
    },
    [post?.id, searchParams, selectedBlockId, syncPostEditorUrl],
  );

  const markDirty = useCallback(() => {
    markUnsaved();
  }, [markUnsaved]);

  const syncBlocksInput = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const blocksInput = form.querySelector('input[name="blocks"]') as HTMLInputElement | null;
    if (blocksInput) {
      blocksInput.value = JSON.stringify(blocksRef.current);
    }
  }, []);

  const handleBlocksChange = useCallback(
    (next: PageBlocks) => {
      blocksRef.current = next;
      setEditorBlocks(next);
      markDirty();
    },
    [markDirty],
  );

  const submitForm = useCallback(
    (statusOverride?: string) => {
      const form = formRef.current;
      if (!form) return;
      syncBlocksInput();
      if (statusOverride) {
        const statusSelect = form.querySelector('select[name="status"]') as HTMLSelectElement | null;
        if (statusSelect) statusSelect.value = statusOverride;
      }
      form.requestSubmit();
    },
    [syncBlocksInput],
  );

  const handleSave = useCallback(async () => {
    syncBlocksInput();
    submitForm();
    return true;
  }, [submitForm, syncBlocksInput]);

  const handlePublish = useCallback(async () => {
    syncBlocksInput();
    submitForm("PUBLISHED");
    return true;
  }, [submitForm, syncBlocksInput]);

  const handlePreview = useCallback(() => {
    handleTabChange("preview");
  }, [handleTabChange]);

  const handleCancel = useCallback(() => {
    if (!post) return;
    const migrated = migrateLegacyCatalogBlocks((post.blocks as PageBlocks) ?? []);
    setEditorBlocks(migrated);
    blocksRef.current = migrated;
    setCategoryIds(post.categories?.map((c) => c.categoryId) ?? []);
    setTagIds(post.tags?.map((t) => t.tagId) ?? []);
    setRelatedPostIds(Array.isArray(post.relatedPostIds) ? (post.relatedPostIds as string[]) : []);
    setFeaturedImageId(post.featuredImageId ?? "");
    setFeaturedImageUrl(post.featuredImage?.url ?? "");
    setSelectedBlockId(blockParam);
    setInspectorTab(isBlockInspectorTab(inspectorParam) ? inspectorParam : "content");
    if (isPostTab(tabParam)) setActiveTab(tabParam);
    router.refresh();
  }, [post, blockParam, inspectorParam, tabParam, router]);

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

  const tabPanelProps = {
    post,
    selectedBlockId,
    onSelectBlock: handleSelectBlock,
    inspectorTab,
    onInspectorTabChange: handleInspectorTabChange,
    editorBlocks,
    handleBlocksChange,
    blocksRef,
    categoryIds,
    setCategoryIds,
    tagIds,
    setTagIds,
    relatedPostIds,
    setRelatedPostIds,
    setFeaturedImageId,
    featuredImageUrl,
    setFeaturedImageUrl,
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
    <form
      id="post-editor-form"
      ref={formRef}
      action={upsertPost}
      className="flex flex-col min-h-0 flex-1 w-full"
      onSubmit={() => syncBlocksInput()}
    >
      {post?.id && <input type="hidden" name="id" value={post.id} />}
      <input type="hidden" name="editorTab" value={displayActiveTab} readOnly />
      <input type="hidden" name="selectedBlockId" value={selectedBlockId ?? ""} readOnly />
      <input type="hidden" name="editorInspector" value={inspectorTab} readOnly />
      <input type="hidden" name="categoryIds" value={JSON.stringify(categoryIds)} />
      <input type="hidden" name="tagIds" value={JSON.stringify(tagIds)} />
      <input type="hidden" name="relatedPostIds" value={JSON.stringify(relatedPostIds)} />
      <input type="hidden" name="featuredImageId" value={featuredImageId} readOnly />
      <input type="hidden" name="blocks" value={JSON.stringify(editorBlocks)} readOnly />

      <EntityAdminShell
        title={title}
        description={description}
        tabs={[...POST_TABS]}
        activeTab={displayActiveTab}
        onTabChange={handleTabChange}
        layoutId="post-editor-ribbon"
        trackFormId="post-editor-form"
        suppressPageActions={isSeoTab}
        onSave={isSeoTab ? undefined : handleSave}
        onCancel={post ? handleCancel : undefined}
        onPublish={!isSeoTab && post?.id ? handlePublish : undefined}
        onPreview={isSeoTab ? undefined : handlePreview}
        canPublish={!isSeoTab && Boolean(post?.id)}
        headerActions={
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
      >
        {(tab) => <PostTabPanel tab={tab} {...tabPanelProps} />}
      </EntityAdminShell>

      {!isSeoTab ? (
        <div className="flex flex-wrap gap-3 pt-4 border-t lg:hidden">
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
          {post?.id ? <PostActions post={post} onPublishNow={handlePublish} /> : null}
        </div>
      ) : null}
    </form>
  );
}
