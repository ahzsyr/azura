import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { getEnabledUrlPrefixes, getDirectionByPrefix } from "@/i18n/locale-registry.server";
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
      path: "brands",
      pageKey: "brands",
      fallback: {
        title: "Brands",
        description: "Browse brands and explore their products.",
      },
    });
  } catch {
    return { title: "Brands", description: "Browse brands and explore their products." };
  }
}

export default async function BrandsIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [theme, pageDir, listing] = await Promise.all([
    loadCatalogListingTheme(locale, "products"),
    getDirectionByPrefix(locale),
    buildProductListingCatalog(locale),
  ]);
  const { brands } = await loadBrandAndTagEntries(locale, listing.records);

  return (
    <CatalogListingPageShell
      title="Brands"
      subtitle="Explore all brands and jump to their product catalogs."
      hero={theme.hero}
      headingTextEffect={theme.headingTextEffect}
      dir={pageDir}
    >
      <section className="section-padding container-premium">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/${locale}/brands/${brand.slug}`}
              className="rounded-xl border bg-card/70 p-4 transition hover:border-primary/50 hover:bg-card"
            >
              <div className="mb-3 flex h-12 items-center">
                {brand.profile?.logoUrl ? (
                  <img
                    src={brand.profile.logoUrl}
                    alt={brand.name}
                    className="h-10 w-auto object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-sm font-semibold text-foreground">{brand.name}</span>
                )}
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {brand.profile?.descriptionEn?.trim() || `Explore ${brand.name} products`}
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-primary">
                {brand.productCount} product{brand.productCount === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </CatalogListingPageShell>
  );
}
