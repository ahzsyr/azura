import {
  PageLoadingSkeleton,
  type PageLoadingVariant,
} from "@/components/layout/page-loading-skeleton";

export function createRouteLoading(variant: PageLoadingVariant = "grid") {
  return function RouteLoading() {
    return <PageLoadingSkeleton variant={variant} />;
  };
}
