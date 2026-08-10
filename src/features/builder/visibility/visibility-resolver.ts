import type { BlockRenderContext, BlockVisibilityRules } from "@/types/block-system";

function matchesUrlCondition(
  path: string,
  condition: NonNullable<BlockVisibilityRules["urlConditions"]>[number]
): boolean {
  const pattern = condition.pattern ?? "";
  if (!pattern) return true;
  const match = condition.match ?? "prefix";
  if (match === "exact") return path === pattern;
  if (match === "regex") {
    try {
      return new RegExp(pattern).test(path);
    } catch {
      return false;
    }
  }
  return path.startsWith(pattern);
}

function inDateRange(now: Date, range?: { start?: string; end?: string }): boolean {
  if (!range) return true;
  const t = now.getTime();
  if (range.start && t < new Date(range.start).getTime()) return false;
  if (range.end && t > new Date(range.end).getTime()) return false;
  return true;
}

function inTimeRange(now: Date, range?: { start?: string; end?: string }): boolean {
  if (!range?.start && !range?.end) return true;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const parse = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  if (range.start && minutes < parse(range.start)) return false;
  if (range.end && minutes > parse(range.end)) return false;
  return true;
}

export function evaluateVisibility(
  rules: BlockVisibilityRules | undefined,
  ctx: BlockRenderContext,
  localeRules?: BlockVisibilityRules
): boolean {
  const merged: BlockVisibilityRules = { ...rules, ...localeRules };
  if (!merged || Object.keys(merged).length === 0) return true;

  const now = ctx.now ?? new Date();

  if (merged.loggedIn === true && !ctx.isLoggedIn) return false;
  if (merged.loggedOut === true && ctx.isLoggedIn) return false;

  if (merged.roles?.length) {
    const roles = ctx.userRoles ?? [];
    if (!merged.roles.some((r) => roles.includes(r))) return false;
  }

  if (merged.locales?.length && !merged.locales.includes(ctx.locale)) return false;
  if (merged.languages?.length && !merged.languages.includes(ctx.locale)) return false;

  if (merged.devices?.length && !merged.devices.includes(ctx.device)) return false;

  if (!inDateRange(now, merged.dateRange)) return false;
  if (!inTimeRange(now, merged.timeRange)) return false;

  if (merged.featureFlags?.length) {
    const flags = ctx.featureFlags ?? [];
    if (!merged.featureFlags.every((f) => flags.includes(f))) return false;
  }

  if (merged.urlConditions?.length && ctx.currentPath) {
    const any = merged.urlConditions.some((c) =>
      matchesUrlCondition(ctx.currentPath!, c)
    );
    if (!any) return false;
  }

  return true;
}
