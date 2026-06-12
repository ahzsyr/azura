import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { cmsService } from "@/features/cms/cms.service";
import { cmsRepository } from "@/repositories/cms.repository";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";
import {
  loadEntityTranslationsMap,
  loadPublicLocaleContext,
} from "@/features/i18n/public-locale-context";
import { getLocalizedField } from "@/lib/utils";
import { sharedElementAttrs, sharedElementRootAttrs } from "@/lib/navigation/shared-elements";
import { cn } from "@/lib/utils";
import { loadSiteBrandContext } from "@/lib/load-site-brand-context";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  try {
    const [t, { brandName }] = await Promise.all([
      getTranslations({ locale, namespace: "blog" }),
      loadSiteBrandContext(),
    ]);
    return seoService.resolveMetadata({
      locale: locale as Locale,
      path: "/blog",
      pageKey: "blog",
      fallback: {
        title: t("title"),
        description: t("subtitle", { brandName }),
      },
    });
  } catch {
    return { title: "Blog", description: "Latest news and updates." };
  }
}

export default async function BlogListingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { category: categorySlug } = await searchParams;
  setRequestLocale(locale);

  let posts: Awaited<ReturnType<typeof cmsService.listPublishedPosts>> = [];
  let categories: Awaited<ReturnType<typeof cmsRepository.listCategories>> = [];
  let ctx = await loadPublicLocaleContext(locale);
  const t = await getTranslations({ locale, namespace: "blog" });

  try {
    [posts, categories, ctx] = await Promise.all([
      cmsService.listPublishedPosts(categorySlug),
      cmsRepository.listCategories(),
      loadPublicLocaleContext(locale),
    ]);
  } catch (error) {
    console.error("[blog] listing load failed:", error);
    ctx = await loadPublicLocaleContext(locale).catch(() => ({
      urlPrefix: locale,
      languageCode: "en",
      enabledLocales: [],
      defaultCode: "en",
    }));
  }

  const categoryIds = categories.map((cat) => cat.id);
  const categoryTranslations = await loadEntityTranslationsMap("PostCategory", categoryIds);
  const fieldOpts = {
    enabledLocales: ctx.enabledLocales,
    defaultCode: ctx.defaultCode,
  };

  return (
    <div className="section-padding container-premium">
      <h1 className="font-heading text-4xl font-bold mb-4">{t("title")}</h1>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/blog"
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              !categorySlug ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
            )}
          >
            {t("all")}
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/blog?category=${cat.slug}`}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                categorySlug === cat.slug
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              )}
            >
              {getLocalizedField(cat, "name", locale, {
                ...fieldOpts,
                translations: categoryTranslations.get(cat.id),
              })}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => {
          const imageShared = sharedElementAttrs("blog", post.slug, "image");
          const titleShared = sharedElementAttrs("blog", post.slug, "title");
          return (
          <article
            key={post.id}
            className="group border rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
            {...sharedElementRootAttrs("blog", post.slug)}
          >
            <Link href={`/blog/${post.slug}`}>
              {post.featuredImage?.url && (
                <div
                  className="relative aspect-video"
                  data-shared-element={imageShared["data-shared-element"]}
                  data-shared-element-type={imageShared["data-shared-element-type"]}
                  data-shared-element-id={imageShared["data-shared-element-id"]}
                  style={imageShared.style}
                >
                  <Image src={post.featuredImage.url} alt="" fill className="object-cover" sizes="400px" />
                </div>
              )}
              <div className="p-6">
                {post.categories.length > 0 && (
                  <p className="text-xs text-primary mb-2">
                    {post.categories
                      .map((c) =>
                        getLocalizedField(c.category, "name", locale, {
                          ...fieldOpts,
                          translations: categoryTranslations.get(c.category.id),
                        })
                      )
                      .join(" · ")}
                  </p>
                )}
                <h2
                  className="font-heading text-xl font-bold group-hover:text-primary"
                  data-shared-element={titleShared["data-shared-element"]}
                  data-shared-element-type={titleShared["data-shared-element-type"]}
                  data-shared-element-id={titleShared["data-shared-element-id"]}
                  style={titleShared.style}
                >
                  {getLocalizedField(post, "title", locale, fieldOpts)}
                </h2>
                <p className="mt-2 text-muted-foreground line-clamp-2">
                  {getLocalizedField(post, "excerpt", locale, fieldOpts)}
                </p>
                {post.author && (
                  <p className="mt-3 text-xs text-muted-foreground">{post.author.name}</p>
                )}
              </div>
            </Link>
          </article>
          );
        })}
      </div>
      {posts.length === 0 && (
        <p className="text-muted-foreground text-center py-12">{t("noPosts")}</p>
      )}
    </div>
  );
}
