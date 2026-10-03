import {
  formatHydrationSafeDate,
  toHydrationSafeIso,
} from "@/lib/format/hydration-safe";
import { cn } from "@/lib/utils";

type Props = {
  author?: string | null;
  publishedAt?: Date | string | null;
  locale?: string;
  className?: string;
};

export function EditorialMetaBar({ author, publishedAt, locale, className }: Props) {
  if (!author && !publishedAt) return null;

  const dateStr = publishedAt
    ? formatHydrationSafeDate(publishedAt, locale, { month: "long" })
    : null;
  const dateTime = publishedAt ? toHydrationSafeIso(publishedAt) : null;

  if (!author && !dateStr) return null;

  return (
    <p className={cn("text-sm text-muted-foreground flex flex-wrap gap-x-2 items-center", className)}>
      {author && <span>{author}</span>}
      {author && dateStr && <span aria-hidden>·</span>}
      {dateStr && dateTime && <time dateTime={dateTime}>{dateStr}</time>}
    </p>
  );
}
