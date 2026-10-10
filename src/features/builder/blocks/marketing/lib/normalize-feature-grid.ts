import { isTipTapDoc, parseStoredContent } from "@/features/builder/blocks/content/admin/blocknote-pilot/format";
import {
  featureGridPropsSchema,
  type FeatureGridCardPresentation,
  type FeatureGridCardStyle,
  type FeatureGridItem,
  type FeatureGridLayout,
  type FeatureGridPresentation,
  type FeatureGridProps,
} from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import { resolveItemField, type ResolveItemFieldOptions } from "@/features/builder/blocks/marketing/lib/resolve-item-locale";

type LegacyCardVariant = "default" | "bordered" | "elevated" | "iconTop";

function mapLayoutToArrangement(layout: FeatureGridLayout): {
  presentation: FeatureGridPresentation;
  cardPresentation: FeatureGridCardPresentation;
} {
  switch (layout) {
    case "carousel":
      return { presentation: "carousel", cardPresentation: "standard" };
    case "icon":
      return { presentation: "grid", cardPresentation: "icon" };
    case "numbered":
      return { presentation: "grid", cardPresentation: "numbered" };
    case "horizontal":
      return { presentation: "grid", cardPresentation: "horizontal" };
    case "standard":
    default:
      return { presentation: "grid", cardPresentation: "standard" };
  }
}

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

  const hasExplicitPresentation = typeof rawObj.presentation === "string";
  const hasExplicitCardPresentation = typeof rawObj.cardPresentation === "string";
  if (!hasExplicitPresentation || !hasExplicitCardPresentation) {
    const mapped = mapLayoutToArrangement(parsed.layout);
    if (!hasExplicitPresentation) parsed.presentation = mapped.presentation;
    if (!hasExplicitCardPresentation) parsed.cardPresentation = mapped.cardPresentation;
  }

  if (!Array.isArray(rawObj.contentOrder)) {
    const fromItem = parsed.items.find((item) => Array.isArray(item.contentOrder) && item.contentOrder.length > 0);
    if (fromItem?.contentOrder) parsed.contentOrder = fromItem.contentOrder;
  }
  if (!rawObj.visibleElements || typeof rawObj.visibleElements !== "object") {
    const fromItem = parsed.items.find((item) => item.visibleElements && typeof item.visibleElements === "object");
    if (fromItem?.visibleElements) parsed.visibleElements = fromItem.visibleElements;
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

type TipTapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: TipTapNode[];
};

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderTipTapMarks(text: string, marks: TipTapNode["marks"]): string {
  return (marks ?? []).reduce((html, mark) => {
    if (mark.type === "bold") return `<strong>${html}</strong>`;
    if (mark.type === "italic") return `<em>${html}</em>`;
    if (mark.type === "underline") return `<u>${html}</u>`;
    if (mark.type === "strike") return `<s>${html}</s>`;
    if (mark.type === "code") return `<code>${html}</code>`;
    if (mark.type === "link") {
      const href = escapeHtmlText(String(mark.attrs?.href ?? ""));
      return `<a href="${href}">${html}</a>`;
    }
    return html;
  }, escapeHtmlText(text));
}

/** DOM-free TipTap JSON → HTML so server and client render the same description. */
function renderTipTapNode(node: TipTapNode): string {
  if (node.type === "text") return renderTipTapMarks(node.text ?? "", node.marks);
  const inner = (node.content ?? []).map(renderTipTapNode).join("");
  switch (node.type) {
    case "doc":
      return inner;
    case "paragraph":
      return `<p>${inner}</p>`;
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      const tag = level >= 1 && level <= 6 ? `h${level}` : "h2";
      return `<${tag}>${inner}</${tag}>`;
    }
    case "bulletList":
      return `<ul>${inner}</ul>`;
    case "orderedList":
      return `<ol>${inner}</ol>`;
    case "listItem":
      return `<li>${inner}</li>`;
    case "blockquote":
      return `<blockquote>${inner}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${inner}</code></pre>`;
    case "hardBreak":
      return "<br>";
    case "horizontalRule":
      return "<hr>";
    default:
      return inner;
  }
}

/**
 * Turn stored descriptionContent into HTML.
 * HTML strings pass through. TipTap JSON is rendered without a DOM so SSR matches the client.
 */
export function descriptionContentToHtml(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("<")) return trimmed;

  const parsed = parseStoredContent(trimmed);
  if (!isTipTapDoc(parsed)) return "";
  return renderTipTapNode(parsed as TipTapNode);
}

/**
 * Resolve card body HTML.
 * Locale-aware order: descriptionHtml, then descriptionContent, then plain description.
 */
export function resolveFeatureGridDescriptionHtml(
  item: FeatureGridItem | Record<string, unknown>,
  locale: string,
  options?: ResolveItemFieldOptions,
): string {
  const record = item as Record<string, unknown>;
  const html = resolveItemField(record, "descriptionHtml", locale, options).trim();
  if (html) return html;
  const fromContent = descriptionContentToHtml(
    resolveItemField(record, "descriptionContent", locale, options),
  ).trim();
  if (fromContent) return fromContent;
  const plain = resolveItemField(record, "description", locale, options);
  return plainTextToHtml(plain);
}

export function isFeatureGridElementVisible(
  visibleElements: Partial<Record<string, boolean>> | undefined,
  element: string,
): boolean {
  if (!visibleElements || typeof visibleElements !== "object") return true;
  return visibleElements[element] !== false;
}

export function getFeatureGridContentOrder(
  contentOrder: FeatureGridItem["contentOrder"] | undefined,
): FeatureGridItem["contentOrder"] {
  if (Array.isArray(contentOrder) && contentOrder.length > 0) return contentOrder;
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
