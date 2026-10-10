import type { HtmlElement } from "@/features/builder/blocks/content/custom-html/types";
import { serializeElementsToHtml } from "@/features/builder/blocks/content/custom-html/serialize";
import { getLocalizedField } from "@/lib/utils";

export const IMAGE_MEDIA_POSITIONS = [
  "top",
  "bottom",
  "left",
  "right",
  "overlay",
  "background",
] as const;
export type ImageMediaPosition = (typeof IMAGE_MEDIA_POSITIONS)[number];

export const IMAGE_MOBILE_LAYOUTS = ["stack", "reverse", "side-by-side"] as const;
export type ImageMobileLayout = (typeof IMAGE_MOBILE_LAYOUTS)[number];

export const IMAGE_MEDIA_WIDTHS = ["1/3", "2/5", "1/2", "3/5", "2/3"] as const;
export type ImageMediaWidth = (typeof IMAGE_MEDIA_WIDTHS)[number];

export const IMAGE_CONTENT_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;
export type ImageContentPosition = (typeof IMAGE_CONTENT_POSITIONS)[number];

export const IMAGE_MEDIA_GAPS = ["none", "sm", "md", "lg", "xl"] as const;
export type ImageMediaGap = (typeof IMAGE_MEDIA_GAPS)[number];

export const IMAGE_CONTENT_TYPES = ["structured", "richText", "html"] as const;
export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

export const IMAGE_PANEL_VARIANTS = ["none", "surface", "glass", "dark", "light"] as const;
export type ImageContentPanelVariant = (typeof IMAGE_PANEL_VARIANTS)[number];

export const IMAGE_MEDIA_ASPECT_RATIOS = [
  "auto",
  "21/9",
  "2/1",
  "16/9",
  "3/2",
  "5/4",
  "4/3",
  "1/1",
  "4/5",
  "3/4",
  "2/3",
  "9/16",
  "1/2",
  "custom",
] as const;
export type ImageMediaAspectRatio = (typeof IMAGE_MEDIA_ASPECT_RATIOS)[number];

export const IMAGE_ASPECT_RATIO_LABELS: Record<ImageMediaAspectRatio, string> = {
  auto: "Auto",
  "21/9": "21:9",
  "2/1": "2:1",
  "16/9": "16:9",
  "3/2": "3:2",
  "5/4": "5:4",
  "4/3": "4:3",
  "1/1": "1:1",
  "4/5": "4:5",
  "3/4": "3:4",
  "2/3": "2:3",
  "9/16": "9:16",
  "1/2": "1:2",
  custom: "Custom",
};

const PRESET_ASPECT_PARTS: Record<
  Exclude<ImageMediaAspectRatio, "auto" | "custom">,
  { width: number; height: number }
> = {
  "21/9": { width: 21, height: 9 },
  "2/1": { width: 2, height: 1 },
  "16/9": { width: 16, height: 9 },
  "3/2": { width: 3, height: 2 },
  "5/4": { width: 5, height: 4 },
  "4/3": { width: 4, height: 3 },
  "1/1": { width: 1, height: 1 },
  "4/5": { width: 4, height: 5 },
  "3/4": { width: 3, height: 4 },
  "2/3": { width: 2, height: 3 },
  "9/16": { width: 9, height: 16 },
  "1/2": { width: 1, height: 2 },
};

export const IMAGE_MEDIA_SIZES = ["auto", "sm", "md", "lg", "xl", "full", "custom"] as const;
export type ImageMediaSize = (typeof IMAGE_MEDIA_SIZES)[number];

export const IMAGE_MEDIA_OBJECT_FITS = ["cover", "contain"] as const;
export type ImageMediaObjectFit = (typeof IMAGE_MEDIA_OBJECT_FITS)[number];

export const IMAGE_MEDIA_DIMENSION_UNITS = ["px", "rem", "%", "vw", "vh", "auto"] as const;
export type ImageMediaDimensionUnit = (typeof IMAGE_MEDIA_DIMENSION_UNITS)[number];

