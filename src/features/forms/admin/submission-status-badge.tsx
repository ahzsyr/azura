import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
  string,
  { label: string; className: string; variant?: "default" | "secondary" | "outline" | "gold" }
> = {
  NEW: {
    label: "Unread",
    variant: "default",
    className: "border-transparent bg-blue-600 text-white hover:bg-blue-600/90",
  },
  REVIEWED: {
    label: "Reviewed",
    variant: "secondary",
    className:
      "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  ARCHIVED: {
    label: "Archived",
    variant: "outline",
    className: "text-muted-foreground",
  },
  SPAM: {
    label: "Spam",
    variant: "default",
    className: "border-transparent bg-red-600 text-white hover:bg-red-600/90",
  },
  TRASH: {
    label: "Trash",
    variant: "outline",
    className: "text-muted-foreground",
  },
  READ: {
    label: "Read",
    variant: "secondary",
    className:
      "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300",
  },
};

export function SubmissionStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = status.toUpperCase();
  const style = STATUS_STYLES[key] ?? {
    label: status,
    variant: "outline" as const,
    className: "",
  };

  return (
    <Badge variant={style.variant} className={cn(style.className, className)}>
      {style.label}
    </Badge>
  );
}
