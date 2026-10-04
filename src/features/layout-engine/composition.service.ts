import type { Prisma } from "@prisma/client";
import {
  isPageAstDocument,
  PAGE_AST_VERSION,
  wrapCompositionAsPageAst,
  type PageAstDocument,
} from "@/features/cms/page-ast";
import { layoutRegistry } from "@/features/layout-engine/layout-registry";
import {
  COLUMN_REGION_ORDER,
  createEmptyRegionRecord,
  DEFAULT_REGION_ORDER,
  isRegionId,
  type ColumnRatioToken,
  type Composition,
  type LayoutSettings,
  type LayoutType,
  type RegionId,
  type StickyScrollMode,
  type TopSectionWidth,
} from "@/features/layout-engine/types";
import type { PageBlocks } from "@/types/builder";

const DEFAULT_FULL_LAYOUT: LayoutSettings = {
  type: "full",
  spacing: {
    gap: "md",
    padding: "md",
    maxWidth: "page",
    container: "boxed",
  },
  verticalAlign: "stretch",
  topSection: { enabled: false, width: "boxed" },
  stickyScroll: "document",
  regions: {
    primary: { ratio: "equal", sticky: false },
  },
  responsive: {
    tablet: {
      stackOrder: ["primary"],
      regionVisibility: { primary: true },
    },
    mobile: {
      stackOrder: ["primary"],
      regionVisibility: { primary: true },
    },
  },
};

function asBlocks(value: unknown): PageBlocks {
  return Array.isArray(value) ? (value as PageBlocks) : [];
}

function isRatio(value: unknown): value is ColumnRatioToken {
  return [
    "equal",
    "20-80",
    "25-75",
    "30-70",
    "80-20",
    "75-25",
    "70-30",
    "20-60-20",
    "25-50-25",
    "20-50-30",
    "golden",
    "custom",
  ].includes(String(value));
}

function coerceTopSection(raw: unknown): LayoutSettings["topSection"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { enabled: false, width: "boxed" };
  }
  const input = raw as Record<string, unknown>;
  const width = input.width === "full" || input.width === "boxed" ? input.width : "boxed";
  return {
    enabled: input.enabled === true,
    width: width as TopSectionWidth,
  };
}

function coerceStickyScroll(raw: unknown): StickyScrollMode {
  return raw === "main-only" ? "main-only" : "document";
}

function mergeRegionRecords(
  base: Record<RegionId, PageBlocks>,
  raw: unknown,
): Record<RegionId, PageBlocks> {
  const next = { ...base };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return next;
  for (const [key, value] of Object.entries(raw)) {
    if (isRegionId(key)) next[key] = asBlocks(value);
  }
  return next;
}

function coerceLayoutSettings(raw: unknown): LayoutSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_FULL_LAYOUT, regions: { ...DEFAULT_FULL_LAYOUT.regions } };
  }
  const input = raw as Record<string, unknown>;
  const type = typeof input.type === "string" ? (input.type as LayoutType) : "full";
  const definition = layoutRegistry.get(type) ?? layoutRegistry.getOrThrow("full");
  const responsiveInput =
    input.responsive && typeof input.responsive === "object" && !Array.isArray(input.responsive)
      ? (input.responsive as Record<string, unknown>)
      : {};

  const regionsRaw =
    input.regions && typeof input.regions === "object" && !Array.isArray(input.regions)
      ? (input.regions as Record<string, unknown>)
      : {};

  const regions: LayoutSettings["regions"] = {};
  for (const regionId of COLUMN_REGION_ORDER) {
    const rawRegion = regionsRaw[regionId];
    if (!rawRegion || typeof rawRegion !== "object" || Array.isArray(rawRegion)) continue;
    const config = rawRegion as Record<string, unknown>;
    regions[regionId] = {
      ratio: isRatio(config.ratio) ? config.ratio : definition.defaultRatio,
      sticky: typeof config.sticky === "boolean" ? config.sticky : false,
    };
  }

  return {
    type: definition.type,
    spacing:
      input.spacing && typeof input.spacing === "object" && !Array.isArray(input.spacing)
        ? (input.spacing as LayoutSettings["spacing"])
        : { ...DEFAULT_FULL_LAYOUT.spacing },
    verticalAlign:
      input.verticalAlign === "start" ||
      input.verticalAlign === "center" ||
      input.verticalAlign === "end" ||
      input.verticalAlign === "stretch"
        ? input.verticalAlign
        : "stretch",
    topSection: coerceTopSection(input.topSection),
    stickyScroll: coerceStickyScroll(input.stickyScroll),
    regions,
    responsive:
      Object.keys(responsiveInput).length > 0
        ? (responsiveInput as LayoutSettings["responsive"])
        : definition.defaultResponsive,
  };
}

function coerceMetadata(raw: unknown): Composition["metadata"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const input = raw as Record<string, unknown>;
  const metadata: Composition["metadata"] = {};
  if (typeof input.showAuthor === "boolean") metadata.showAuthor = input.showAuthor;
  if (typeof input.showPublishedAt === "boolean") metadata.showPublishedAt = input.showPublishedAt;
  return metadata;
}

function isCompositionLike(raw: unknown): raw is Composition {
  return Boolean(raw && typeof raw === "object" && !Array.isArray(raw) && "layout" in raw && "regions" in raw);
}

class CompositionServiceImpl {
  createEmpty(): Composition {
    return {
      version: 1,
      layout: { ...DEFAULT_FULL_LAYOUT, regions: { ...DEFAULT_FULL_LAYOUT.regions } },
      regions: createEmptyRegionRecord(),
      hiddenRegions: createEmptyRegionRecord(),
      metadata: {},
    };
  }

