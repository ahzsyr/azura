import {
  featureGridPropsSchema,
  type FeatureGridCardStyle,
  type FeatureGridItem,
  type FeatureGridLayout,
  type FeatureGridProps,
} from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import { resolveItemField, type ResolveItemFieldOptions } from "@/features/builder/blocks/marketing/lib/resolve-item-locale";

type LegacyCardVariant = "default" | "bordered" | "elevated" | "iconTop";

function mapLegacyCardVariant(variant: LegacyCardVariant | undefined): {
  layout: FeatureGridLayout;
  cardStyle: FeatureGridCardStyle;
} {
  switch (variant) {
    case "bordered":
      return { layout: "standard", cardStyle: "outlined" };
    case "elevated":
      return { layout: "standard", cardStyle: "elevated" };
    case "iconTop":
      return { layout: "icon", cardStyle: "solid" };
    case "default":
    default:
      return { layout: "standard", cardStyle: "solid" };
  }
}

/**
 * Normalize Feature Grid props for render/admin.
 * Accepts legacy payloads (cardVariant-only, plain descriptions) and fills defaults.
 */
export function normalizeFeatureGridProps(raw: unknown): FeatureGridProps {
  const parsed = featureGridPropsSchema.parse(raw ?? {});
  const rawObj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const hasExplicitLayout = typeof rawObj.layout === "string";
  const hasExplicitCardStyle = typeof rawObj.cardStyle === "string";

  if (!hasExplicitLayout || !hasExplicitCardStyle) {
    const mapped = mapLegacyCardVariant(parsed.cardVariant);
    if (!hasExplicitLayout) parsed.layout = mapped.layout;
    if (!hasExplicitCardStyle) parsed.cardStyle = mapped.cardStyle;
  }

  return parsed;
}

/** Escape plain text and wrap in a paragraph for safe HTML display. */
export function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  if (!escaped.trim()) return "";
  return escaped
    .split(/\n+/)
    .map((line) => `<p>${line}</p>`)
    .join("");
}

/**
 * Resolve card body HTML: localized descriptionHtml, else plain description.
 */
export function resolveFeatureGridDescriptionHtml(
  item: FeatureGridItem | Record<string, unknown>,
  locale: string,
  options?: ResolveItemFieldOptions,
): string {
  const html = resolveItemField(item as Record<string, unknown>, "descriptionHtml", locale, options).trim();
  if (html) return html;
  const plain = resolveItemField(item as Record<string, unknown>, "description", locale, options);
  return plainTextToHtml(plain);
}

export function isFeatureGridElementVisible(
  item: FeatureGridItem,
  element: string,
): boolean {
  const map = item.visibleElements as Record<string, boolean> | undefined;
  if (!map || typeof map !== "object") return true;
  return map[element] !== false;
}

export function getFeatureGridContentOrder(item: FeatureGridItem): FeatureGridItem["contentOrder"] {
  const order = item.contentOrder;
  if (Array.isArray(order) && order.length > 0) return order;
  return ["visual", "badge", "number", "title", "subtitle", "description", "link", "button", "footer"];
}

/** Approximate CSS line-clamp from preview-by mode (never splits HTML). */
export function estimateFeatureGridLineClamp(
  previewBy: "lines" | "words" | "characters",
  previewLimit: number
): number {
  if (previewBy === "lines") return Math.max(1, previewLimit);
  if (previewBy === "words") return Math.max(1, Math.ceil(previewLimit / 10));
  return Math.max(1, Math.ceil(previewLimit / 60));
}
