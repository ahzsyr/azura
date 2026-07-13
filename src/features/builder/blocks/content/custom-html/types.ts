export const VOID_TAGS = new Set([
  "br",
  "hr",
  "img",
  "source",
] as const);

export const BLOCK_TEXT_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "figcaption",
  "caption",
  "dt",
  "dd",
] as const);

export const INLINE_TAGS = new Set([
  "span",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "mark",
  "small",
  "sup",
  "sub",
  "abbr",
  "kbd",
  "code",
] as const);

export const CONTAINER_TAGS = new Set([
  "div",
  "section",
  "article",
  "aside",
  "header",
  "footer",
  "main",
  "nav",
  "ul",
  "ol",
  "li",
  "dl",
  "a",
  "figure",
  "picture",
  "video",
  "audio",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
] as const);

export type HtmlElementTag =
  | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  | "blockquote" | "pre" | "code" | "hr" | "br"
  | "ul" | "ol" | "li" | "dl" | "dt" | "dd"
  | "a" | "span" | "strong" | "em" | "b" | "i" | "u" | "mark" | "small" | "sup" | "sub" | "abbr" | "kbd"
  | "img" | "picture" | "source" | "figure" | "figcaption" | "video" | "audio"
  | "table" | "thead" | "tbody" | "tfoot" | "tr" | "th" | "td" | "caption"
  | "div" | "section" | "article" | "aside" | "header" | "footer" | "main" | "nav";

export type HtmlElementAttributes = {
  id?: string;
  class?: string;
  style?: string;
  title?: string;
  ariaLabel?: string;
  /** For <a> */
  href?: string;
  target?: string;
  rel?: string;
  /** For <img>, <source>, <video>, <audio> */
  src?: string;
  alt?: string;
  mediaAssetId?: string;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  /** Visual alignment — rendered as a class added to img wrapper */
  alignment?: "left" | "center" | "right";
  rounded?: boolean;
  /** Optional link wrapping an image */
  linkHref?: string;
  linkTarget?: string;
  /** For <picture>: extra source entries (desktop/tablet/mobile) */
  sources?: Array<{ media?: string; src: string; mediaAssetId?: string }>;
  /** key=value data-* attributes */
  dataAttributes?: Record<string, string>;
  /** For ul/ol list presentation in the editor serializer */
  listVariant?: "plain" | "withHeader";
  /** Text direction — emitted as dir="ltr/rtl" */
  dir?: "ltr" | "rtl";

  // ── Table-level ────────────────────────────────────────────────────────────
  tableLayout?: "auto" | "fixed";
  tableWidth?: "auto" | "full";
  striped?: boolean;
  bordered?: boolean;
  compact?: boolean;
  /** Optional table caption text */
  caption?: string;

  // ── Cell-level (th / td) ───────────────────────────────────────────────────
  colspan?: number;
  rowspan?: number;
  cellAlign?: "left" | "center" | "right";
  cellWidth?: string;
  /** scope attribute for <th> */
  scope?: "col" | "row" | "colgroup" | "rowgroup";
};

export type HtmlElement = {
  id: string;
  tag: HtmlElementTag;
  hidden?: boolean;
  /**
   * Raw HTML injected as-is (used for legacy migration and Edit Source items).
   * When set the normal serialization pipeline is bypassed.
   */
  rawHtml?: string;
  attributes?: HtmlElementAttributes;
  /**
   * Text content for the default locale.
   * Additional locales stored as passthrough: textEn, textAr, etc.
   */
  text?: string;
  children?: HtmlElement[];
  [key: string]: unknown;
};
