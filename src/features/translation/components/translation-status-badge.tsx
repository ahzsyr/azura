import type { TranslationStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { completionTierClass, getCompletionTier } from "@/features/translation/completion-utils";

const STATUS_CONFIG: Record<
  TranslationStatus | "missing" | "partial",
  { label: string; variant: "default" | "secondary" | "outline" | "gold" }
> = {
  REVIEW: { label: "Review", variant: "gold" },
  PUBLISHED: { label: "Published", variant: "default" },
  DRAFT: { label: "Draft", variant: "secondary" },
  missing: { label: "Missing", variant: "outline" },
  partial: { label: "Partial", variant: "gold" },
};

export function TranslationStatusBadge({
  status,
  className,
}: {
  status: TranslationStatus | "missing" | "partial";
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} className={cn("text-xs", className)}>
      {config.label}
    </Badge>
  );
}

export function CompletionBadge({ percentage }: { percentage: number }) {
  const tier = getCompletionTier(percentage);
  return (
    <Badge className={cn("text-xs tabular-nums border", completionTierClass(tier))}>
      {percentage}%
    </Badge>
  );
}