export type ImageStructuredCopy = {
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  alt: string;
  align: "center" | "start";
  descriptionAlign: "left" | "center" | "right" | "justify";
  badgeSize: string;
  titleSize: string;
  subtitleSize: string;
  descriptionSize: string;
};

export type ImageBlockHeader = {
  enabled: boolean;
  visible: boolean;
  badge: string;
  title: string;
  subtitle: string;
  align: "center" | "start";
  badgeSize: string;
  titleSize: string;
  subtitleSize: string;
};

export type ImageBlockModel = {
  media: {
    url: string;
    alt: string;
    mediaAssetId: string;
    aspectRatio: ImageMediaAspectRatio;
    customAspectWidth: number;
    customAspectHeight: number;
    size: ImageMediaSize;
    objectFit: ImageMediaObjectFit;
    width: number | null;
    height: number | null;
    widthUnit: ImageMediaDimensionUnit;
    heightUnit: ImageMediaDimensionUnit;
    widthAuto: boolean;
    heightAuto: boolean;
  };
  content: {
    type: ImageContentType;
    hasContent: boolean;
    /** Body content excluding block header fields when header owns them. */
    hasBodyContent: boolean;
    structured: ImageStructuredCopy;
    richHtml: string;
    richContent: string;
    htmlElements: HtmlElement[];
  };
  header: ImageBlockHeader;
  layout: {
    mediaPosition: ImageMediaPosition;
    mobileLayout: ImageMobileLayout;
    mediaWidth: ImageMediaWidth;
    contentPosition: ImageContentPosition;
    mediaGap: ImageMediaGap;
  };
  panel: {
    enabled: boolean;
    variant: ImageContentPanelVariant;
  };
  isMediaOnly: boolean;
  isContentOnly: boolean;
  isHugMode: boolean;
  /** Outer block should omit Style height/minHeight (except background + content). */
  omitHeights: boolean;
};

export type NormalizeImageBlockOptions = {
  locale?: string;
  /** Localized structured field resolver (EntityTranslation-aware). */
  loc?: (field: string) => string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function parsePixelValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    const parsed = Number(trimmed.replace(/px|rem|%|vw|vh$/i, ""));
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

function parseDimensionUnit(value: unknown, fallback: ImageMediaDimensionUnit): ImageMediaDimensionUnit {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (normalized === "px" || normalized === "rem" || normalized === "%" || normalized === "vw" || normalized === "vh" || normalized === "auto") {
      return normalized as ImageMediaDimensionUnit;
    }
    if (normalized === "pc") return "%";
  }
  return fallback;
}

function parseAspectPart(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) return fallback;
  return parsed;
}

/** Width/height parts for a preset or custom ratio. `null` when the frame should stay auto. */
export function aspectRatioParts(
  aspectRatio: ImageMediaAspectRatio,
  customWidth?: number | null,
  customHeight?: number | null,
): { width: number; height: number } | null {
  if (aspectRatio === "auto") return null;
  if (aspectRatio === "custom") {
    return {
      width: parseAspectPart(customWidth, 16),
      height: parseAspectPart(customHeight, 9),
    };
  }
  return PRESET_ASPECT_PARTS[aspectRatio];
}

/** CSS `aspect-ratio` value (`16 / 9`). Undefined for auto. */
export function mediaAspectCss(
  aspectRatio: ImageMediaAspectRatio,
  customWidth?: number | null,
  customHeight?: number | null,
): string | undefined {
  const parts = aspectRatioParts(aspectRatio, customWidth, customHeight);
  if (!parts) return undefined;
  return `${parts.width} / ${parts.height}`;
}

