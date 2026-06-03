import type { ContentStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VARIANT: Record<ContentStatus, string> = {
  PUBLISHED: "bg-emerald-600/10 text-emerald-700 border-emerald-200",
  DRAFT: "bg-muted text-muted-foreground",
  SCHEDULED: "bg-amber-500/10 text-amber-800 border-amber-200",
  ARCHIVED: "bg-slate-500/10 text-slate-600",
};

type Props = {
  status: ContentStatus;
  scheduledAt?: Date | null;
};

export function CmsStatusBadge({ status, scheduledAt }: Props) {
  const label =
    status === "SCHEDULED" && scheduledAt
      ? `Scheduled · ${scheduledAt.toLocaleDateString()}`
      : status;

  return (
    <Badge variant="outline" className={cn("text-xs font-medium", VARIANT[status])}>
      {label}
    </Badge>
  );
}
