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
import { getFactoryCompanyInfoFields } from "@/config/factory-defaults";
import type { CompanyInfo } from "@prisma/client";

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

function readCompanyFormValue(formData: FormData, key: string, fallback: string): string {
  if (!formData.has(key)) return fallback;
  const raw = formData.get(key);
  if (raw === null) return fallback;
  return String(raw);
}

function buildCompanyFormPayload(formData: FormData, existing: CompanyInfo | null) {
  const defaults = getFactoryCompanyInfoFields();
  const base = existing ?? defaults;
  return {
    name: readCompanyFormValue(formData, "name", base.name ?? defaults.name),
    taglineEn: readCompanyFormValue(formData, "taglineEn", base.taglineEn ?? defaults.taglineEn),
    taglineAr: readCompanyFormValue(formData, "taglineAr", base.taglineAr ?? defaults.taglineAr),
    storyEn: readCompanyFormValue(formData, "storyEn", base.storyEn ?? defaults.storyEn),
    storyAr: readCompanyFormValue(formData, "storyAr", base.storyAr ?? defaults.storyAr),
    missionEn: readCompanyFormValue(formData, "missionEn", base.missionEn ?? defaults.missionEn),
    missionAr: readCompanyFormValue(formData, "missionAr", base.missionAr ?? defaults.missionAr),
    visionEn: readCompanyFormValue(formData, "visionEn", base.visionEn ?? defaults.visionEn),
    visionAr: readCompanyFormValue(formData, "visionAr", base.visionAr ?? defaults.visionAr),
    valuesEn: readCompanyFormValue(
      formData,
      "valuesEn",
      JSON.stringify(base.valuesEn ?? defaults.valuesEn),
    ),
    valuesAr: readCompanyFormValue(
      formData,
      "valuesAr",
      JSON.stringify(base.valuesAr ?? defaults.valuesAr),
    ),
    registrationNo: readCompanyFormValue(
      formData,
      "registrationNo",
      base.registrationNo ?? defaults.registrationNo,
    ),
    licenseInfo: readCompanyFormValue(formData, "licenseInfo", base.licenseInfo ?? defaults.licenseInfo),
    addressEn: readCompanyFormValue(formData, "addressEn", base.addressEn ?? defaults.addressEn),
    addressAr: readCompanyFormValue(formData, "addressAr", base.addressAr ?? defaults.addressAr),
    phone: readCompanyFormValue(formData, "phone", base.phone ?? defaults.phone),
    whatsapp: readCompanyFormValue(formData, "whatsapp", base.whatsapp ?? defaults.whatsapp),
    email: readCompanyFormValue(formData, "email", base.email ?? defaults.email),
    officeHoursEn: readCompanyFormValue(
      formData,
      "officeHoursEn",
      base.officeHoursEn ?? defaults.officeHoursEn,
    ),
    officeHoursAr: readCompanyFormValue(
      formData,
      "officeHoursAr",
      base.officeHoursAr ?? defaults.officeHoursAr,
    ),
    socialLinks: readCompanyFormValue(
      formData,
      "socialLinks",
      JSON.stringify(base.socialLinks ?? defaults.socialLinks),
    ),
    trustBadges: readCompanyFormValue(
      formData,
      "trustBadges",
      JSON.stringify(base.trustBadges ?? defaults.trustBadges),
    ),
  };
}

export async function updateCompanyInfo(formData: FormData) {
  await requireAdmin();

  try {
  const existing = await prisma.companyInfo.findUnique({ where: { id: "default" } });
  const payload = buildCompanyFormPayload(formData, existing);


  const parsed = companyInfoSchema.parse(payload);

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
  } catch (error) {
    console.error("[updateCompanyInfo]", error);
    throw error instanceof Error
      ? error
      : new Error("Could not save company info. Check required fields and try again.");
  }
}
