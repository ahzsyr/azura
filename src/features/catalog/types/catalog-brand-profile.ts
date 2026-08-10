import { z } from "zod";

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
});

export type CatalogBrandProfile = z.infer<typeof catalogBrandProfileSchema>;

export function brandNameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
    const slug = brandNameToSlug(name);
    if (!slug) continue;
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
    };
    merged.push(profile);
    byName.set(key, profile);
  }
  return normalizeCatalogBrandProfiles(merged);
}
