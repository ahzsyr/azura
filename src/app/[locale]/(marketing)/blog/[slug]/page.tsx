import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
import type { Locale } from "@/i18n/routing";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { cmsService } from "@/features/cms/cms.service";
import { cmsRepository } from "@/repositories/cms.repository";
import { seoService } from "@/features/seo/seo.service";
import { PageSeoJsonLd } from "@/features/seo/components/page-seo-jsonld";
import { RelatedPostsSection } from "@/features/cms/components/related-posts-section";
import { FeaturedPostImage } from "@/features/cms/components/featured-post-image";
import {
  loadEntityTranslationsMap,
  loadPageTranslations,
  loadPublicLocaleContext,
} from "@/features/i18n/public-locale-context";
import { getLocalizedField } from "@/lib/utils";
import type { PageBlocks } from "@/types/builder";
import { Link } from "@/i18n/navigation";
import { sharedElementAttrs } from "@/lib/navigation/shared-elements";
import { compositionService } from "@/features/layout-engine/composition.service";
import { hasRenderableCompositionBlocks } from "@/features/layout-engine/composition-editor-helpers";
import { LayoutRenderer } from "@/features/layout-engine/components/layout-renderer";
import { themeService } from "@/features/theme/theme.service";

export const revalidate = 60;
const FALLBACK_PREFIXES = FALLBACK_LOCALES.map((locale) => locale.urlPrefix);

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams() {
  await cmsService.processDueScheduled();
  const posts = await cmsRepository.publishedPostSlugs();
  let locales: string[] = [];
  try {
    locales = await getEnabledUrlPrefixes();
  } catch {
    locales = [...FALLBACK_PREFIXES];
  }
  if (locales.length === 0) locales = [...FALLBACK_PREFIXES];

  return locales.flatMap((locale) =>
    posts.map((p) => ({ locale, slug: p.slug }))
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const { languageCode } = await loadPublicLocaleContext(locale);
  const post = await cmsService.resolvePublishedPost(slug, languageCode);
  if (!post) return {};

  return seoService.resolveMetadata({
    locale: locale as Locale,
    postId: post.id,
    path: `/blog/${slug}`,
    ogImage: post.featuredImage?.url,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { languageCode } = await loadPublicLocaleContext(locale);
  const post = await cmsService.resolvePublishedPost(slug, languageCode);
  if (!post) notFound();

  const composition = compositionService.load({
    composition:
      "composition" in post
        ? (post as typeof post & { composition?: unknown }).composition
        : undefined,
    blocks: (post.blocks as PageBlocks) ?? [],
  });

  const [bundleResult, tBlog, theme] = await Promise.all([
    loadPageTranslations("Post", post.id, composition),
    getTranslations({ locale, namespace: "blog" }),
    themeService.getPublished().catch(() => null),
  ]);
  const { bundle, translations } = bundleResult;

  const categoryIds = post.categories.map((c) => c.category.id);
  const tagIds = post.tags.map((t) => t.tag.id);
  const [categoryTranslations, tagTranslations] = await Promise.all([
    loadEntityTranslationsMap("PostCategory", categoryIds),
    loadEntityTranslationsMap("PostTag", tagIds),
  ]);

  const fieldOpts = {
    enabledLocales: bundle.enabledLocales,
    defaultCode: bundle.defaultCode,
    translations,
  };

  const title = getLocalizedField(post, "title", locale, fieldOpts);
  const featuredImageAlt =
    getLocalizedField(post, "featuredImageAlt", locale, fieldOpts) || title;
  const featuredImageCaption = getLocalizedField(post, "featuredImageCaption", locale, fieldOpts);

  const hasRenderableBlocks = hasRenderableCompositionBlocks(composition);
  const hasFeaturedImage = Boolean(post.featuredImage?.url);
  const imageShared = sharedElementAttrs("blog", slug, "image");
  const titleShared = sharedElementAttrs("blog", slug, "title");

  return (
    <article
      className="blog-post-page section-padding container-premium max-w-4xl mx-auto"
    >
      <PageSeoJsonLd
        locale={locale as Locale}
        postId={post.id}
        path={`/blog/${slug}`}
        ogImage={post.featuredImage?.url}
      />
      {post.featuredImage?.url && (
        <FeaturedPostImage
          url={post.featuredImage.url}
          alt={featuredImageAlt}
          caption={featuredImageCaption || undefined}
          settings={post.featuredImageSettings}
          priority
          className="mb-8"
          sharedAttrs={{
            "data-shared-element": imageShared["data-shared-element"],
            "data-shared-element-type": imageShared["data-shared-element-type"],
            "data-shared-element-id": imageShared["data-shared-element-id"],
            style: imageShared.style as string | undefined,
          }}
        />
      )}
      {post.categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.categories.map(({ category }) => (
            <Link
              key={category.id}
              href={`/blog?category=${category.slug}`}
              className="text-xs rounded-full bg-primary/10 text-primary px-3 py-1"
            >
              {getLocalizedField(category, "name", locale, {
                ...fieldOpts,
                translations: categoryTranslations.get(category.id),
              })}
            </Link>
          ))}
        </div>
      )}
      <h1
        className="font-heading text-4xl font-bold mb-4"
        data-shared-element={titleShared["data-shared-element"]}
        data-shared-element-type={titleShared["data-shared-element-type"]}
        data-shared-element-id={titleShared["data-shared-element-id"]}
        style={titleShared.style}
      >
        {title}
      </h1>
      {post.author && (
        <p className="text-sm text-muted-foreground mb-8">
          {tBlog("by")} {post.author.name}
          {post.publishedAt && (
            <span className="ms-2">· {new Date(post.publishedAt).toLocaleDateString(locale)}</span>
          )}
        </p>
      )}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {post.tags.map(({ tag }) => (
            <span key={tag.id} className="text-xs border rounded-md px-2 py-0.5 text-muted-foreground">
              #
              {getLocalizedField(tag, "name", locale, {
                ...fieldOpts,
                translations: tagTranslations.get(tag.id),
              })}
            </span>
          ))}
        </div>
      )}
      {hasRenderableBlocks ? (
        <LayoutRenderer
          composition={composition}
          renderOptions={{ locale: locale as Locale }}
          parentType="Post"
          parentId={post.id}
          translationBundle={bundle}
          theme={theme}
          discoveryAnchor={{
            context: "post",
            id: post.id,
            slug: post.slug,
            categorySlugs: post.categories.map((c) => c.category.slug),
            tags: post.tags.map((t) => t.tag.slug),
          }}
          previewMode={false}
        />
      ) : null}
      <RelatedPostsSection postId={post.id} locale={locale as Locale} />
    </article>
  );
}
