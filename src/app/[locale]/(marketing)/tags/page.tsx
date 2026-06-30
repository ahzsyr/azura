import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { getDirectionByPrefix, getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
import { seoService } from "@/features/seo/seo.service";
import { CatalogListingPageShell } from "@/features/catalog/components/catalog-listing-page-shell";
import { loadCatalogListingTheme } from "@/features/catalog/lib/load-catalog-theme";
import { buildProductListingCatalog } from "@/features/products/listing/catalog";
import { loadBrandAndTagEntries } from "@/features/catalog/brand-tag-pages.service";

export const revalidate = 60;
export const maxDuration = 60;

const FALLBACK_PREFIXES = FALLBACK_LOCALES.map((locale) => locale.urlPrefix);

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateStaticParams() {
  try {
    const locales = await getEnabledUrlPrefixes();
    if (locales.length > 0) return locales.map((locale) => ({ locale }));
  } catch {
    /* DB unavailable at build */
  }
  return FALLBACK_PREFIXES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  try {
    return await seoService.resolveMetadata({
      locale: locale as Locale,
      path: "tags",
      pageKey: "tags",
      fallback: {
        title: "Tags",
        description: "Browse product tags and discover matching items.",
      },
    });
  } catch {
    return { title: "Tags", description: "Browse product tags and discover matching items." };
  }
}

export default async function TagsIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [theme, pageDir, listing] = await Promise.all([
    loadCatalogListingTheme(locale, "products"),
    getDirectionByPrefix(locale),
    buildProductListingCatalog(locale),
  ]);
  const { tags } = await loadBrandAndTagEntries(locale, listing.records);

  return (
    <CatalogListingPageShell
      title="Tags"
      subtitle="Browse tags used across the product catalog."
      hero={theme.hero}
      headingTextEffect={theme.headingTextEffect}
      dir={pageDir}
    >
      <section className="section-padding container-premium">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link
              key={tag.slug}
              href={`/${locale}/tags/${tag.slug}`}
              className="rounded-full border px-3 py-1 text-sm transition hover:border-primary/50 hover:text-primary"
            >
              {tag.name}
              <span className="ms-2 text-xs text-muted-foreground">
                {tag.productCount}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </CatalogListingPageShell>
  );
}
