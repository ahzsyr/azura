import type { BlockNode, PageBlocks } from "@/types/builder";
import {
  DEFAULT_DISPLAY_SETTINGS,
  mergeDisplaySettings,
} from "@/schemas/catalog/display-settings";

type LegacyCatalogType = "packages" | "hotels" | "services";

function isLegacyCatalogType(type: string): type is LegacyCatalogType {
  return type === "packages" || type === "hotels" || type === "services";
}

function migrateBlock(block: BlockNode): BlockNode {
  let next = block;

  if (isLegacyCatalogType(block.type)) {
    const source = block.type;
    const p = block.props;
    const displaySettings = mergeDisplaySettings(
      (p.displaySettings as Record<string, unknown>) ?? {
        limit: typeof p.limit === "number" ? p.limit : undefined,
      }
    );

    next = {
      ...block,
      type: "catalog",
      props: {
        source,
        titleEn: (p.titleEn as string) ?? "",
        titleAr: (p.titleAr as string) ?? "",
        subtitleEn: (p.subtitleEn as string) ?? "",
        subtitleAr: (p.subtitleAr as string) ?? "",
        categorySlug: (p.categorySlug as string) ?? "",
        city: source === "hotels" ? ((p.city as string) ?? "") : "",
        serviceType: source === "services" ? ((p.serviceType as string) ?? "") : "",
        featuredOnly: Boolean(p.featuredOnly),
        manualIds: (p.manualIds as string[]) ?? [],
        limit: displaySettings.limit ?? (typeof p.limit === "number" ? p.limit : 6),
        displaySettings: { ...DEFAULT_DISPLAY_SETTINGS, ...displaySettings },
        viewAllHref: (p.viewAllHref as string) ?? "",
        emptyMessageEn: (p.emptyMessageEn as string) ?? "",
        emptyMessageAr: (p.emptyMessageAr as string) ?? "",
      },
    };
  }

  if (next.children?.length) {
    return { ...next, children: next.children.map(migrateBlock) };
  }

  return next;
}

export function migrateLegacyCatalogBlocks(blocks: PageBlocks): PageBlocks {
  return blocks.map(migrateBlock);
}
