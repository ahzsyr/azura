"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/features/auth/guards";
import { uniqueSlug } from "@/features/portal/lib/unique-slug";
import { parseChildrenJson, str, num, bool } from "@/features/portal/lib/parse-children-json";
import { checkboxValue } from "@/features/portal/lib/action-helpers";
import { syncEntityRowTranslations } from "@/features/portal/lib/portal-translation";
import { revalidateMarketingHome } from "@/services/cache";
import { localeService } from "@/features/i18n/locale.service";
import { getDefaultLocaleFieldFromForm } from "@/features/translation/form-sync";
import { syncEntityTranslationsFromForm } from "@/features/translation/form-sync.server";
import { prisma } from "@/lib/prisma";
import {
  removePartnerProgramSearchIndex,
  syncPartnerProgramSearchIndex,
} from "@/capabilities/search/engine/indexing/portal-index-hooks";

const ADMIN_BASE = "/admin/partners";

function revalidatePartnerProgramPaths(slug?: string, id?: string) {
  revalidateMarketingHome();
  revalidatePath(ADMIN_BASE);
  revalidatePath(`${ADMIN_BASE}/new`);
  if (id) revalidatePath(`${ADMIN_BASE}/${id}`);
  if (slug) revalidatePath(`/partners/${slug}`);
}

export async function upsertPartnerProgram(formData: FormData) {
  await requireAdmin();
  const enabledLocales = await localeService.listEnabled();
  const id = (formData.get("id") as string | null) || undefined;
  const titleForSlug = getDefaultLocaleFieldFromForm(formData, enabledLocales, "title");
  const slugInput = (formData.get("slug") as string | null)?.trim();
  const slug = slugInput
    ? await uniqueSlug(prisma.partnerProgram, slugInput, id, "partners")
    : await uniqueSlug(prisma.partnerProgram, titleForSlug, id, "partners");

  const data = {
    slug,
    isPublished: checkboxValue(formData.get("isPublished")),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  const program =
    id != null
      ? await prisma.partnerProgram.update({ where: { id }, data })
      : await prisma.partnerProgram.create({
          data: {
            ...data,
            sortOrder: data.sortOrder || (await prisma.partnerProgram.count()),
          },
        });

  await syncEntityTranslationsFromForm(formData, "PartnerProgram", program.id, enabledLocales);

  const categories = parseChildrenJson(formData.get("categoriesJson"));
  const partners = parseChildrenJson(formData.get("partnersJson"));
  const keptCategoryIds = new Set<string>();
  const keptPartnerIds = new Set<string>();

  for (let i = 0; i < categories.length; i++) {
    const row = categories[i];
    const categoryId = str(row.id);
    const categoryData = {
      programId: program.id,
      slug: str(row.slug, `category-${i + 1}`),
      sortOrder: num(row.sortOrder, i),
    };
    const category =
      categoryId != null
        ? await prisma.partnerCategory.update({ where: { id: categoryId }, data: categoryData })
        : await prisma.partnerCategory.create({ data: categoryData });
    keptCategoryIds.add(category.id);
    await syncEntityRowTranslations("PartnerCategory", category.id, row, enabledLocales);
  }
  await prisma.partnerCategory.deleteMany({
    where: { programId: program.id, id: { notIn: [...keptCategoryIds] } },
  });

  for (let i = 0; i < partners.length; i++) {
    const row = partners[i];
    const partnerId = str(row.id);
    const certifications = Array.isArray(row.certifications) ? row.certifications : [];
    const latRaw = row.latitude;
    const lngRaw = row.longitude;
    const partnerData = {
      programId: program.id,
      categoryId: str(row.categoryId) || null,
      logoUrl: str(row.logoUrl),
      websiteUrl: str(row.websiteUrl),
      profileUrl: str(row.profileUrl),
      email: str(row.email),
      phone: str(row.phone),
      latitude: latRaw != null && latRaw !== "" ? new Prisma.Decimal(num(latRaw)) : null,
      longitude: lngRaw != null && lngRaw !== "" ? new Prisma.Decimal(num(lngRaw)) : null,
      certifications: certifications as Prisma.InputJsonValue,
      isPublished: bool(row.isPublished, true),
      sortOrder: num(row.sortOrder, i),
    };
    const partner =
      partnerId != null
        ? await prisma.partner.update({ where: { id: partnerId }, data: partnerData })
        : await prisma.partner.create({ data: partnerData });
    keptPartnerIds.add(partner.id);
    await syncEntityRowTranslations("Partner", partner.id, row, enabledLocales);
  }
  const removingPartners = await prisma.partner.findMany({
    where: { programId: program.id, id: { notIn: [...keptPartnerIds] } },
    select: { id: true },
  });
  const { frameworkSearchIndexer } = await import("@/capabilities/search/engine");
  for (const partner of removingPartners) {
    await frameworkSearchIndexer.remove("PARTNER", partner.id, { revalidate: false });
  }
  await prisma.partner.deleteMany({
    where: { programId: program.id, id: { notIn: [...keptPartnerIds] } },
  });

  revalidatePartnerProgramPaths(program.slug, program.id);
  await syncPartnerProgramSearchIndex(program.id);
  return program;
}

export async function patchPartnerProgramFromForm(
  id: string,
  baseline: Record<string, string>,
  current: Record<string, string>,
) {
  const { patchPartnerProgramFromForm: patchImpl } = await import(
    "@/features/portal/lib/entity-patch.server"
  );
  return patchImpl(id, baseline, current);
}

export async function deletePartnerProgram(id: string) {
  await requireAdmin();
  const row = await prisma.partnerProgram.findUnique({ where: { id }, select: { slug: true } });
  await removePartnerProgramSearchIndex(id);
  await prisma.partnerProgram.delete({ where: { id } });
  revalidatePartnerProgramPaths(row?.slug, id);
}

export async function togglePartnerProgramPublished(id: string, isPublished: boolean) {
  await requireAdmin();
  const row = await prisma.partnerProgram.update({
    where: { id },
    data: { isPublished },
    select: { slug: true, id: true },
  });
  revalidatePartnerProgramPaths(row.slug, id);
  await syncPartnerProgramSearchIndex(id);
}
