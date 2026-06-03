import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { cmsService } from "@/features/cms/cms.service";
import { cmsRepository } from "@/repositories/cms.repository";
import { seoService } from "@/features/seo/seo.service";
import { PageSeoJsonLd } from "@/features/seo/components/page-seo-jsonld";
import { BlockRenderer } from "@/features/builder/components/block-renderer";
import { RelatedPostsSection } from "@/features/cms/components/related-posts-section";
import {
  loadEntityTranslationsMap,
  loadPageTranslations,
  loadPublicLocaleContext,
} from "@/features/i18n/public-locale-context";
import { getLocalizedField } from "@/lib/utils";
import type { PageBlocks } from "@/types/builder";
import { Link } from "@/i18n/navigation";

export const revalidate = 60;

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams() {
  await cmsService.processDueScheduled();
  const posts = await cmsRepository.publishedPostSlugs();
  let locales: string[] = [];
  try {
    locales = await getEnabledUrlPrefixes();
  } catch {
    locales = [...routing.locales];
  }
  if (locales.length === 0) locales = [...routing.locales];

  return locales.flatMap((locale) =>
    posts.map((p) => ({ locale, slug: p.slug }))
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const { languageCode } = await loadPublicLocaleContext(locale);
  const post = await cmsService.resolvePublishedPost(slug, languageCode);
  if (!post) return {};

  const { bundle, translations } = await loadPageTranslations(
    "Post",
    post.id,
    (post.blocks as PageBlocks) ?? []
  );
  const fieldOpts = {
    enabledLocales: bundle.enabledLocales,
    defaultCode: bundle.defaultCode,
    translations,
  };

  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: `/blog/${slug}`,
    entityType: "POST",
    entityId: post.id,
    seoMeta: post.seoMeta,
    fallback: {
      title: getLocalizedField(post, "title", locale, fieldOpts),
      description: getLocalizedField(post, "excerpt", locale, fieldOpts) || "",
    },
    ogImage: post.featuredImage?.url,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { languageCode } = await loadPublicLocaleContext(locale);
  const post = await cmsService.resolvePublishedPost(slug, languageCode);
  if (!post) notFound();

  const [bundleResult, tBlog, ctx] = await Promise.all([
    loadPageTranslations("Post", post.id, (post.blocks as PageBlocks) ?? []),
    getTranslations({ locale, namespace: "blog" }),
    loadPublicLocaleContext(locale),
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
  const excerpt = getLocalizedField(post, "excerpt", locale, fieldOpts);
  const content = getLocalizedField(post, "content", locale, fieldOpts);

  const blocks = (post.blocks as PageBlocks) ?? [];
  const hasBlocks = blocks.length > 0;

  return (
    <article className="section-padding container-premium max-w-4xl mx-auto">
      <PageSeoJsonLd
        locale={locale as Locale}
        path={`/blog/${slug}`}
        entityType="POST"
        entityId={post.id}
        seoMeta={post.seoMeta}
        fallback={{ title, description: excerpt }}
        ogImage={post.featuredImage?.url}
      />
      {post.featuredImage?.url && (
        <div className="relative aspect-video rounded-xl overflow-hidden mb-8">
          <Image src={post.featuredImage.url} alt="" fill className="object-cover" priority sizes="900px" />
        </div>
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
      <h1 className="font-heading text-4xl font-bold mb-4">{title}</h1>
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
      {hasBlocks ? (
        <BlockRenderer
          blocks={blocks}
          locale={locale as Locale}
          parentType="Post"
          parentId={post.id}
          translationBundle={bundle}
        />
      ) : (
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
      )}
      <RelatedPostsSection postId={post.id} locale={locale as Locale} />
    </article>
  );
}
