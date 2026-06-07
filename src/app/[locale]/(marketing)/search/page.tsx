import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ensureSearchRuntimeConfig } from "@/features/search/settings/search-runtime";
import { toPublicSearchConfig } from "@/features/search/settings/public-search-config";
import { SearchPageView } from "@/features/search/components/search-page-view";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata() {
  return { title: "Search" };
}

export default async function SearchPage({ params }: Props) {
  const { locale } = await params;
  const admin = await ensureSearchRuntimeConfig(locale);
  if (!admin.general.enabled || !admin.general.searchPageEnabled) {
    notFound();
  }

  const config = toPublicSearchConfig(admin);

  return (
    <Suspense
      fallback={
        <div className="relative min-h-[40vh] px-4 py-16 sm:px-6">
          <div className="sm-search-page-hero" aria-hidden />
          <div className="relative z-10 mx-auto max-w-3xl space-y-4">
            <div className="sm-search-shimmer h-8 w-48 rounded-lg" />
            <div className="sm-search-shimmer h-12 w-full rounded-full" />
          </div>
        </div>
      }
    >
      <SearchPageView config={config} />
    </Suspense>
  );
}
