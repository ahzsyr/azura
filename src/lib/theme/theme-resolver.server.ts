import "server-only";

import { loadPresetJson } from "@/features/theme/preset-resolver.server";
import type { PresetDefinition } from "@/features/theme/preset-resolver.types";
import type { ThemeTokens } from "@/types/theme";
import {
  buildResolvedThemeSync,
  type BuildResolvedThemeOptions,
  type ResolvedTheme,
  type ThemeSourceInput,
} from "./theme-resolver";

/** Async resolver — loads preset JSON when needed (server-only). */
export async function buildResolvedTheme(
  tokens: ThemeTokens,
  options?: {
    visitor?: ThemeSourceInput["visitor"];
    prefersDark?: boolean;
    presetDefinition?: PresetDefinition | null;
  },
): Promise<ResolvedTheme> {
  let presetDefinition = options?.presetDefinition ?? null;

  if (!presetDefinition && tokens.activePresetId) {
    presetDefinition = await loadPresetJson(tokens.activePresetId);
  }

  const syncOptions: BuildResolvedThemeOptions = {
    tokens,
    presetDefinition,
    visitor: options?.visitor,
    prefersDark: options?.prefersDark,
  };

  return buildResolvedThemeSync(syncOptions);
}
