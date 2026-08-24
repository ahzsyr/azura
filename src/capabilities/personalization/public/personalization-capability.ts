import { personalizationService } from "../personalization.service";
import { applyRecentlyViewedBoost } from "../signals/recently-viewed";
import { rankingBoostForSearch } from "../signals/card-flags";

export const personalizationCapability = {
  id: "personalization" as const,
  getSettings: personalizationService.get.bind(personalizationService),
  saveSettings: personalizationService.save.bind(personalizationService),
  getVisitorState: async () => ({ recentlyViewed: [] as string[] }),
  applyRecentlyViewedBoost,
  rankingBoostForSearch,
};
