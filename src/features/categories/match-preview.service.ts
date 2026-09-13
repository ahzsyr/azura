import "server-only";

import {
  explainEntityMatch,
  matchEntityToRulesBool,
  productToRuleFields,
  upgradeLegacyRuleSet,
  type RuleGroup,
} from "@/features/categories/matching";
import { loadAllProducts } from "@/features/collections/collection-sync.service";

export type MatchPreviewSample = {
  id: string;
  slug: string;
  name: string;
  matched: boolean;
  explain?: ReturnType<typeof explainEntityMatch>["entries"];
};

export type MatchPreviewResult = {
  count: number;
  totalScanned: number;
  samples: MatchPreviewSample[];
};

/**
 * Preview Matching Rules against catalog products (PRODUCT scope).
 * Empty rules → count 0 (contract).
 */
export async function previewProductRuleMatches(input: {
  conditions: unknown;
  locale?: string;
  sampleLimit?: number;
  explainEntityIdOrSlug?: string;
}): Promise<MatchPreviewResult> {
  const root: RuleGroup = upgradeLegacyRuleSet(input.conditions);
  const sampleLimit = Math.min(Math.max(input.sampleLimit ?? 25, 1), 100);
  const products = await loadAllProducts(input.locale ?? "en-us");

  const samples: MatchPreviewSample[] = [];
  let count = 0;
  let explainTarget: MatchPreviewSample | null = null;

  for (const { slug, product } of products) {
    const fields = productToRuleFields(slug, product);
    const matched = matchEntityToRulesBool(fields, root);
    if (matched) {
      count += 1;
      if (samples.length < sampleLimit) {
        samples.push({
          id: String(product.id),
          slug,
          name: String(fields.name ?? slug),
          matched: true,
        });
      }
    }

    const want =
      input.explainEntityIdOrSlug &&
      (slug === input.explainEntityIdOrSlug ||
        String(product.id) === input.explainEntityIdOrSlug);
    if (want) {
      const explained = explainEntityMatch(fields, root);
      explainTarget = {
        id: String(product.id),
        slug,
        name: String(fields.name ?? slug),
        matched: explained.matched,
        explain: explained.entries,
      };
    }
  }

  if (explainTarget && !samples.some((s) => s.slug === explainTarget!.slug)) {
    samples.unshift(explainTarget);
  } else if (explainTarget) {
    const idx = samples.findIndex((s) => s.slug === explainTarget!.slug);
    if (idx >= 0) samples[idx] = explainTarget;
  }

  return {
    count,
    totalScanned: products.length,
    samples,
  };
}
