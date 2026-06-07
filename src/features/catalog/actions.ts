"use server";

import { revalidatePath } from "next/cache";
import type { InquiryStatus } from "@prisma/client";
import { requireAdmin } from "@/features/auth/guards";
import { revalidateMarketingHome } from "@/services/cache";
import { companyInfoSchema } from "@/schemas/company";
import { prisma } from "@/lib/prisma";
import { localeService } from "@/features/i18n/locale.service";
import { syncEntityTranslationsFromForm } from "@/features/translation/form-sync";
import { applyLegacyWritePolicy } from "@/features/translation/legacy-adapter";

function parseJsonField<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (!raw || typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function updateInquiryStatus(id: string, status: InquiryStatus) {
  await requireAdmin();
  await prisma.inquiry.update({ where: { id }, data: { status } });
  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/inquiries/${id}`);
}

export async function updateInquiryNotes(id: string, notes: string) {
  await requireAdmin();
  await prisma.inquiry.update({ where: { id }, data: { notes } });
  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/inquiries/${id}`);
}

export async function deleteInquiry(id: string) {
  await requireAdmin();
  await prisma.inquiry.delete({ where: { id } });
  revalidatePath("/admin/inquiries");
}

export async function linkInquiryToCustomer(inquiryId: string, userId: string) {
  await requireAdmin();
  const [inquiry, user] = await Promise.all([
    prisma.inquiry.findUnique({ where: { id: inquiryId }, select: { id: true } }),
    prisma.user.findFirst({
      where: { id: userId, role: "CUSTOMER" },
      select: { id: true },
    }),
  ]);
  if (!inquiry) throw new Error("Inquiry not found");
  if (!user) throw new Error("Customer account not found");
  await prisma.inquiry.update({
    where: { id: inquiryId },
    data: { userId: user.id },
  });
  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/inquiries/${inquiryId}`);
}

export async function unlinkInquiryFromCustomer(inquiryId: string) {
  await requireAdmin();
  await prisma.inquiry.update({
    where: { id: inquiryId },
    data: { userId: null },
  });
  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/inquiries/${inquiryId}`);
}

export async function updateCompanyInfo(formData: FormData) {
  await requireAdmin();
  const parsed = companyInfoSchema.parse({
    name: formData.get("name"),
    taglineEn: formData.get("taglineEn"),
    taglineAr: formData.get("taglineAr"),
    storyEn: formData.get("storyEn"),
    storyAr: formData.get("storyAr"),
    missionEn: formData.get("missionEn"),
    missionAr: formData.get("missionAr"),
    visionEn: formData.get("visionEn"),
    visionAr: formData.get("visionAr"),
    valuesEn: formData.get("valuesEn"),
    valuesAr: formData.get("valuesAr"),
    registrationNo: formData.get("registrationNo"),
    licenseInfo: formData.get("licenseInfo"),
    addressEn: formData.get("addressEn"),
    addressAr: formData.get("addressAr"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    email: formData.get("email"),
    officeHoursEn: formData.get("officeHoursEn"),
    officeHoursAr: formData.get("officeHoursAr"),
    socialLinks: formData.get("socialLinks"),
    trustBadges: formData.get("trustBadges"),
  });

  await prisma.companyInfo.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...applyLegacyWritePolicy(parsed),
      valuesEn: parseJsonField(parsed.valuesEn, []),
      valuesAr: parseJsonField(parsed.valuesAr, []),
      socialLinks: parseJsonField(parsed.socialLinks, {}),
      trustBadges: parseJsonField(parsed.trustBadges, []),
    },
    update: applyLegacyWritePolicy({
      ...parsed,
      valuesEn: parseJsonField(parsed.valuesEn, []),
      valuesAr: parseJsonField(parsed.valuesAr, []),
      socialLinks: parseJsonField(parsed.socialLinks, {}),
      trustBadges: parseJsonField(parsed.trustBadges, []),
    }),
  });

  const enabledLocales = await localeService.listEnabled();
  await syncEntityTranslationsFromForm(formData, "CompanyInfo", "default", enabledLocales);

  revalidateMarketingHome();
  revalidatePath("/admin/company");
}
