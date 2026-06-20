import { z } from "zod";

export const PAGE_TRANSITION_PRESETS = ["fade", "slide", "zoom", "scale", "none"] as const;

export type PageTransitionPreset = (typeof PAGE_TRANSITION_PRESETS)[number];

export const pageTransitionsSchema = z.object({
  enabled: z.boolean(),
  preset: z.enum(PAGE_TRANSITION_PRESETS),
  durationMs: z.number().min(120).max(2000),
  sharedElementsEnabled: z.boolean().optional(),
});

export type PageTransitionsSettings = z.infer<typeof pageTransitionsSchema>;

export const DEFAULT_PAGE_TRANSITIONS: PageTransitionsSettings = {
  enabled: true,
  preset: "zoom",
  durationMs: 300,
  sharedElementsEnabled: true,
};

export function parsePageTransitionsSettings(raw: unknown): PageTransitionsSettings {
  const merged =
    raw && typeof raw === "object"
      ? { ...DEFAULT_PAGE_TRANSITIONS, ...(raw as Record<string, unknown>) }
      : DEFAULT_PAGE_TRANSITIONS;
  const parsed = pageTransitionsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_PAGE_TRANSITIONS;
}