export function mediaAspectFrame(
  aspectRatio: ImageMediaAspectRatio,
  customWidth?: number | null,
  customHeight?: number | null,
): { className: string; style?: { aspectRatio: string } } {
  const css = mediaAspectCss(aspectRatio, customWidth, customHeight);
  if (!css || aspectRatio === "auto") return { className: "" };
  if (aspectRatio === "custom") return { className: "", style: { aspectRatio: css } };
  return {
    className: MEDIA_ASPECT_CLASS[aspectRatio] ?? "",
    style: { aspectRatio: css },
  };
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

function isEmptyTipTapDoc(json: string): boolean {
  const trimmed = json.trim();
  if (!trimmed) return true;
  try {
    const doc = JSON.parse(trimmed) as {
      type?: string;
      content?: Array<{ type?: string; content?: unknown[]; text?: string }>;
    };
    if (!doc || doc.type !== "doc") return !stripHtmlTags(trimmed);
    if (!Array.isArray(doc.content) || doc.content.length === 0) return true;
    const text = JSON.stringify(doc.content);
    // Empty paragraph docs look like [{"type":"paragraph"}] with no text nodes
    return !/"text"\s*:/.test(text) && !/"src"\s*:/.test(text);
  } catch {
    return !stripHtmlTags(trimmed);
  }
}

function hasRichTextContent(richHtml: string, richContent: string): boolean {
  if (isNonEmpty(stripHtmlTags(richHtml))) return true;
  return !isEmptyTipTapDoc(richContent);
}

function hasHtmlElementsContent(elements: HtmlElement[], locale: string): boolean {
  if (!Array.isArray(elements) || elements.length === 0) return false;
  const visible = elements.filter((el) => !el.hidden);
  if (visible.length === 0) return false;
  return isNonEmpty(stripHtmlTags(serializeElementsToHtml(visible, locale)));
}

function resolveHtmlElements(raw: unknown): HtmlElement[] {
  return Array.isArray(raw) ? (raw as HtmlElement[]) : [];
}

function resolveStructuredAlign(align: unknown): "center" | "start" {
  return align === "left" || align === "start" ? "start" : "center";
}

function resolveDescriptionAlign(align: unknown): "left" | "center" | "right" | "justify" {
  if (align === "right") return "right";
  if (align === "justify") return "justify";
  if (align === "left" || align === "start") return "left";
  return "center";
}

export function resolveCustomDimensionStyle({
  width,
  height,
  widthUnit,
  heightUnit,
  widthAuto,
  heightAuto,
  aspectRatio,
  customAspectWidth,
  customAspectHeight,
}: {
  width: number | null;
  height: number | null;
  widthUnit: ImageMediaDimensionUnit;
  heightUnit: ImageMediaDimensionUnit;
  widthAuto: boolean;
  heightAuto: boolean;
  aspectRatio: ImageMediaAspectRatio;
  customAspectWidth?: number | null;
  customAspectHeight?: number | null;
}): { width?: string; height?: string } {
  const ratio = aspectRatioParts(aspectRatio, customAspectWidth, customAspectHeight);
  const explicitWidth = typeof width === "number" && Number.isFinite(width) && width > 0 && !widthAuto;
  const explicitHeight = typeof height === "number" && Number.isFinite(height) && height > 0 && !heightAuto;

  let computedWidth = width;
  let computedHeight = height;

  if (ratio && aspectRatio !== "auto") {
    if (explicitWidth && heightAuto) {
      computedHeight = (width! * ratio.height) / ratio.width;
    }
    if (explicitHeight && widthAuto) {
      computedWidth = (height! * ratio.width) / ratio.height;
    }
  }

  const formatValue = (value: number | null | undefined, unit: ImageMediaDimensionUnit): string | undefined => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
    if (unit === "auto") return "auto";
    return `${value}${unit}`;
  };

  const syncUnit = widthUnit === heightUnit ? widthUnit : widthAuto ? widthUnit : heightUnit;
  const nextWidth = explicitWidth || (widthAuto && explicitHeight)
    ? formatValue(computedWidth ?? width, syncUnit)
    : undefined;
  const nextHeight = explicitHeight || (heightAuto && explicitWidth)
    ? formatValue(computedHeight ?? height, syncUnit)
    : undefined;

  return {
    width: nextWidth,
    height: nextHeight,
  };
}

/**
 * Normalize flat image block settings into a render model.
 * Applies defaults for missing/invalid values and detects media/content/hug state.
 */
