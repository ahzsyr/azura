export type DuplicatePolicy = "overwrite" | "skip";

export type SlugConflictPolicy = "error" | "suffix" | "skip";

export type ImportTargetDecision = "write" | "skip" | "error";

export type ImportTargetResolution = {
  slug: string | null;
  decision: ImportTargetDecision;
  message?: string;
  /** Set when import slug was redirected to an existing product matched by SKU. */
  skuMatchedSlug?: string;
};

export type ImportTargetDeps = {
  slugExists: (slug: string) => Promise<boolean>;
  skuLookup: (sku: string) => Promise<string | null>;
};

async function resolveSlugForImport(
  baseSlug: string,
  duplicatePolicy: DuplicatePolicy,
  slugConflict: SlugConflictPolicy,
  reservedInBatch: Set<string>,
  slugExists: (slug: string) => Promise<boolean>,
): Promise<ImportTargetResolution> {
  const taken = async (s: string) => reservedInBatch.has(s) || (await slugExists(s));

  if (!(await taken(baseSlug))) {
    return { slug: baseSlug, decision: "write" };
  }

  if (slugConflict === "suffix") {
    let n = 1;
    let candidate = baseSlug;
    while (await taken(candidate)) {
      n += 1;
      candidate = `${baseSlug}-${n}`;
      if (n > 500) {
        return { slug: null, decision: "error", message: "Could not allocate a unique slug suffix" };
      }
    }
    return { slug: candidate, decision: "write" };
  }

  if (duplicatePolicy === "overwrite") {
    return { slug: baseSlug, decision: "write" };
  }

  if (slugConflict === "error") {
    return { slug: null, decision: "error", message: `Slug "${baseSlug}" already exists` };
  }

  return {
    slug: baseSlug,
    decision: "skip",
    message: `Skipped existing product "${baseSlug}"`,
  };
}

/** Resolve canonical slug for import, preferring SKU match over slug collision handling. */
export async function resolveImportTarget(
  baseSlug: string,
  sku: string | null,
  duplicatePolicy: DuplicatePolicy,
  slugConflict: SlugConflictPolicy,
  reservedSlugs: Set<string>,
  reservedSkus: Map<string, string>,
  deps: ImportTargetDeps,
): Promise<ImportTargetResolution> {
  if (sku) {
    const batchSlug = reservedSkus.get(sku);
    if (batchSlug) {
      if (duplicatePolicy === "skip") {
        return {
          slug: batchSlug,
          decision: "skip",
          message: `SKU "${sku}" already imported in this batch as "${batchSlug}"`,
        };
      }
      const skuMatchedSlug = batchSlug !== baseSlug ? batchSlug : undefined;
      return { slug: batchSlug, decision: "write", skuMatchedSlug };
    }

    const existingSlug = await deps.skuLookup(sku);
    if (existingSlug) {
      if (duplicatePolicy === "skip") {
        return {
          slug: existingSlug,
          decision: "skip",
          message: `SKU "${sku}" already used by "${existingSlug}"`,
        };
      }
      const skuMatchedSlug = existingSlug !== baseSlug ? existingSlug : undefined;
      return {
        slug: existingSlug,
        decision: "write",
        skuMatchedSlug,
      };
    }
  }

  return resolveSlugForImport(
    baseSlug,
    duplicatePolicy,
    slugConflict,
    reservedSlugs,
    deps.slugExists,
  );
}

export function formatSkuConflictError(sku: string | null): string {
  if (sku) {
    return `SKU "${sku}" conflicts with an existing product`;
  }
  return "Product SKU conflicts with an existing product";
}
