import Link from "next/link";
import type { ContentBlockRenderProps } from "@/features/content/types";
import type { DeviceBreakpoint, ResolvedContentOverflow } from "@/types/block-system";
import { ContentItemsOverflowLayout } from "@/features/content/components/content-items-overflow-layout";
import { resolveContentOverflowCssFlags } from "@/features/builder/styles/content-overflow-resolver";
import type { BlockNode } from "@/types/builder";

export function ContentBlockRenderer({
  locale,
  title,
  subtitle,
  items,
  viewModels,
  displaySettings,
  viewAllHref,
  emptyMessage,
  compare,
  overflowFlags,
  previewDevice,
  block,
}: ContentBlockRenderProps & {
  overflowFlags?: Record<DeviceBreakpoint, ResolvedContentOverflow>;
  previewDevice?: DeviceBreakpoint;
  block?: BlockNode;
}) {
  const flags =
    overflowFlags ??
    (block
      ? resolveContentOverflowCssFlags(block)
      : resolveContentOverflowCssFlags({
          id: "content-fallback",
          type: "contentList",
          props: { displaySettings },
        }));

  const hasContent = (viewModels?.length ?? 0) > 0 || (items?.length ?? 0) > 0;

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

      {!hasContent ? (
        emptyMessage ? <p className="text-muted-foreground text-center py-8">{emptyMessage}</p> : null
      ) : (
        <ContentItemsOverflowLayout
          items={items}
          viewModels={viewModels}
          locale={locale}
          displaySettings={displaySettings}
          flags={flags}
          compare={compare}
          previewDevice={previewDevice}
        />
      )}
    </div>
  );
}
