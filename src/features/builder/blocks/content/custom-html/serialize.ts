import { getContentFieldSuffix } from "@/i18n/locale-config";
import { VOID_TAGS, BLOCK_TEXT_TAGS, INLINE_TAGS } from "./types";
import type { HtmlElement, HtmlElementAttributes } from "./types";

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildAttrStr(attrs: HtmlElementAttributes): string {
  const parts: string[] = [];

  if (attrs.id) parts.push(`id="${escHtml(attrs.id)}"`);
  if (attrs.class) parts.push(`class="${escHtml(attrs.class)}"`);
  if (attrs.style) parts.push(`style="${escHtml(attrs.style)}"`);
  if (attrs.title) parts.push(`title="${escHtml(attrs.title)}"`);
  if (attrs.ariaLabel) parts.push(`aria-label="${escHtml(attrs.ariaLabel)}"`);
  if (attrs.dir) parts.push(`dir="${escHtml(attrs.dir)}"`);

  if (attrs.href) parts.push(`href="${escHtml(attrs.href)}"`);
  if (attrs.target) parts.push(`target="${escHtml(attrs.target)}"`);
  if (attrs.rel) parts.push(`rel="${escHtml(attrs.rel)}"`);

  if (attrs.src) parts.push(`src="${escHtml(attrs.src)}"`);
  if (attrs.alt !== undefined) parts.push(`alt="${escHtml(attrs.alt)}"`);
  if (attrs.width) parts.push(`width="${attrs.width}"`);
  if (attrs.height) parts.push(`height="${attrs.height}"`);
  if (attrs.loading) parts.push(`loading="${attrs.loading}"`);

  // Cell-level attrs
  if (attrs.colspan && attrs.colspan > 1) parts.push(`colspan="${attrs.colspan}"`);
  if (attrs.rowspan && attrs.rowspan > 1) parts.push(`rowspan="${attrs.rowspan}"`);
  if (attrs.scope) parts.push(`scope="${escHtml(attrs.scope)}"`);

  if (attrs.dataAttributes) {
    for (const [k, v] of Object.entries(attrs.dataAttributes)) {
      if (/^[\w-]+$/.test(k)) parts.push(`data-${k}="${escHtml(v)}"`);
    }
  }

  return parts.length ? " " + parts.join(" ") : "";
}

/** Build the style attribute value for a cell, merging cellWidth and cellAlign. */
function buildCellStyle(attrs: HtmlElementAttributes): string {
  const parts: string[] = [];
  if (attrs.cellWidth) parts.push(`width: ${attrs.cellWidth}`);
  if (attrs.cellAlign) parts.push(`text-align: ${attrs.cellAlign}`);
  // Prepend any manually authored style
  if (attrs.style) parts.unshift(attrs.style.replace(/;\s*$/, ""));
  return parts.join("; ");
}

/** Build class string for a table element based on its display options. */
function buildTableClass(attrs: HtmlElementAttributes): string {
  const classes: string[] = [];
  if (attrs.tableWidth === "full" || attrs.tableWidth === undefined) classes.push("w-full");
  if (attrs.tableLayout === "fixed") classes.push("table-fixed");
  if (attrs.bordered !== false) classes.push("border-collapse");
  if (attrs.striped) classes.push("cb-table-striped");
  if (attrs.compact) classes.push("cb-table-compact");
  if (attrs.class) classes.push(attrs.class);
  return classes.filter(Boolean).join(" ");
}

function getElementText(el: HtmlElement, locale: string): string {
  const suffix = getContentFieldSuffix(locale);
  const localizedKey = `text${suffix}`;
  const localized = el[localizedKey];
  if (typeof localized === "string" && localized.trim()) return localized;
  return el.text ?? "";
}

function getAlignmentClass(alignment: "left" | "center" | "right" | undefined): string {
  if (alignment === "left") return "float-left mr-4";
  if (alignment === "right") return "float-right ml-4";
  return "mx-auto block";
}

function serializeImg(el: HtmlElement, locale: string): string {
  const attrs = el.attributes ?? {};
  const src = attrs.src ?? "";
  const alt = attrs.alt ?? getElementText(el, locale);
  const alignClass = getAlignmentClass(attrs.alignment);
  const roundedClass = attrs.rounded ? " rounded-md" : "";

  let imgAttrs = ` src="${escHtml(src)}" alt="${escHtml(alt)}"`;
  if (attrs.width) imgAttrs += ` width="${attrs.width}"`;
  if (attrs.height) imgAttrs += ` height="${attrs.height}"`;
  imgAttrs += ` loading="${attrs.loading ?? "lazy"}"`;
  imgAttrs += ` class="${alignClass}${roundedClass}"`;

  if (attrs.id) imgAttrs += ` id="${escHtml(attrs.id)}"`;

  const img = `<img${imgAttrs}>`;

  if (attrs.linkHref) {
    const target = attrs.linkTarget ? ` target="${escHtml(attrs.linkTarget)}"` : "";
    return `<a href="${escHtml(attrs.linkHref)}"${target}>${img}</a>`;
  }

  return img;
}

