"use client";

import { useState } from "react";
import type { Post, PostAuthor, PostCategory, PostTag, SeoMeta, EntityTranslation } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { LocaleTabPanel } from "@/features/translation/components/locale-tab-panel";
import { LocalizedSlugEditor } from "@/features/translation/components/localized-slug-editor";
import {
  BlockTranslationProvider,
  BlockTranslationsHiddenInput,
} from "@/features/builder/block-translation-context";
import { SeoMetaPanel } from "@/features/seo/components/seo-meta-panel";
import {
  upsertPost,
  publishPost,
  duplicatePost,
  deletePost,
  unpublishPost,
} from "@/features/cms/actions";
import { formatScheduledInput } from "@/features/cms/scheduling-utils";
import { BlockEditor } from "@/features/builder/components/block-editor";
import { MediaPickerField } from "@/features/media/components/media-picker-field";
import { TaxonomySelect } from "./taxonomy-select";
import { RelatedPostsSelect } from "./related-posts-select";
import { CmsStatusBadge } from "./cms-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PageBlocks } from "@/types/builder";
import { migrateLegacyCatalogBlocks } from "@/features/builder/migrate-legacy-blocks";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { GalleryBuilderOption } from "@/features/gallery/types";
import type { FaqSetBuilderOption } from "@/features/faq/types";
import type {
  TestimonialBuilderOption,
  TestimonialCollectionBuilderOption,
} from "@/features/testimonials/types";

type PostFull = Post & {
  categories: { categoryId: string }[];
  tags: { tagId: string }[];
  featuredImage?: { url: string } | null;
  seoMeta?: SeoMeta | null;
};

