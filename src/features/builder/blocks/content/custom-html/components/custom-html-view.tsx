import { cn } from "@/lib/utils";
import { adaptRichTextHtmlColors } from "@/features/builder/blocks/content/lib/adapt-rich-text-colors";
import type { HtmlElement } from "../types";
import { serializeElementsToHtml } from "../serialize";
import { sanitizeCustomHtml } from "../sanitize";

type Props = {
  elements: HtmlElement[];
  locale?: string;
  previewMode?: boolean;
  className?: string;
};

export function CustomHtmlView({ elements, locale = "en", previewMode = false, className }: Props) {
  const visibleElements = previewMode ? elements : elements.filter((el) => !el.hidden);
  if (visibleElements.length === 0) return null;

  const rawHtml = serializeElementsToHtml(visibleElements, locale);
  const sanitized = sanitizeCustomHtml(rawHtml);
  if (!sanitized.trim()) return null;

  const adapted = adaptRichTextHtmlColors(sanitized);

  return (
    <div
      className={cn(
        "prose max-w-none cb-advanced-richtext",
        "[&_h1]:text-4xl [&_h1]:font-extrabold [&_h1]:leading-tight",
        "[&_h2]:text-3xl [&_h2]:font-bold [&_h2]:leading-tight",
        "[&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:leading-snug",
        "[&_h4]:text-xl [&_h4]:font-semibold [&_h4]:leading-snug",
        "[&_h5]:text-lg [&_h5]:font-medium [&_h5]:leading-snug",
        "[&_h6]:text-base [&_h6]:font-medium [&_h6]:leading-snug",
        "[&_img]:max-w-full [&_img]:h-auto",
        "[&_table]:w-full [&_table]:border-collapse",
        "[&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:p-2",
        "[&_td]:border [&_td]:border-border [&_td]:p-2",
        "[&_.float-left]:float-left [&_.float-right]:float-right",
        className
      )}
      dangerouslySetInnerHTML={{ __html: adapted }}
    />
  );
}
