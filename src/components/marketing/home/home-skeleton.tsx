export function HomeSectionsSkeleton() {
  return (
    <div className="space-y-16 animate-pulse" aria-hidden>
      <div className="container-premium py-16">
        <div className="h-8 w-48 bg-muted rounded mx-auto mb-8" />
        <div className="grid gap-8 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border overflow-hidden">
              <div className="aspect-[4/3] bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-muted/40 py-16">
        <div className="container-premium grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
