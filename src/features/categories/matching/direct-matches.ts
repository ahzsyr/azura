import { explainEntityMatch, matchEntityToRulesBool } from "./evaluate";
import type { RuleExplainEntry } from "./types";
import { upgradeLegacyRuleSet } from "./upgrade-legacy";
import { isProductPublishedForSearch } from "@/features/products/lib/product-publish-status";

/** Product bag for direct category rule matching. Missing publish status means published. */
export type DirectRuleProduct = {
  slug: string;
  id: string;
  name: string;
  publishStatus?: string | null;
  fields: Record<string, unknown>;
};

export type DirectRuleSample = {
  id: string;
  slug: string;
  name: string;
  matched: boolean;
  explain?: RuleExplainEntry[];
};

export type DirectRuleMatchResult = {
  count: number;
  /** Published products evaluated. Drafts are excluded. */
  totalScanned: number;
  slugs: string[];
  samples: DirectRuleSample[];
};

/**
 * Direct matches of one rule tree against published products.
 * Child-category matches are not inherited. Empty rules match nothing.
 */
export function selectDirectRuleMatches(
  products: DirectRuleProduct[],
  conditions: unknown,
  options?: { sampleLimit?: number; explainEntityIdOrSlug?: string },
): DirectRuleMatchResult {
  const root = upgradeLegacyRuleSet(conditions);
  const sampleLimit = Math.min(Math.max(options?.sampleLimit ?? 15, 1), 100);
  const published = products.filter((product) => isProductPublishedForSearch(product.publishStatus));

  const samples: DirectRuleSample[] = [];
  const slugs: string[] = [];
  let explainTarget: DirectRuleSample | null = null;

  for (const product of published) {
    const matched = matchEntityToRulesBool(product.fields, root);
    if (matched) {
      slugs.push(product.slug);
      if (samples.length < sampleLimit) {
        samples.push({
          id: product.id,
          slug: product.slug,
          name: product.name,
          matched: true,
        });
      }
    }

    const want =
      options?.explainEntityIdOrSlug &&
      (product.slug === options.explainEntityIdOrSlug || product.id === options.explainEntityIdOrSlug);
    if (want) {
      const explained = explainEntityMatch(product.fields, root);
      explainTarget = {
        id: product.id,
        slug: product.slug,
        name: product.name,
        matched: explained.matched,
        explain: explained.entries,
      };
    }
  }

  const explainedSample = explainTarget;
  if (explainedSample && !samples.some((sample) => sample.slug === explainedSample.slug)) {
    samples.unshift(explainedSample);
  } else if (explainedSample) {
    const idx = samples.findIndex((sample) => sample.slug === explainedSample.slug);
    if (idx >= 0) samples[idx] = explainedSample;
  }

  return {
    count: slugs.length,
    totalScanned: published.length,
    slugs,
    samples,
  };
}