export function normalizeImageBlockSettings(
  raw: Record<string, unknown>,
  options: NormalizeImageBlockOptions = {},
): ImageBlockModel {
  const locale = options.locale ?? "en";
  const loc = options.loc ?? ((field: string) => getLocalizedField(raw, field, locale, {
    includeLegacySuffixFields: true,
  }));

  const mediaPosition = pickEnum(raw.mediaPosition, IMAGE_MEDIA_POSITIONS, "top");
  const mobileLayout = pickEnum(raw.mobileLayout, IMAGE_MOBILE_LAYOUTS, "stack");
  const mediaWidth = pickEnum(raw.mediaWidth, IMAGE_MEDIA_WIDTHS, "1/2");
  const contentPosition = pickEnum(raw.contentPosition, IMAGE_CONTENT_POSITIONS, "center");
  const mediaGap = pickEnum(raw.mediaGap, IMAGE_MEDIA_GAPS, "lg");
  const contentType = pickEnum(raw.contentType, IMAGE_CONTENT_TYPES, "structured");
  const panelVariant = pickEnum(raw.contentPanelVariant, IMAGE_PANEL_VARIANTS, "none");
  const panelEnabled = raw.contentPanelEnabled === true;
  const mediaAspectRatio = pickEnum(raw.mediaAspectRatio, IMAGE_MEDIA_ASPECT_RATIOS, "auto");
  const customAspectWidth = parseAspectPart(raw.mediaAspectCustomWidth, 16);
  const customAspectHeight = parseAspectPart(raw.mediaAspectCustomHeight, 9);
  const mediaSize = pickEnum(raw.mediaSize, IMAGE_MEDIA_SIZES, "auto");
  const mediaObjectFit = pickEnum(raw.mediaObjectFit, IMAGE_MEDIA_OBJECT_FITS, "cover");
  const widthValue = parsePixelValue(raw.mediaFrameWidth ?? raw.width ?? raw.mediaWidth);
  const heightValue = parsePixelValue(raw.mediaFrameHeight ?? raw.height ?? raw.mediaHeight);
  const widthUnit = parseDimensionUnit(raw.mediaFrameWidthUnit ?? raw.widthUnit ?? "px", "px");
  const heightUnit = parseDimensionUnit(raw.mediaFrameHeightUnit ?? raw.heightUnit ?? "px", "px");
  const widthAuto = raw.mediaFrameWidthAuto === true || raw.widthAuto === true || raw.mediaWidthAuto === true;
  const heightAuto = raw.mediaFrameHeightAuto === true || raw.heightAuto === true || raw.mediaHeightAuto === true;
  // Default true; explicit false disables the block header.
  const headerEnabled = raw.headerEnabled !== false;

  const url = asString(raw.url) || asString(raw.imageUrl);
  const mediaAssetId = asString(raw.mediaAssetId);
  const alt = loc("alt") || asString(raw.alt);

  const structured: ImageStructuredCopy = {
    badge: loc("badge") || "",
    title: loc("title") || "",
    subtitle: loc("subtitle") || "",
    description: loc("description") || "",
    alt,
    align: resolveStructuredAlign(raw.align),
    descriptionAlign: resolveDescriptionAlign(raw.descriptionAlign),
    badgeSize: asString(raw.badgeSize) || "sm",
    titleSize: asString(raw.titleSize) || "2xl",
    subtitleSize: asString(raw.subtitleSize) || "base",
    descriptionSize: asString(raw.descriptionSize) || "base",
  };

  const headerVisible =
    headerEnabled &&
    (isNonEmpty(structured.badge) || isNonEmpty(structured.title) || isNonEmpty(structured.subtitle));

  const richHtml =
    getLocalizedField(raw, "richHtml", locale, { includeLegacySuffixFields: true }) || "";
  const richContent =
    getLocalizedField(raw, "richContent", locale, { includeLegacySuffixFields: true }) || "";
  const htmlElements = resolveHtmlElements(raw.htmlElements);

  let hasBodyContent = false;
  switch (contentType) {
    case "structured":
      if (headerEnabled) {
        // Header owns badge/title/subtitle; body is description only.
        hasBodyContent = isNonEmpty(structured.description);
      } else {
        hasBodyContent =
          isNonEmpty(structured.badge) ||
          isNonEmpty(structured.title) ||
          isNonEmpty(structured.subtitle) ||
          isNonEmpty(structured.description);
      }
      break;
    case "richText":
      hasBodyContent = hasRichTextContent(richHtml, richContent);
      break;
    case "html":
      hasBodyContent = hasHtmlElementsContent(htmlElements, locale);
      break;
  }

  const hasContent = hasBodyContent || headerVisible;
  const hasMedia = isNonEmpty(url);
  const isMediaOnly = hasMedia && !hasContent;
  const isContentOnly = !hasMedia && hasContent;
  const isHugMode = isMediaOnly;
  const omitHeights = !(mediaPosition === "background" && hasContent);

  return {
    media: {
      url,
      alt,
      mediaAssetId,
      aspectRatio: mediaAspectRatio,
      customAspectWidth,
      customAspectHeight,
      size: mediaSize,
      objectFit: mediaObjectFit,
      width: widthValue,
      height: heightValue,
      widthUnit,
      heightUnit,
      widthAuto,
      heightAuto,
    },
    content: {
      type: contentType,
      hasContent,
      hasBodyContent,
      structured,
      richHtml,
      richContent,
      htmlElements,
    },
    header: {
      enabled: headerEnabled,
      visible: headerVisible,
      badge: structured.badge,
      title: structured.title,
      subtitle: structured.subtitle,
      align: structured.align,
      badgeSize: structured.badgeSize,
      titleSize: structured.titleSize,
      subtitleSize: structured.subtitleSize,
    },
    layout: {
      mediaPosition,
      mobileLayout,
      mediaWidth,
      contentPosition,
      mediaGap,
    },
    panel: {
      enabled: panelEnabled && (mediaPosition === "overlay" || mediaPosition === "background"),
      variant: panelVariant,
    },
    isMediaOnly,
    isContentOnly,
    isHugMode,
    omitHeights,
  };
}

