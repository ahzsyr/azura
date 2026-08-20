import { z } from "zod";

const htmlElementTagSchema = z.enum([
  "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "pre", "code", "hr", "br",
  "ul", "ol", "li", "dl", "dt", "dd",
  "a", "span", "strong", "em", "b", "i", "u", "mark", "small", "sup", "sub", "abbr", "kbd",
  "img", "picture", "source", "figure", "figcaption", "video", "audio",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "div", "section", "article", "aside", "header", "footer", "main", "nav",
]);

const htmlSourceSchema = z.object({
  media: z.string().optional(),
  src: z.string().default(""),
  mediaAssetId: z.string().optional(),
});

const htmlElementAttributesSchema = z.object({
  id: z.string().optional(),
  class: z.string().optional(),
  style: z.string().optional(),
  title: z.string().optional(),
  ariaLabel: z.string().optional(),
  href: z.string().optional(),
  target: z.string().optional(),
  rel: z.string().optional(),
  src: z.string().optional(),
  alt: z.string().optional(),
  mediaAssetId: z.string().optional(),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  loading: z.enum(["lazy", "eager"]).optional(),
  alignment: z.enum(["left", "center", "right"]).optional(),
  rounded: z.boolean().optional(),
  linkHref: z.string().optional(),
  linkTarget: z.string().optional(),
  sources: z.array(htmlSourceSchema).optional(),
  dataAttributes: z.record(z.string()).optional(),
  listVariant: z.enum(["plain", "withHeader"]).optional(),
  dir: z.enum(["ltr", "rtl"]).optional(),
  // Table-level
  tableLayout: z.enum(["auto", "fixed"]).optional(),
  tableWidth: z.enum(["auto", "full"]).optional(),
  striped: z.boolean().optional(),
  bordered: z.boolean().optional(),
  compact: z.boolean().optional(),
  caption: z.string().optional(),
  // Cell-level
  colspan: z.coerce.number().optional(),
  rowspan: z.coerce.number().optional(),
  cellAlign: z.enum(["left", "center", "right"]).optional(),
  cellWidth: z.string().optional(),
  scope: z.enum(["col", "row", "colgroup", "rowgroup"]).optional(),
}).passthrough();

const baseHtmlElementSchema = z.object({
  id: z.string(),
  tag: htmlElementTagSchema,
  hidden: z.boolean().default(false),
  rawHtml: z.string().optional(),
  attributes: htmlElementAttributesSchema.optional(),
  text: z.string().optional(),
}).passthrough();

export type HtmlElementInput = z.input<typeof baseHtmlElementSchema> & {
  children?: HtmlElementInput[];
};

export const htmlElementSchema: z.ZodType<HtmlElementInput> = baseHtmlElementSchema.extend({
  children: z.lazy(() => z.array(htmlElementSchema)).optional(),
}) as z.ZodType<HtmlElementInput>;

export const customHtmlElementsPropsSchema = z.object({
  elements: z.array(htmlElementSchema).default([]),
}).passthrough();