  upgrade(raw: unknown): Composition {
    if (Array.isArray(raw)) {
      return {
        ...this.createEmpty(),
        regions: {
          ...createEmptyRegionRecord(),
          primary: asBlocks(raw),
        },
      };
    }

    if (!isCompositionLike(raw)) {
      return this.createEmpty();
    }

    const input = raw as Record<string, unknown>;
    const composition = this.createEmpty();
    composition.version = 1;
    composition.layout = coerceLayoutSettings(input.layout);
    composition.regions = mergeRegionRecords(createEmptyRegionRecord(), input.regions);
    composition.hiddenRegions = mergeRegionRecords(createEmptyRegionRecord(), input.hiddenRegions);
    composition.metadata = coerceMetadata(input.metadata);
    return composition;
  }

  validate(input: Composition): Composition {
    const next = this.createEmpty();
    const definition = layoutRegistry.get(input.layout?.type) ?? layoutRegistry.getOrThrow("full");
    next.layout = {
      ...coerceLayoutSettings(input.layout),
      type: definition.type,
    };
    next.regions = mergeRegionRecords(createEmptyRegionRecord(), input.regions);
    next.hiddenRegions = mergeRegionRecords(createEmptyRegionRecord(), input.hiddenRegions);
    next.metadata = coerceMetadata(input.metadata);
    return next;
  }

  /**
   * Normalize stored JSON (Page AST envelope, bare Composition, or legacy block array)
   * into an in-memory Composition for editors and the shared public renderer.
   */
  load(raw: { composition?: unknown; blocks?: unknown }): Composition {
    const document = this.loadDocument(raw);
    return document.composition;
  }

  /**
   * Read-time upgrade: legacy flat block arrays or unwrapped compositions become
   * a PageAstDocument envelope. Callers that only need layout use {@link load}.
   */
  loadDocument(raw: { composition?: unknown; blocks?: unknown }): PageAstDocument {
    const stored = raw.composition;
    if (isPageAstDocument(stored)) {
      const normalized = this.validate(this.upgrade(stored.composition));
      return {
        version: typeof stored.version === "number" ? stored.version : PAGE_AST_VERSION,
        composition: normalized,
        blocks: stored.blocks ?? normalized.regions.primary,
        meta: stored.meta,
      };
    }

    const source =
      stored && isCompositionLike(stored)
        ? stored
        : Array.isArray(raw.blocks)
          ? raw.blocks
          : stored;
    const normalized = this.validate(this.upgrade(source));
    return wrapCompositionAsPageAst(normalized, {
      blocks: normalized.regions.primary,
    });
  }

  save(
    composition: Composition,
    options?: { meta?: PageAstDocument["meta"] },
  ): { composition: Prisma.InputJsonValue; blocks: Prisma.InputJsonValue } {
    const normalized = this.validate(composition);
    const envelope = wrapCompositionAsPageAst(normalized, {
      blocks: normalized.regions.primary,
      meta: options?.meta,
    });
    return {
      composition: envelope as unknown as Prisma.InputJsonValue,
      blocks: normalized.regions.primary as unknown as Prisma.InputJsonValue,
    };
  }

  /** Persist an explicit Page AST document (normalized composition inside). */
  saveDocument(
    document: PageAstDocument,
  ): { composition: Prisma.InputJsonValue; blocks: Prisma.InputJsonValue } {
    return this.save(document.composition, { meta: document.meta });
  }

  applyLayoutSwitch(current: Composition, fromType: LayoutType, toType: LayoutType): Composition {
    if (fromType === toType) return this.validate(current);

    const fromDefinition = layoutRegistry.getOrThrow(fromType);
    const toDefinition = layoutRegistry.getOrThrow(toType);
    const switchEntry = fromDefinition.switchMap.find((entry) => entry.to === toType);
    const base = this.validate(current);
    const next: Composition = {
      ...base,
      layout: {
        ...base.layout,
        type: toDefinition.type,
        regions: {
          ...base.layout.regions,
        },
        responsive: toDefinition.defaultResponsive ?? base.layout.responsive,
      },
      regions: {
        ...createEmptyRegionRecord(),
        top: [...base.regions.top],
      },
      hiddenRegions: {
        ...base.hiddenRegions,
        top: [...base.hiddenRegions.top],
      },
    };

    if (!switchEntry) {
      next.regions = {
        ...next.regions,
        primary: [...base.regions.primary],
      };
      return this.validate(next);
    }

    for (const regionId of COLUMN_REGION_ORDER) {
      const destination = switchEntry.regionMap[regionId];
      const sourceBlocks = base.regions[regionId];

      if (destination === "restore") {
        next.regions[regionId] = [...base.hiddenRegions[regionId]];
        next.hiddenRegions[regionId] = [];
        continue;
      }

      if (destination == null) {
        next.hiddenRegions[regionId] = [...sourceBlocks];
        continue;
      }

      next.regions[destination] = [...next.regions[destination], ...sourceBlocks];
    }

    for (const regionId of toDefinition.activeRegions) {
      if (next.regions[regionId].length === 0 && base.hiddenRegions[regionId].length > 0) {
        next.regions[regionId] = [...base.hiddenRegions[regionId]];
        next.hiddenRegions[regionId] = [];
      }
    }

    for (const regionId of COLUMN_REGION_ORDER) {
      if (!toDefinition.activeRegions.includes(regionId)) {
        next.hiddenRegions[regionId] = [...next.hiddenRegions[regionId], ...next.regions[regionId]];
        next.regions[regionId] = [];
      }
    }

    return this.validate(next);
  }
}

export const compositionService = new CompositionServiceImpl();
