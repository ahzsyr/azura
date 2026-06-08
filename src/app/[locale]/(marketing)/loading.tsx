import { PageLoadingSkeleton } from "@/components/layout/page-loading-skeleton";

/** Default fallback for marketing routes without a segment-specific loading.tsx */
export default function MarketingLoading() {
  return <PageLoadingSkeleton variant="cms" />;
}
