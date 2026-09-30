/** Shared completion percentage → badge color (admin translation UI). */
export type CompletionTier = "critical" | "low" | "medium" | "high" | "complete";

export function getCompletionTier(percentage: number): CompletionTier {
  if (percentage >= 100) return "complete";
  if (percentage >= 71) return "high";
  if (percentage >= 31) return "medium";
  return percentage > 0 ? "low" : "critical";
}

export function completionTierClass(tier: CompletionTier): string {
  switch (tier) {
    case "complete":
      return "bg-emerald-600 text-white border-emerald-600";
    case "high":
      return "bg-sky-600 text-white border-sky-600";
    case "medium":
      return "bg-amber-500 text-white border-amber-500";
    case "low":
      return "bg-orange-600 text-white border-orange-600";
    default:
      return "bg-destructive text-destructive-foreground border-destructive";
  }
}

export function completionBarClass(tier: CompletionTier): string {
  switch (tier) {
    case "complete":
      return "bg-emerald-600";
    case "high":
      return "bg-sky-600";
    case "medium":
      return "bg-amber-500";
    case "low":
      return "bg-orange-600";
    default:
      return "bg-destructive";
  }
}
