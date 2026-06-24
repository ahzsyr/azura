import { PageLoadingSkeleton, type PageLoadingVariant } from "@/components/layout/page-loading-skeleton";
import { ROUTE_PARTIAL_FALLBACK_ATTR } from "@/lib/navigation/is-partial-route-content";

type Props = {
  variant?: PageLoadingVariant;
  className?: string;
};

/** Suspense fallback that blocks route commit until async islands finish loading. */
export function RouteSuspenseFallback({ variant = "grid", className }: Props) {
  return (
    <div
      {...{ [ROUTE_PARTIAL_FALLBACK_ATTR]: true }}
      className={className}
      aria-busy="true"
      aria-label="Loading"
    >
      <PageLoadingSkeleton variant={variant} embedded />
    </div>
  );
}