export const MEDIA_GAP_CLASS: Record<ImageMediaGap, string> = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6 md:gap-8",
  xl: "gap-8 md:gap-12",
};

export const MEDIA_WIDTH_CLASS: Record<ImageMediaWidth, string> = {
  "1/3": "md:w-[33.333%] md:basis-[33.333%] md:grow-0 md:shrink-0",
  "2/5": "md:w-[40%] md:basis-[40%] md:grow-0 md:shrink-0",
  "1/2": "md:w-1/2 md:basis-1/2 md:grow-0 md:shrink-0",
  "3/5": "md:w-[60%] md:basis-[60%] md:grow-0 md:shrink-0",
  "2/3": "md:w-[66.666%] md:basis-[66.666%] md:grow-0 md:shrink-0",
};

/** Frame max-width for the image (top/bottom/content-only media). */
export const MEDIA_SIZE_CLASS: Record<ImageMediaSize, string> = {
  auto: "",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full",
  custom: "",
};

export const MEDIA_ASPECT_CLASS: Record<ImageMediaAspectRatio, string> = {
  auto: "",
  "21/9": "aspect-[21/9]",
  "2/1": "aspect-[2/1]",
  "16/9": "aspect-[16/9]",
  "3/2": "aspect-[3/2]",
  "5/4": "aspect-[5/4]",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "4/5": "aspect-[4/5]",
  "3/4": "aspect-[3/4]",
  "2/3": "aspect-[2/3]",
  "9/16": "aspect-[9/16]",
  "1/2": "aspect-[1/2]",
  custom: "",
};

/**
 * Overlay/background content placement.
 * Phones use a full-width flex layer so the panel is readable.
 * `md+` keeps the 3×3 grid cell.
 */