function serializePicture(el: HtmlElement, locale: string): string {
  const attrs = el.attributes ?? {};
  const sources = attrs.sources ?? [];
  let inner = "";

  for (const source of sources) {
    if (!source.src) continue;
    const media = source.media ? ` media="${escHtml(source.media)}"` : "";
    inner += `<source${media} srcset="${escHtml(source.src)}">`;
  }

  inner += serializeImg({ ...el, tag: "img" as const }, locale);

  let attrStr = "";
  if (attrs.id) attrStr += ` id="${escHtml(attrs.id)}"`;
  if (attrs.class) attrStr += ` class="${escHtml(attrs.class)}"`;

  return `<picture${attrStr}>${inner}</picture>`;
}

function serializeFigure(el: HtmlElement, locale: string): string {
  const attrs = el.attributes ?? {};
  const attrStr = buildAttrStr({ id: attrs.id, class: attrs.class });
  const captionText = getElementText(el, locale);
  const imgHtml = serializeImg({ ...el, tag: "img" as const }, locale);
  const caption = captionText ? `<figcaption>${escHtml(captionText)}</figcaption>` : "";
  return `<figure${attrStr}>${imgHtml}${caption}</figure>`;
}

function serializeTable(el: HtmlElement, locale: string): string {
  const attrs = el.attributes ?? {};
  const tableClass = buildTableClass(attrs);
  const parts: string[] = [];

  if (attrs.id) parts.push(`id="${escHtml(attrs.id)}"`);
  if (tableClass) parts.push(`class="${escHtml(tableClass)}"`);
  if (attrs.style) parts.push(`style="${escHtml(attrs.style)}"`);
  if (attrs.dir) parts.push(`dir="${escHtml(attrs.dir)}"`);

  const attrStr = parts.length ? " " + parts.join(" ") : "";

  let inner = "";

  // Optional caption
  if (attrs.caption) {
    inner += `<caption>${escHtml(attrs.caption)}</caption>`;
  }

  if (Array.isArray(el.children)) {
    inner += el.children.map((child) => serializeElement(child, locale)).join("");
  }

  return `<table${attrStr}>${inner}</table>`;
}

function serializeCell(el: HtmlElement, locale: string): string {
  const tag = el.tag; // th or td
  const attrs = el.attributes ?? {};

  const parts: string[] = [];
  if (attrs.id) parts.push(`id="${escHtml(attrs.id)}"`);
  const cellStyle = buildCellStyle(attrs);
  if (cellStyle) parts.push(`style="${escHtml(cellStyle)}"`);
  if (attrs.colspan && attrs.colspan > 1) parts.push(`colspan="${attrs.colspan}"`);
  if (attrs.rowspan && attrs.rowspan > 1) parts.push(`rowspan="${attrs.rowspan}"`);
  if (attrs.scope) parts.push(`scope="${escHtml(attrs.scope)}"`);
  if (attrs.class) parts.push(`class="${escHtml(attrs.class)}"`);

  const attrStr = parts.length ? " " + parts.join(" ") : "";
  const text = getElementText(el, locale);
  return `<${tag}${attrStr}>${escHtml(text)}</${tag}>`;
}

function serializeElement(el: HtmlElement, locale: string): string {
  // rawHtml bypasses normal serialization (legacy / source-mode content)
  if (el.rawHtml !== undefined) {
    return el.rawHtml;
  }

  const tag = el.tag;
  const attrs = el.attributes ?? {};

  // Special-cased elements
  if (tag === "img") return serializeImg(el, locale);
  if (tag === "picture") return serializePicture(el, locale);
  if (tag === "figure") return serializeFigure(el, locale);
  if (tag === "table") return serializeTable(el, locale);
  if (tag === "th" || tag === "td") return serializeCell(el, locale);

  // Void elements
  if (VOID_TAGS.has(tag as never)) {
    const attrStr = buildAttrStr(attrs);
    return `<${tag}${attrStr}>`;
  }

  const attrStr = buildAttrStr(attrs);

  // Container with children
  if (Array.isArray(el.children) && el.children.length > 0) {
    const inner = el.children.map((child) => serializeElement(child, locale)).join("");
    return `<${tag}${attrStr}>${inner}</${tag}>`;
  }

  // Text-bearing block or inline
  if (BLOCK_TEXT_TAGS.has(tag as never) || INLINE_TAGS.has(tag as never) || tag === "a" || tag === "li") {
    const text = getElementText(el, locale);
    return `<${tag}${attrStr}>${escHtml(text)}</${tag}>`;
  }

  // Default: container with text fallback
  const text = getElementText(el, locale);
  if (text) {
    return `<${tag}${attrStr}>${escHtml(text)}</${tag}>`;
  }

  return `<${tag}${attrStr}></${tag}>`;
}

export function serializeElementsToHtml(elements: HtmlElement[], locale: string): string {
  return elements
    .filter((el) => !el.hidden)
    .map((el) => serializeElement(el, locale))
    .join("\n");
}
