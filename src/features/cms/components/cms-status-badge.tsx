import type { ContentStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VARIANT: Record<ContentStatus, string> = {
  PUBLISHED:
    "border-[color-mix(in_oklch,var(--primary)_35%,transparent)] bg-[color-mix(in_oklch,var(--primary)_12%,var(--admin-surface))] text-[color-mix(in_oklch,var(--primary)_85%,var(--foreground))]",
  DRAFT: "border-[var(--admin-border)] bg-muted/50 text-muted-foreground",
  SCHEDULED:
    "border-[color-mix(in_oklch,var(--accent,var(--primary))_35%,transparent)] bg-[color-mix(in_oklch,var(--accent,var(--primary))_12%,var(--admin-surface))] text-[color-mix(in_oklch,var(--accent,var(--primary))_80%,var(--foreground))]",
  ARCHIVED: "border-[var(--admin-border)] bg-muted/30 text-muted-foreground",
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
