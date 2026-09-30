import {
  DEFAULT_PAGE_TRANSITIONS,
  parsePageTransitionsSettings,
  type PageTransitionsSettings,
} from "@/features/preloader/page-transitions.schema";

export type ResolvedPageTransitions = PageTransitionsSettings;

export function resolvePageTransitions(
  siteSettings: Record<string, unknown> | null | undefined,
): ResolvedPageTransitions {
  const raw = siteSettings?.pageTransitions;
  return parsePageTransitionsSettings(
    raw && typeof raw === "object"
      ? { ...DEFAULT_PAGE_TRANSITIONS, ...raw }
      : DEFAULT_PAGE_TRANSITIONS,
  );
}
