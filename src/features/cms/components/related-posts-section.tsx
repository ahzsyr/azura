import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cmsRepository } from "@/repositories/cms.repository";
import {
  loadEntityTranslationsMap,
  loadPublicLocaleContext,
} from "@/features/i18n/public-locale-context";
import { getLocalizedField } from "@/lib/utils";
import { FeaturedPostImage } from "./featured-post-image";

type Props = {
  postId: string;
  locale: Locale;
};

export async function RelatedPostsSection({ postId, locale }: Props) {
  const [related, ctx, t] = await Promise.all([
    cmsRepository.getRelatedPosts(postId),
    loadPublicLocaleContext(locale),
    getTranslations({ locale, namespace: "blog" }),
  ]);
  if (!related.length) return null;

  const postTranslations = await loadEntityTranslationsMap(
    "Post",
    related.map((item) => item.id)
  );
  const fieldOpts = {
    enabledLocales: ctx.enabledLocales,
    defaultCode: ctx.defaultCode,
  };

  return (
    <section className="mt-16 pt-12 border-t">
      <h2 className="font-heading text-2xl font-bold mb-6">{t("relatedArticles")}</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {related.map((item) => {
          const itemFieldOpts = {
            ...fieldOpts,
            translations: postTranslations.get(item.id),
          };
          const itemTitle = getLocalizedField(item, "title", locale, itemFieldOpts);
          const featuredImageAlt =
            getLocalizedField(item, "featuredImageAlt", locale, itemFieldOpts) || itemTitle;
          return (
          <article key={item.id} className="group border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            <Link href={`/blog/${item.slug}`}>
              {item.featuredImage?.url && (
                <FeaturedPostImage
                  url={item.featuredImage.url}
                  alt={featuredImageAlt}
                  settings={item.featuredImageSettings}
                  sizes="400px"
                  className="rounded-none"
                />
              )}
              <div className="p-4">
                <h3 className="font-semibold group-hover:text-primary line-clamp-2">
                  {itemTitle}
                </h3>
                {item.author && (
                  <p className="text-xs text-muted-foreground mt-1">{item.author.name}</p>
                )}
              </div>
            </Link>
          </article>
          );
        })}
      </div>
    </section>
  );
}
