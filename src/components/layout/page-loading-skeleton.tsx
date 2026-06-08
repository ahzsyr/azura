type Props = {
  variant?: "grid" | "detail";
};

export function PageLoadingSkeleton({ variant = "grid" }: Props) {
  if (variant === "detail") {
    return (
      <div className="cl-page min-h-[50vh] py-8" aria-busy="true" aria-label="Loading">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mb-8 aspect-[16/9] max-w-3xl animate-pulse rounded-xl bg-muted" />
        <div className="max-w-2xl space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="cl-page min-h-[50vh] py-8" aria-busy="true" aria-label="Loading">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="mb-8 h-4 w-full max-w-xl animate-pulse rounded bg-muted" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card-premium overflow-hidden">
            <div className="aspect-[4/3] animate-pulse bg-muted" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
