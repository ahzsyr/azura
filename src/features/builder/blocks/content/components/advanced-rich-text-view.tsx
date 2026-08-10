import { cn } from "@/lib/utils";
import type { maxWidthSchema } from "@/features/builder/blocks/content/schemas/content-blocks";
import type { z } from "zod";
import { adaptRichTextHtmlColors } from "@/features/builder/blocks/content/lib/adapt-rich-text-colors";
import "./advanced-rich-text.css";

type MaxWidth = z.infer<typeof maxWidthSchema>;

const WIDTH_CLASS: Record<MaxWidth, string> = {
  full: "max-w-none",
  contained: "site-page-width",
  narrow: "max-w-3xl mx-auto",
  reading: "max-w-prose mx-auto",
};

type Props = {
  html: string;
  maxWidth?: MaxWidth;
  prose?: boolean;
};

export function AdvancedRichTextView({ html, maxWidth = "reading", prose = true }: Props) {
  if (!html.trim()) return null;

  const adapted = adaptRichTextHtmlColors(html);

  return (
    <div
      className={cn(
        WIDTH_CLASS[maxWidth],
        prose && "prose max-w-none cb-advanced-richtext",
        !prose && "cb-advanced-richtext",
        "[&_[data-cb-button]]:inline-flex [&_[data-cb-button]]:items-center [&_[data-cb-button]]:rounded-md [&_[data-cb-button]]:bg-primary [&_[data-cb-button]]:px-4 [&_[data-cb-button]]:py-2 [&_[data-cb-button]]:text-primary-foreground [&_[data-cb-button]]:no-underline",
        "[&_[data-cb-columns]]:grid [&_[data-cb-columns]]:gap-4 [&_[data-cb-columns='2']]:md:grid-cols-2 [&_[data-cb-columns='3']]:md:grid-cols-3",
        "[&_table]:w-full [&_table]:border-collapse [&_th]:border [&_td]:border [&_th]:border-border [&_td]:border-border [&_th]:bg-muted/50 [&_th]:p-2 [&_td]:p-2",
        "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md"
      )}
      dangerouslySetInnerHTML={{ __html: adapted }}
    />
  );
}
