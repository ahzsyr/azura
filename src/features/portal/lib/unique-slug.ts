import { slugify } from "@/lib/utils";

type SlugLookupModel = {
  findFirst: (args: {
    where: { slug: string; NOT?: { id: string } };
    select: { id: true };
  }) => Promise<{ id: string } | null>;
};

export async function uniqueSlug(
  prismaModel: SlugLookupModel,
  base: string,
  excludeId?: string,
  fallback = "item"
): Promise<string> {
  const slug = slugify(base) || fallback;
  let candidate = slug;
  let n = 1;
  while (true) {
    const existing = await prismaModel.findFirst({
      where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${slug}-${n}`;
  }
}
