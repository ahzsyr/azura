import { cn } from "@/lib/utils";
import type { maxWidthSchema } from "@/features/builder/blocks/content/schemas/content-blocks";
import type { z } from "zod";

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

  return (
    <div
      className={cn(
        WIDTH_CLASS[maxWidth],
        prose && "prose max-w-none cb-advanced-richtext",
        "[&_[data-callout]]:rounded-lg [&_[data-callout]]:border [&_[data-callout]]:border-amber-200 [&_[data-callout]]:bg-amber-50 [&_[data-callout]]:p-4 [&_[data-callout]]:my-4",
        "[&_[data-cb-button]]:inline-flex [&_[data-cb-button]]:items-center [&_[data-cb-button]]:rounded-md [&_[data-cb-button]]:bg-primary [&_[data-cb-button]]:px-4 [&_[data-cb-button]]:py-2 [&_[data-cb-button]]:text-primary-foreground [&_[data-cb-button]]:no-underline",
        "[&_[data-cb-columns]]:grid [&_[data-cb-columns]]:gap-4 [&_[data-cb-columns='2']]:md:grid-cols-2 [&_[data-cb-columns='3']]:md:grid-cols-3"
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
