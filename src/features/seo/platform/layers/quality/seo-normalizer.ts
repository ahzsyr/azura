import "server-only";

import type { ContentSnapshot, SeoExecutionContext, SeoSuggestion } from "../../types";
import { resolvePublicSiteUrl, resolveSiteLogoUrl } from "@/features/seo/site-url-resolver";
import {
  normalizeSeoSuggestionWithContext,
  serializeSuggestionJsonLd,
} from "./seo-normalizer-core";

export async function normalizeSeoSuggestion(
  ctx: SeoExecutionContext,
  snapshot: ContentSnapshot,
  suggestion: SeoSuggestion,
): Promise<SeoSuggestion> {
  const siteUrl = await resolvePublicSiteUrl();
  const siteLogo = await resolveSiteLogoUrl();
  return normalizeSeoSuggestionWithContext(ctx, snapshot, suggestion, { siteUrl, siteLogo });
}

export { serializeSuggestionJsonLd, normalizeSeoSuggestionWithContext, smartTruncate } from "./seo-normalizer-core";

export const seoNormalizer = {
  normalize: normalizeSeoSuggestion,
  serializeJsonLd: serializeSuggestionJsonLd,
};
