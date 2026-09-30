export type HreflangReciprocityIssue = {
  hrefLang: string;
  url: string;
  message: string;
};

function canonicalize(url: string): string {
  return url.trim().replace(/\/$/, "") || url;
}

/**
 * Evaluate EN/AR (and other locale) hreflang pairs. Always skip x-default —
 * it is a fallback selector, not a reciprocal locale route.
 */
export function evaluateHreflangReciprocity(input: {
  sourceCanonical: string;
  languages: Record<string, string>;
  reverseLanguagesByUrl: Record<string, Record<string, string> | undefined>;
  reverseStatusByUrl?: Record<string, number>;
}): HreflangReciprocityIssue[] {
  const issues: HreflangReciprocityIssue[] = [];
  const source = canonicalize(input.sourceCanonical);

  for (const [hrefLang, href] of Object.entries(input.languages)) {
    if (hrefLang.toLowerCase() === "x-default") continue;
    const url = href?.trim();
    if (!url) continue;

    const status = input.reverseStatusByUrl?.[url] ?? input.reverseStatusByUrl?.[canonicalize(url)];
    if (status != null && status !== 200) {
      issues.push({
        hrefLang,
        url,
        message: `Alternate ${hrefLang} (${url}) returned HTTP ${status} and cannot reciprocate hreflang.`,
      });
      continue;
    }

    const reverse = input.reverseLanguagesByUrl[url] ?? input.reverseLanguagesByUrl[canonicalize(url)];
    if (!reverse) {
      issues.push({
        hrefLang,
        url,
        message: `Alternate ${hrefLang} (${url}) did not expose hreflang languages.`,
      });
      continue;
    }

    const reverseHrefs = Object.entries(reverse)
      .filter(([lang]) => lang.toLowerCase() !== "x-default")
      .map(([, hrefValue]) => canonicalize(hrefValue));

    if (!reverseHrefs.includes(source)) {
      issues.push({
        hrefLang,
        url,
        message: `Alternate ${hrefLang} (${url}) does not link back to ${source}.`,
      });
    }
  }

  return issues;
}
