import type { Metadata } from "next";
import { loadSiteBrandContext } from "@/lib/load-site-brand-context";
import { ComingSoonPageClient } from "@/components/coming-soon/coming-soon-page";

export const metadata: Metadata = {
  title: "Coming Soon",
  robots: { index: false, follow: false },
};

export default async function ComingSoonPage() {
  const brand = await loadSiteBrandContext();

  return <ComingSoonPageClient brandName={brand.brandName} tagline={brand.tagline} />;
}
