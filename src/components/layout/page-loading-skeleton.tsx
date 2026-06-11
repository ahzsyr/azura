import { ROUTE_SKELETON_ATTR } from "@/lib/navigation/is-route-skeleton";

export type PageLoadingVariant =
  | "grid"
  | "detail"
  | "search"
  | "cms"
  | "compare"
  | "list"
  | "home";

type Props = {
  variant?: PageLoadingVariant;
  /** When true, omit busy attributes (parent wrapper owns a11y). */
  embedded?: boolean;
};

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`rounded bg-muted-foreground/20 motion-safe:animate-pulse ${className}`}
    />
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="card-premium overflow-hidden">
          <div className="aspect-[4/3] motion-safe:animate-pulse bg-muted-foreground/20" />
          <div className="space-y-2 p-4">
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <>
      <SkeletonBlock className="mb-6 h-8 w-48" />
      <SkeletonBlock className="mb-8 aspect-[16/9] max-w-3xl rounded-xl" />
      <div className="max-w-2xl space-y-3">
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-5/6" />
        <SkeletonBlock className="h-4 w-4/6" />
        <SkeletonBlock className="h-4 w-full" />
      </div>
    </>
  );
}

function SearchSkeleton() {
  return (
    <>
      <SkeletonBlock className="mb-6 h-10 w-full max-w-xl rounded-lg" />
      <div className="space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-border/60 p-4">
            <SkeletonBlock className="mb-2 h-5 w-2/3" />
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="mt-2 h-3 w-4/5" />
          </div>
        ))}
      </div>
    </>
  );
}

function CmsSkeleton() {
  return (
    <>
      <SkeletonBlock className="mb-4 h-10 w-2/3 max-w-lg" />
      <SkeletonBlock className="mb-8 h-4 w-full max-w-2xl" />
      <div className="max-w-3xl space-y-6">
        <SkeletonBlock className="h-32 w-full rounded-xl" />
        <div className="space-y-3">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-11/12" />
          <SkeletonBlock className="h-4 w-10/12" />
        </div>
        <SkeletonBlock className="h-24 w-full rounded-xl" />
      </div>
    </>
  );
}

function CompareSkeleton() {
  return (
    <>
      <SkeletonBlock className="mb-6 h-8 w-56" />
      <div className="overflow-hidden rounded-xl border border-border/60">
        <div className="grid grid-cols-3 gap-px bg-border/40 p-px">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonBlock key={i} className="h-10 rounded-none" />
          ))}
        </div>
      </div>
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <SkeletonBlock key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

function HomeSkeleton() {
  return (
    <>
      <SkeletonBlock className="mb-8 aspect-[21/9] w-full rounded-2xl" />
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <SkeletonBlock key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <GridSkeleton />
    </>
  );
}

export function PageLoadingSkeleton({ variant = "grid", embedded = false }: Props) {
  return (
    <div
      className="cl-page min-h-[50vh] py-8"
      {...{ [ROUTE_SKELETON_ATTR]: true }}
      {...(!embedded
        ? { "aria-busy": true as const, "aria-label": "Loading" as const }
        : {})}
    >
      {variant === "detail" && <DetailSkeleton />}
      {variant === "search" && <SearchSkeleton />}
      {variant === "cms" && <CmsSkeleton />}
      {variant === "compare" && <CompareSkeleton />}
      {variant === "list" && <ListSkeleton />}
      {variant === "home" && <HomeSkeleton />}
      {variant === "grid" && (
        <>
          <SkeletonBlock className="mb-6 h-8 w-48" />
          <SkeletonBlock className="mb-8 h-4 w-full max-w-xl" />
          <GridSkeleton />
        </>
      )}
    </div>
  );
}
