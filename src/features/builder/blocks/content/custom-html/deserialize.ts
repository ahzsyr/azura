import { newId } from "@/features/builder/blocks/content/schemas/content-blocks";
import type { HtmlElement, HtmlElementTag } from "./types";

const SIMPLE_BLOCK_RE = /^<(p|h[1-6]|blockquote|pre)((?:\s+[^>]*)?)>([\s\S]*?)<\/\1>\s*/i;
const HEADING_RE = /^<(h[1-6])((?:\s+[^>]*)?)>([\s\S]*?)<\/\1>\s*/i;
const VOID_RE = /^<(hr|br)((?:\s+[^>]*)?)(?:\s*\/?)?>\s*/i;
const IMG_RE = /^<img((?:\s+[^>]*)?)\s*\/?>\s*/i;
const UL_OL_RE = /^<(ul|ol)((?:\s+[^>]*)?)>([\s\S]*?)<\/\1>\s*/i;
const LI_RE = /<li[^>]*>([\s\S]*?)<\/li>/gi;

/** Strip all HTML tags from a string, leaving plain text. */
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();
}

function parseAttrValue(attrs: string, name: string): string {
  const re = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = attrs.match(re);
  if (!m) return "";
  return (m[1] ?? m[2] ?? m[3] ?? "").trim();
}

function parseImgElement(attrs: string): HtmlElement {
  return {
    id: newId("chi"),
    tag: "img" as HtmlElementTag,
    attributes: {
      src: parseAttrValue(attrs, "src"),
      alt: parseAttrValue(attrs, "alt"),
      width: parseAttrValue(attrs, "width") ? Number(parseAttrValue(attrs, "width")) : undefined,
      height: parseAttrValue(attrs, "height") ? Number(parseAttrValue(attrs, "height")) : undefined,
      loading: (parseAttrValue(attrs, "loading") || "lazy") as "lazy" | "eager",
      class: parseAttrValue(attrs, "class") || undefined,
      id: parseAttrValue(attrs, "id") || undefined,
    },
  };
}

function parseListElement(tag: "ul" | "ol", _attrs: string, inner: string): HtmlElement {
  const children: HtmlElement[] = [];
  let match: RegExpExecArray | null;
  LI_RE.lastIndex = 0;
  while ((match = LI_RE.exec(inner)) !== null) {
    children.push({
      id: newId("li"),
      tag: "li" as HtmlElementTag,
      text: stripTags(match[1] ?? ""),
    });
  }
  return {
    id: newId("chi"),
    tag: tag as HtmlElementTag,
    children,
  };
}

/**
 * Best-effort HTML → HtmlElement[] parser.
 * Handles common top-level block elements. Everything else is wrapped in a rawHtml div.
 */
export function deserializeHtml(html: string): HtmlElement[] {
  const elements: HtmlElement[] = [];
  let remaining = html.trim();

  while (remaining.length > 0) {
    remaining = remaining.trimStart();
    if (!remaining) break;

    // Void: hr, br
    const voidMatch = remaining.match(VOID_RE);
    if (voidMatch) {
      const voidTag = voidMatch[1]!.toLowerCase() as "hr" | "br";
      elements.push({ id: newId("chi"), tag: voidTag });
      remaining = remaining.slice(voidMatch[0].length);
      continue;
    }

    // img
    const imgMatch = remaining.match(IMG_RE);
    if (imgMatch) {
      elements.push(parseImgElement(imgMatch[1] ?? ""));
      remaining = remaining.slice(imgMatch[0].length);
      continue;
    }

    // ul / ol
    const listMatch = remaining.match(UL_OL_RE);
    if (listMatch) {
      const tag = listMatch[1]!.toLowerCase() as "ul" | "ol";
      elements.push(parseListElement(tag, listMatch[2] ?? "", listMatch[3] ?? ""));
      remaining = remaining.slice(listMatch[0].length);
      continue;
    }

    // Heading
    const headingMatch = remaining.match(HEADING_RE);
    if (headingMatch) {
      const tag = headingMatch[1]!.toLowerCase() as HtmlElementTag;
      const attrStr = headingMatch[2] ?? "";
      const text = stripTags(headingMatch[3] ?? "");
      elements.push({
        id: newId("chi"),
        tag,
        text,
        attributes: { id: parseAttrValue(attrStr, "id") || undefined, class: parseAttrValue(attrStr, "class") || undefined },
      });
      remaining = remaining.slice(headingMatch[0].length);
      continue;
    }

    // p, blockquote, pre
    const blockMatch = remaining.match(SIMPLE_BLOCK_RE);
    if (blockMatch) {
      const tag = blockMatch[1]!.toLowerCase() as HtmlElementTag;
      const attrStr = blockMatch[2] ?? "";
      const text = stripTags(blockMatch[3] ?? "");
      elements.push({
        id: newId("chi"),
        tag,
        text,
        attributes: { id: parseAttrValue(attrStr, "id") || undefined, class: parseAttrValue(attrStr, "class") || undefined },
      });
      remaining = remaining.slice(blockMatch[0].length);
      continue;
    }

    // Fallback: wrap the rest in a rawHtml div
    elements.push({ id: newId("raw"), tag: "div" as HtmlElementTag, rawHtml: remaining });
    break;
  }

  return elements;
}

/**
 * Convert multiple legacy items (each with html/htmlEn/htmlAr) into a flat element list.
 * Each item becomes one rawHtml div to preserve rendering fidelity.
 */
export function deserializeLegacyItems(
  items: Array<{ id: string; html?: string; [key: string]: unknown }>,
  locale: string
): HtmlElement[] {
  const elements: HtmlElement[] = [];
  for (const item of items) {
    const html = (item[`html${getLocaleSuffix(locale)}`] as string | undefined) || (item.html as string | undefined) || "";
    if (!html.trim()) continue;
    const parsed = deserializeHtml(html);
    for (const el of parsed) {
      elements.push({ ...el, id: item.id === "legacy" ? el.id : `${item.id}-${el.id}` });
    }
  }
  return elements;
}

function getLocaleSuffix(locale: string): string {
  if (!locale || locale.toLowerCase() === "en") return "En";
  const parts = locale.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
  return parts.join("");
}
