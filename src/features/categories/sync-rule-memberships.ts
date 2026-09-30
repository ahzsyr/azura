import "server-only";

import { categoryRepository } from "@/repositories/category.repository";
import {
  matchEntityToRulesBool,
  productToRuleFields,
  upgradeLegacyRuleSet,
} from "@/features/categories/matching";
import { loadAllProducts } from "@/features/collections/collection-sync.service";
import type { MembershipMode } from "@/features/categories/types";

export type CategoryRuleSyncReport = {
  categoriesScanned: number;
  ruleMembershipsWritten: number;
  ruleMembershipsRemoved: number;
  skippedManualOnly: number;
  errors: string[];
};

function usesRules(mode: MembershipMode): boolean {
  return mode === "RULES" || mode === "HYBRID";
}

/**
 * Rebuild derived RULE memberships for PRODUCT categories.
 * MANUAL rows are never deleted. HYBRID overlap keeps MANUAL source.
 */
export async function syncProductCategoryRuleMemberships(
  locale = "en-us"
): Promise<CategoryRuleSyncReport> {
  const report: CategoryRuleSyncReport = {
    categoriesScanned: 0,
    ruleMembershipsWritten: 0,
    ruleMembershipsRemoved: 0,
    skippedManualOnly: 0,
    errors: [],
  };

  const categories = await categoryRepository.findAll("PRODUCT", null);
  const products = await loadAllProducts(locale);

  for (const cat of categories) {
    report.categoriesScanned += 1;
    if (!usesRules(cat.membershipMode)) {
      report.skippedManualOnly += 1;
      // Still clear any stale RULE rows if mode is MANUAL
      if (cat.membershipMode === "MANUAL") {
        try {
          report.ruleMembershipsRemoved += await categoryRepository.deleteRuleMemberships(cat.id);
        } catch (e) {
          report.errors.push(
            `${cat.slug}: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
      continue;
    }

    try {
      const root = upgradeLegacyRuleSet(cat.conditions);
      report.ruleMembershipsRemoved += await categoryRepository.deleteRuleMemberships(cat.id);

      for (const { slug, product } of products) {
        const fields = productToRuleFields(slug, product);
        if (!matchEntityToRulesBool(fields, root)) continue;

        await categoryRepository.assignMembership({
          categoryId: cat.id,
          entityId: String(product.id),
          entityKind: "product",
          source: "RULE",
        });
        report.ruleMembershipsWritten += 1;
      }
    } catch (e) {
      report.errors.push(`${cat.slug}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return report;
}
