import "server-only";

import { resolveSeoDocument } from "@/features/seo/core/seo-resolver";
import {
  evaluateHreflangReciprocity,
  type HreflangReciprocityIssue,
} from "@/features/seo/core/seo-hreflang-reciprocity";

export async function assertReciprocalHreflang(input: {
  canonical?: string;
  languages?: Record<string, string>;
}): Promise<HreflangReciprocityIssue[]> {
  const canonical = input.canonical?.trim();
  const languages = input.languages ?? {};
  if (!canonical || Object.keys(languages).length === 0) return [];

  const reverseLanguagesByUrl: Record<string, Record<string, string> | undefined> = {};
  const reverseStatusByUrl: Record<string, number> = {};

  for (const [hrefLang, href] of Object.entries(languages)) {
    if (hrefLang.toLowerCase() === "x-default") continue;
    const url = href?.trim();
    if (!url) continue;
    try {
      const doc = await resolveSeoDocument({ url });
      reverseStatusByUrl[url] = doc.status;
      reverseLanguagesByUrl[url] = doc.alternates?.languages;
    } catch {
      reverseStatusByUrl[url] = 0;
    }
  }

  return evaluateHreflangReciprocity({
    sourceCanonical: canonical,
    languages,
    reverseLanguagesByUrl,
    reverseStatusByUrl,
  });
}
