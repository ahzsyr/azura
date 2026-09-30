import type { Metadata } from "next";
import { ComingSoonPageClient } from "@/components/coming-soon/coming-soon-page";
import { getPublicBrandName } from "@/config/site";

export const metadata: Metadata = {
  title: "Coming Soon",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function ComingSoonPage() {
  let brandName = getPublicBrandName();
  let tagline = "";

  try {
    const { loadSiteBrandContext } = await import("@/lib/load-site-brand-context");
    const brand = await loadSiteBrandContext();
    brandName = brand.brandName?.trim() || brandName;
    tagline = brand.tagline?.trim() || "";
  } catch {
    // Pre-setup / missing schema: still render a simple coming-soon page.
  }

  return <ComingSoonPageClient brandName={brandName} tagline={tagline} />;
}