export function overlayContentLayout(position: ImageContentPosition): { frame: string; cell: string } {
  const vertical = position.startsWith("top")
    ? "max-md:justify-start"
    : position.startsWith("bottom")
      ? "max-md:justify-end"
      : "max-md:justify-center";
  const horizontal = position.endsWith("right")
    ? "max-md:items-end"
    : position.endsWith("left")
      ? "max-md:items-start"
      : "max-md:items-center";
  const place = CONTENT_POSITION_PLACE_CLASS[position];
  const desktop = place
    .split(" ")
    .filter((token) => !token.startsWith("text-"))
    .map((token) => `md:${token}`)
    .join(" ");
  const text = place
    .split(" ")
    .filter((token) => token.startsWith("text-"))
    .join(" ");

  return {
    frame: `relative z-[1] flex h-full w-full min-w-0 flex-col p-3 sm:p-4 md:grid md:grid-cols-3 md:grid-rows-3 md:gap-4 md:p-10 ${vertical} ${horizontal}`,
    cell: `w-[min(92%,32rem)] min-w-0 max-w-full max-md:max-h-full max-md:shrink-0 max-md:overflow-y-auto md:w-full md:max-w-xl ${desktop} ${text}`,
  };
}

/** Overlay/background: place content cell in a 3×3 grid. */
export const CONTENT_POSITION_PLACE_CLASS: Record<ImageContentPosition, string> = {
  "top-left": "col-start-1 row-start-1 justify-self-start self-start text-left",
  "top-center": "col-start-2 row-start-1 justify-self-center self-start text-center",
  "top-right": "col-start-3 row-start-1 justify-self-end self-start text-right",
  "center-left": "col-start-1 row-start-2 justify-self-start self-center text-left",
  center: "col-start-2 row-start-2 justify-self-center self-center text-center",
  "center-right": "col-start-3 row-start-2 justify-self-end self-center text-right",
  "bottom-left": "col-start-1 row-start-3 justify-self-start self-end text-left",
  "bottom-center": "col-start-2 row-start-3 justify-self-center self-end text-center",
  "bottom-right": "col-start-3 row-start-3 justify-self-end self-end text-right",
};

/** Normal layouts: alignment inside the content column only. */
export function contentAreaAlignClasses(position: ImageContentPosition): {
  box: string;
  text: string;
} {
  const horizontal =
    position.endsWith("left") ? "items-start" : position.endsWith("right") ? "items-end" : "items-center";
  const vertical = position.startsWith("top")
    ? "justify-start"
    : position.startsWith("bottom")
      ? "justify-end"
      : "justify-center";
  const text = position.endsWith("left")
    ? "text-left"
    : position.endsWith("right")
      ? "text-right"
      : "text-center";
  return { box: `flex flex-col ${horizontal} ${vertical}`, text };
}

export function contentPanelVariantClass(variant: ImageContentPanelVariant): string {
  const shell = "box-border max-w-full break-words rounded-xl p-4 shadow-sm sm:p-5 md:p-6";
  switch (variant) {
    case "surface":
      return `${shell} border border-border bg-background/95`;
    case "glass":
      return `${shell} border border-white/20 bg-background/60 backdrop-blur-md`;
    case "dark":
      return `${shell} bg-foreground/85 text-background`;
    case "light":
      return `${shell} bg-white/90 text-foreground`;
    case "none":
    default:
      return "";
  }
}

/**
 * Flex direction for left/right layouts.
 * Callers must use matching DOM order:
 * - left  → media, then content
 * - right → content, then media
 * Do not pair right with flex-row-reverse — that cancels the DOM swap and
 * makes left/right look identical.
 */
export function sideBySideLayoutClasses(
  mediaPosition: "left" | "right",
  mobileLayout: ImageMobileLayout,
): string {
  if (mediaPosition === "left") {
    // DOM: media → content
    if (mobileLayout === "side-by-side") return "flex flex-row";
    if (mobileLayout === "reverse") return "flex flex-col-reverse md:flex-row";
    return "flex flex-col md:flex-row"; // stack: media on top
  }

  // mediaPosition === "right", DOM: content → media
  if (mobileLayout === "side-by-side") return "flex flex-row";
  if (mobileLayout === "reverse") return "flex flex-col md:flex-row"; // content on top
  return "flex flex-col-reverse md:flex-row"; // stack: media on top
}

export function shouldRenderImageBlock(model: ImageBlockModel): boolean {
  return model.media.url.length > 0 || model.content.hasContent;
}
