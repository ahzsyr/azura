"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { uniqueSlug } from "@/features/portal/lib/unique-slug";
import { parseChildrenJson, str, num, bool } from "@/features/portal/lib/parse-children-json";
import { checkboxValue } from "@/features/portal/lib/action-helpers";
import { revalidateMarketingHome } from "@/services/cache";
import { prisma } from "@/lib/prisma";

const ADMIN_BASE = "/admin/documentation";

function revalidateDocPortalPaths(slug?: string, id?: string) {
  revalidateMarketingHome();
  revalidatePath(ADMIN_BASE);
  revalidatePath(`${ADMIN_BASE}/new`);
  if (id) revalidatePath(`${ADMIN_BASE}/${id}`);
  if (slug) revalidatePath(`/docs/${slug}`);
}

export async function upsertDocPortal(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") as string | null) || undefined;
  const titleEn = (formData.get("titleEn") as string) ?? "";
  const slugInput = (formData.get("slug") as string | null)?.trim();
  const slug = slugInput
    ? await uniqueSlug(prisma.docPortal, slugInput, id, "docs")
    : await uniqueSlug(prisma.docPortal, titleEn, id, "docs");

  const data = {
    slug,
    titleEn,
    titleAr: (formData.get("titleAr") as string) ?? "",
    descriptionEn: (formData.get("descriptionEn") as string) || "",
    descriptionAr: (formData.get("descriptionAr") as string) || "",
    isPublished: checkboxValue(formData.get("isPublished")),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  const portal =
    id != null
      ? await prisma.docPortal.update({ where: { id }, data })
      : await prisma.docPortal.create({
          data: {
            ...data,
            sortOrder: data.sortOrder || (await prisma.docPortal.count()),
          },
        });

  const versions = parseChildrenJson(formData.get("versionsJson"));
  const sections = parseChildrenJson(formData.get("sectionsJson"));
  const keptVersionIds = new Set<string>();
  const keptSectionIds = new Set<string>();

  for (let i = 0; i < versions.length; i++) {
    const row = versions[i];
    const versionId = str(row.id);
    const versionData = {
      portalId: portal.id,
      slug: str(row.slug, `v${i + 1}`),
      labelEn: str(row.labelEn),
      labelAr: str(row.labelAr),
      isDefault: bool(row.isDefault),
      isPublished: bool(row.isPublished, true),
      sortOrder: num(row.sortOrder, i),
    };
    if (versionId) {
      await prisma.docVersion.update({ where: { id: versionId }, data: versionData });
      keptVersionIds.add(versionId);
    } else {
      const created = await prisma.docVersion.create({ data: versionData });
      keptVersionIds.add(created.id);
    }
  }
  await prisma.docVersion.deleteMany({
    where: { portalId: portal.id, id: { notIn: [...keptVersionIds] } },
  });

  for (let i = 0; i < sections.length; i++) {
    const row = sections[i];
    const sectionId = str(row.id);
    const sectionData = {
      portalId: portal.id,
      versionId: str(row.versionId) || null,
      parentId: str(row.parentId) || null,
      slug: str(row.slug, `section-${i + 1}`),
      titleEn: str(row.titleEn),
      titleAr: str(row.titleAr),
      href: str(row.href),
      contentEn: str(row.contentEn),
      contentAr: str(row.contentAr),
      isPublished: bool(row.isPublished, true),
      sortOrder: num(row.sortOrder, i),
    };
    if (sectionId) {
      await prisma.docSection.update({ where: { id: sectionId }, data: sectionData });
      keptSectionIds.add(sectionId);
    } else {
      const created = await prisma.docSection.create({ data: sectionData });
      keptSectionIds.add(created.id);
    }
  }
  await prisma.docSection.deleteMany({
    where: { portalId: portal.id, id: { notIn: [...keptSectionIds] } },
  });

  revalidateDocPortalPaths(portal.slug, portal.id);
  return portal;
}

export async function deleteDocPortal(id: string) {
  await requireAdmin();
  const row = await prisma.docPortal.findUnique({ where: { id }, select: { slug: true } });
  await prisma.docPortal.delete({ where: { id } });
  revalidateDocPortalPaths(row?.slug, id);
}

export async function toggleDocPortalPublished(id: string, isPublished: boolean) {
  await requireAdmin();
  const row = await prisma.docPortal.update({
    where: { id },
    data: { isPublished },
    select: { slug: true, id: true },
  });
  revalidateDocPortalPaths(row.slug, id);
}
