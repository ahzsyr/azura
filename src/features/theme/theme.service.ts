import { themeRepository } from "@/repositories/theme.repository";
import { createCached, CACHE_TAGS } from "@/services/cache";
import type { ThemeTokens } from "@/types/theme";
import { parseFooterConfig, parseHeaderConfig, parseTypography, siteThemeToTokens } from "./theme-config";
import { enrichTokensWithPreset } from "./preset-resolver";
import type { SiteTheme } from "@prisma/client";

export { themeToCssVars } from "./theme-css";

function toTokens(theme: SiteTheme): ThemeTokens {
  return {
    ...siteThemeToTokens(theme),
    typography: parseTypography(theme.typography),
    headerConfig: parseHeaderConfig(theme.headerConfig),
    footerConfig: parseFooterConfig(theme.footerConfig),
  };
}

async function toEnrichedTokens(theme: SiteTheme): Promise<ThemeTokens> {
  return enrichTokensWithPreset(toTokens(theme));
}

const getPublishedCached = createCached(
  async () => {
    const theme = await themeRepository.getPublished();
    if (!theme) return null;
    return toEnrichedTokens(theme);
  },
  ["site-theme-published"],
  { tags: [CACHE_TAGS.theme], revalidate: 3600 }
);

export const themeService = {
  getPublished: getPublishedCached,

  async getForPreview(previewDraft: boolean): Promise<ThemeTokens | null> {
    if (previewDraft) {
      const draft = await themeRepository.getDraft();
      return draft ? toEnrichedTokens(draft) : getPublishedCached();
    }
    return getPublishedCached();
  },

  async saveDraft(data: Parameters<typeof themeRepository.upsertDraft>[0]) {
    return themeRepository.upsertDraft(data);
  },

  async publish() {
    return themeRepository.publishFromDraft();
  },

  toTokens,
  parseHeaderConfig,
  parseFooterConfig,
};
