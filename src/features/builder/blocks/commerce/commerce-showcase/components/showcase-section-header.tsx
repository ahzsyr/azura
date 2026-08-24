import { SectionHeader } from "@/components/marketing/section";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  subtitle?: string;
  badge?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
};

export function ShowcaseSectionHeader({
  title,
  subtitle,
  badge,
  viewAllHref,
  viewAllLabel = "View all",
  className,
}: Props) {
  if (!title && !subtitle) return null;

  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0 flex-1">
        {badge ? (
          <span className="mb-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {badge}
          </span>
        ) : null}
        <SectionHeader title={title || ""} subtitle={subtitle} />
      </div>
      {viewAllHref ? (
        <Link
          href={viewAllHref}
          prefetch={false}
          className="text-sm font-medium text-primary hover:underline shrink-0"
        >
          {viewAllLabel}
        </Link>
      ) : null}
    </div>
  );
}