type PostOption = {
  id: string;
  slug: string;
  titleEn: string;
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
  locales?: PublicLocale[];
  initialTranslations?: EntityTranslation[];
  initialBlockTranslations?: EntityTranslation[];
};

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
  locales = [],
  initialTranslations = [],
  initialBlockTranslations = [],
}: Props) {
  const blocks = migrateLegacyCatalogBlocks((post?.blocks as PageBlocks) ?? []);
  const [categoryIds, setCategoryIds] = useState(post?.categories?.map((c) => c.categoryId) ?? []);
  const [tagIds, setTagIds] = useState(post?.tags?.map((t) => t.tagId) ?? []);
  const [relatedPostIds, setRelatedPostIds] = useState<string[]>(() => {
    const raw = post?.relatedPostIds;
    return Array.isArray(raw) ? (raw as string[]) : [];
  });
  const [featuredImageId, setFeaturedImageId] = useState(post?.featuredImageId ?? "");
  const [featuredImageUrl, setFeaturedImageUrl] = useState(post?.featuredImage?.url ?? "");

  return (
    <div className="space-y-6 max-w-4xl">
    <form action={upsertPost} className="space-y-6">
      {post?.id && <input type="hidden" name="id" value={post.id} />}
      <input type="hidden" name="categoryIds" value={JSON.stringify(categoryIds)} />
      <input type="hidden" name="tagIds" value={JSON.stringify(tagIds)} />
      <input type="hidden" name="relatedPostIds" value={JSON.stringify(relatedPostIds)} />

      {post && (
        <div className="flex items-center gap-2">
          <CmsStatusBadge status={post.status} scheduledAt={post.scheduledAt} />
          {post.status === "PUBLISHED" && (
            <>
              <Link href={`/en/blog/${post.slug}`} target="_blank" className="text-xs text-primary flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> EN
              </Link>
              <Link href={`/ar/blog/${post.slug}`} target="_blank" className="text-xs text-primary flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> AR
              </Link>
            </>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Slug</Label>
          <Input name="slug" defaultValue={post?.slug ?? ""} required pattern="[a-z0-9-]+" />
          <p className="text-xs text-muted-foreground mt-1">URL: /[locale]/blog/[slug]</p>
        </div>
        <div>
          <Label>Status</Label>
          <select name="status" defaultValue={post?.status ?? "DRAFT"} className="w-full border rounded-md h-10 px-3">
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="md:col-span-2 space-y-6">
          <div>
            <Label>Title EN</Label>
            <Input name="titleEn" defaultValue={post?.titleEn ?? ""} required />
          </div>
          <div>
            <Label>Title AR</Label>
            <Input name="titleAr" defaultValue={post?.titleAr ?? ""} dir="rtl" required />
          </div>
          <div>
            <Label>Excerpt EN</Label>
            <Textarea name="excerptEn" defaultValue={post?.excerptEn ?? ""} rows={2} />
          </div>
          <div>
            <Label>Excerpt AR</Label>
            <Textarea name="excerptAr" defaultValue={post?.excerptAr ?? ""} dir="rtl" rows={2} />
          </div>
          <div>
            <Label>Content EN</Label>
            <Textarea name="contentEn" defaultValue={post?.contentEn ?? ""} rows={6} />
          </div>
          <div>
            <Label>Content AR</Label>
            <Textarea name="contentAr" defaultValue={post?.contentAr ?? ""} dir="rtl" rows={6} />
          </div>
          {post?.id ? (
            <>
            <LocaleTabPanel
              entityType="Post"
              entityId={post.id}
              sourceData={{
                title: post.titleEn,
                excerpt: post.excerptEn ?? "",
                content: post.contentEn ?? "",
                seoTitle: post.seoMeta?.titleEn ?? post.titleEn,
                seoDescription: post.seoMeta?.descriptionEn ?? post.excerptEn ?? "",
              }}
            />
            <LocalizedSlugEditor
              entityType="Post"
              entityId={post.id}
              defaultSlug={post.slug}
              pathPrefix="/blog"
            />
            </>
          ) : null}
        </div>
        <div>
          <Label>Author</Label>
          <select name="authorId" defaultValue={post?.authorId ?? ""} className="w-full border rounded-md h-10 px-3">
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
          <MediaPickerField
            label="Featured image"
            idFieldName="featuredImageId"
            mediaId={featuredImageId || null}
            url={featuredImageUrl}
            onChange={({ mediaId, url }) => {
              setFeaturedImageId(mediaId ?? "");
              setFeaturedImageUrl(url);
            }}
          />
        </div>
      </div>

      <TaxonomySelect
        categories={categories}
        tags={tags}
        selectedCategoryIds={categoryIds}
        selectedTagIds={tagIds}
        onCategoriesChange={setCategoryIds}
        onTagsChange={setTagIds}
      />

      {post?.id && postPickerOptions.length > 0 && (
        <RelatedPostsSelect
          posts={postPickerOptions}
          selectedIds={relatedPostIds}
          onChange={setRelatedPostIds}
        />
      )}

      <div>
        <Label className="mb-2 block">Content blocks</Label>
        <BlockTranslationProvider
          locales={locales}
          initialRows={initialBlockTranslations}
          initialBlocks={blocks}
          parentType="Post"
          parentId={post?.id ?? "new"}
        >
          <BlockEditor
            initialBlocks={blocks}
            galleryOptions={galleryOptions}
            faqSetOptions={faqSetOptions}
            testimonialOptions={testimonialOptions}
            testimonialCollectionOptions={testimonialCollectionOptions}
          />
          <BlockTranslationsHiddenInput />
        </BlockTranslationProvider>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit">Save</Button>
        {post?.id && (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await publishPost(post.id);
                window.location.reload();
              }}
            >
              Publish now
            </Button>
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
        )}
      </div>
    </form>

    {post?.id && (
      <SeoMetaPanel
        postId={post.id}
        meta={post.seoMeta}
        defaultTitleEn={post.titleEn}
        defaultTitleAr={post.titleAr}
        defaultDescEn={post.excerptEn ?? ""}
        defaultDescAr={post.excerptAr ?? ""}
      />
    )}
    </div>
  );
}
