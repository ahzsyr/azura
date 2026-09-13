import type { ProductSpecificationGroup } from "@/features/products/types";
import { inferProductDomain } from "./domain-inference";
import { matchSpecification } from "./matcher";
import { getRegistrySpec, loadSpecificationRegistry } from "./registry";
import type { CanonicalSpecRecord, SpecMatchConfidence, UnmappedSpecDiagnostic } from "./types";

type NormalizeInput = {
  source_specifications?: ProductSpecificationGroup[];
  specifications?: ProductSpecificationGroup[];
  canonical_specs?: Record<string, CanonicalSpecRecord>;
  product_domain?: string;
  brand?: string;
  title?: string;
  mainCategory?: string;
  cat_path_titles?: string[];
  category_paths?: string[];
  output_format?: string;
};

export type NormalizeSpecificationsResult = {
  source_specifications: ProductSpecificationGroup[];
  canonical_specs: Record<string, CanonicalSpecRecord>;
  unmapped_specs: UnmappedSpecDiagnostic[];
  ambiguous_specs: UnmappedSpecDiagnostic[];
  specifications: ProductSpecificationGroup[];
  product_domain?: string;
};

function copyGroups(groups: ProductSpecificationGroup[]): ProductSpecificationGroup[] {
  return JSON.parse(JSON.stringify(groups)) as ProductSpecificationGroup[];
}

function iterRawItems(groups: ProductSpecificationGroup[]) {
  const items: Array<{ technology: string; name: string; value: string }> = [];
  for (const group of groups) {
    const technology = String(group.technology || "Specifications");
    for (const item of group.items || []) {
      if (item && typeof item === "object" && "is_group" in item && item.is_group) continue;
      const name = String(item?.name || "").trim();
      const value = String(item?.value || "").trim();
      if (!name && !value) continue;
      items.push({ technology, name, value });
    }
  }
  return items;
}

function buildLegacyCompat(canonical: Record<string, CanonicalSpecRecord>): ProductSpecificationGroup[] {
  const registry = loadSpecificationRegistry();
  const byGroup = new Map<string, ProductSpecificationGroup["items"]>();
  const order: string[] = [];

  for (const [specId, record] of Object.entries(canonical)) {
    const spec = getRegistrySpec(specId);
    const groupName = spec?.display?.group || spec?.domain || "Specifications";
    if (!byGroup.has(groupName)) {
      byGroup.set(groupName, []);
      order.push(groupName);
    }
    byGroup.get(groupName)!.push({
      name: record.name || spec?.name || specId,
      value: record.value,
      id: specId,
      source: { group: record.source_group, label: record.source_label },
      confidence: record.confidence,
      score: record.score,
    });
  }

  order.sort((a, b) => {
    const ai = registry.domainOrder.findIndex((d) => a.toLowerCase().startsWith(d));
    const bi = registry.domainOrder.findIndex((d) => b.toLowerCase().startsWith(d));
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });

  return order.map((group) => ({
    technology: group,
    groupId: group.toLowerCase().replace(/\s+/g, "_"),
    items: byGroup.get(group) || [],
  }));
}

export function normalizeSpecifications(
  rawGroups: ProductSpecificationGroup[],
  product: Record<string, unknown> = {},
  productDomain?: string,
): NormalizeSpecificationsResult {
  const sourceGrouped = copyGroups(rawGroups);
  const inferred = productDomain || inferProductDomain(product);
  const canonical: Record<string, CanonicalSpecRecord> = {};
  const unmapped: UnmappedSpecDiagnostic[] = [];
  const ambiguous: UnmappedSpecDiagnostic[] = [];

  for (const { technology, name, value } of iterRawItems(rawGroups)) {
    const { match, candidates, reason } = matchSpecification(technology, name, value, inferred);
    if (!match) {
      const diag: UnmappedSpecDiagnostic = {
        source_group: technology,
        source_label: name,
        value,
        reason: reason as SpecMatchConfidence,
        candidates: candidates.slice(0, 5).map((c) => c.specId),
      };
      if (reason === "AMBIGUOUS") ambiguous.push(diag);
      else unmapped.push(diag);
      continue;
    }

    const spec = getRegistrySpec(match.specId);
    canonical[match.specId] = {
      value,
      display: value,
      unit: match.unit ?? spec?.unit ?? null,
      source_group: technology,
      source_label: name,
      confidence: reason,
      score: match.score,
      name: match.name,
    };
  }

  return {
    source_specifications: sourceGrouped,
    canonical_specs: canonical,
    unmapped_specs: unmapped,
    ambiguous_specs: ambiguous,
    specifications: buildLegacyCompat(canonical),
    product_domain: inferred,
  };
}

export function ensureCanonicalSpecsOnProduct<T extends NormalizeInput>(product: T): T {
  if (product.canonical_specs && Object.keys(product.canonical_specs).length > 0) {
    return product;
  }

  const raw =
    product.source_specifications?.length
      ? product.source_specifications
      : product.specifications?.length
        ? product.specifications
        : [];
  if (!raw.length) return product;

  const result = normalizeSpecifications(raw, product as Record<string, unknown>, product.product_domain);
  return {
    ...product,
    source_specifications: result.source_specifications,
    canonical_specs: result.canonical_specs,
    unmapped_specs: result.unmapped_specs,
    ambiguous_specs: result.ambiguous_specs,
    specifications: result.specifications,
    ...(result.product_domain ? { product_domain: result.product_domain } : {}),
  };
}
