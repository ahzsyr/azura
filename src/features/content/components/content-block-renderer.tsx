import Link from "next/link";
import { ContentCard } from "@/components/content/content-card";
import type { ContentBlockRenderProps } from "@/features/content/types";
import { cn } from "@/lib/utils";

export function ContentBlockRenderer({
  locale,
  title,
  subtitle,
  items,
  displaySettings,
  viewAllHref,
  emptyMessage,
  compare,
}: ContentBlockRenderProps) {
  const columns = displaySettings.columns;
  const gridClass =
    displaySettings.layoutMode === "list"
      ? "grid gap-4 grid-cols-1"
      : cn(
          "grid gap-6",
          columns === 2 && "md:grid-cols-2",
          columns === 3 && "md:grid-cols-2 lg:grid-cols-3",
          columns === 4 && "md:grid-cols-2 lg:grid-cols-4"
        );

  return (
    <div>
      {(title || subtitle) && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            {title ? <h2 className="text-2xl font-bold tracking-tight">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-muted-foreground">{subtitle}</p> : null}
          </div>
          {displaySettings.showViewAllLink && viewAllHref ? (
            <Link href={viewAllHref} className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          ) : null}
        </div>
      )}

      {items.length === 0 ? (
        emptyMessage ? <p className="text-muted-foreground text-center py-8">{emptyMessage}</p> : null
      ) : (
        <div className={gridClass}>
          {items.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              locale={locale}
              display={displaySettings}
              compare={compare}
            />
          ))}
        </div>
      )}
    </div>
  );
}
