import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { seoService } from "@/features/seo/seo.service";
import { CatalogListingIndexPageClient } from "@/features/products/components/catalog-listing-index-page-client";
import { agentLog, agentLogError } from "@/lib/debug/agent-log";

/** Avoid stale ISR shells — listing data is loaded client-side via /api/catalog/listing-shell. */
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  agentLog({
    location: "collections/page.tsx:generateMetadata",
    message: "start",
    hypothesisId: "H6",
    data: { locale },
  });
  try {
    const meta = await seoService.resolveMetadata({
      locale: locale as Locale,
      path: "collections",
      pageKey: "collections",
      fallback: {
        title: "Collections",
        description: "Browse our product collections.",
      },
    });
    agentLog({
      location: "collections/page.tsx:generateMetadata",
      message: "success",
      hypothesisId: "H6",
      data: { locale },
    });
    return meta;
  } catch (error) {
    agentLogError("collections/page.tsx:generateMetadata", error, "H6", { locale });
    return { title: "Collections", description: "Browse our product collections." };
  }
}

export default async function CollectionsIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  agentLog({
    location: "collections/page.tsx:CollectionsIndexPage",
    message: "render client shell",
    hypothesisId: "H10",
    data: { locale },
  });

  return <CatalogListingIndexPageClient locale={locale} pageSlug="collections" />;
}
