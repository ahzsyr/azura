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
    ? new Date(publishedAt).toLocaleDateString(locale ?? "en", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <p className={cn("text-sm text-muted-foreground flex flex-wrap gap-x-2 items-center", className)}>
      {author && <span>{author}</span>}
      {author && dateStr && <span aria-hidden>·</span>}
      {dateStr && <time dateTime={new Date(publishedAt!).toISOString()}>{dateStr}</time>}
    </p>
  );
}
