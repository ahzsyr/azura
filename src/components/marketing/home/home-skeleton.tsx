export function HomeSectionsSkeleton() {
  const skeletonSurface = "bg-muted-foreground/20";

  return (
    <div className="space-y-16 animate-pulse" aria-hidden>
      <div className="container-premium py-16">
        <div className={`h-8 w-48 rounded mx-auto mb-8 ${skeletonSurface}`} />
        <div className="grid gap-8 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border overflow-hidden">
              <div className={`aspect-[4/3] ${skeletonSurface}`} />
              <div className="p-4 space-y-2">
                <div className={`h-5 rounded w-3/4 ${skeletonSurface}`} />
                <div className={`h-4 rounded w-1/2 ${skeletonSurface}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-muted-foreground/10 py-16">
        <div className="container-premium grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-32 rounded-xl ${skeletonSurface}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
