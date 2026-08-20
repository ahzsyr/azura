import { z } from "zod";
import { validateTemplateId } from "@/features/products/layout-templates/registry-meta";
import {
  emptyRuleGroup,
  isEmptyRuleTree,
  upgradeLegacyRuleSet,
  type RuleGroup,
} from "@/features/categories/matching";

export const catalogBrandProfileSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  logoUrl: z.string().default(""),
  bannerUrl: z.string().default(""),
  descriptionEn: z.string().default(""),
  descriptionAr: z.string().default(""),
  href: z.string().default(""),
  featured: z.boolean().default(false),
  sortOrder: z.coerce.number().default(0),
  pageLayoutTemplate: z
    .string()
    .nullable()
    .optional()
    .transform((value) => {
      if (value == null || value === "") return null;
      return validateTemplateId(value);
    }),
  conditions: z.unknown().optional().transform((value) => upgradeLegacyRuleSet(value)),
});

export type CatalogBrandProfile = z.infer<typeof catalogBrandProfileSchema>;

export function brandNameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function emptyCatalogBrandProfile(sortOrder = 0): CatalogBrandProfile {
  return {
    slug: "",
    name: "",
    logoUrl: "",
    bannerUrl: "",
    descriptionEn: "",
    descriptionAr: "",
    href: "",
    featured: false,
    sortOrder,
    pageLayoutTemplate: null,
    conditions: emptyRuleGroup("any"),
  };
}

/** Identity rule: product.brand equals this catalog brand name. */
export function defaultBrandMatchRules(brandName: string): RuleGroup {
  return {
    kind: "group",
    match: "any",
    children: [
      { kind: "leaf", field: "brand", operator: "equals", value: brandName },
    ],
  };
}

/** Fill empty matching rules with the identity brand-equals rule. Custom trees are kept. */
export function ensureDefaultBrandMatchRules(profile: CatalogBrandProfile): CatalogBrandProfile {
  const root = upgradeLegacyRuleSet(profile.conditions);
  if (!isEmptyRuleTree(root)) return { ...profile, conditions: root };
  return { ...profile, conditions: defaultBrandMatchRules(profile.name) };
}

/** Stable unique slug for a brand name. Falls back to `brand` when slugify is empty (e.g. non-Latin names). */
export function uniqueBrandSlug(
  name: string,
  existingSlugs: Iterable<string>,
  preferred?: string,
): string {
  const taken = new Set(
    [...existingSlugs].map((slug) => slug.trim().toLowerCase()).filter(Boolean),
  );
  const preferredSlug = preferred?.trim()
    ? brandNameToSlug(preferred) || preferred.trim().toLowerCase().replace(/\s+/g, "-")
    : "";
  const base = preferredSlug || brandNameToSlug(name) || "brand";
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function normalizeCatalogBrandProfiles(raw: unknown): CatalogBrandProfile[] {
  if (!Array.isArray(raw)) return [];
  const out: CatalogBrandProfile[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const parsed = catalogBrandProfileSchema.safeParse(item);
    if (!parsed.success) continue;
    const slug = parsed.data.slug.trim() || brandNameToSlug(parsed.data.name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ ...parsed.data, slug });
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function syncBrandNamesFromProfiles(profiles: CatalogBrandProfile[]): string[] {
  return [...new Set(profiles.map((p) => p.name.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

export function seedProfilesFromBrandNames(
  existing: CatalogBrandProfile[],
  brandNames: string[],
): CatalogBrandProfile[] {
  const byName = new Map(existing.map((p) => [p.name.toLowerCase(), p]));
  const merged = [...existing];
  let order = merged.length;
  for (const name of brandNames) {
    const key = name.toLowerCase();
    if (byName.has(key)) continue;
    const slug = uniqueBrandSlug(name, merged.map((p) => p.slug));
    const profile: CatalogBrandProfile = {
      slug,
      name,
      logoUrl: "",
      bannerUrl: "",
      descriptionEn: "",
      descriptionAr: "",
      href: "",
      featured: false,
      sortOrder: order++,
      pageLayoutTemplate: null,
      conditions: defaultBrandMatchRules(name),
    };
    merged.push(profile);
    byName.set(key, profile);
  }
  return normalizeCatalogBrandProfiles(merged);
}
