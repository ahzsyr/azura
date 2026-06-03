"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { messageFileExists, scaffoldMessageFile } from "@/i18n/message-files";
import { prisma } from "@/lib/prisma";
import { localeConfigSchema } from "@/schemas/locale";
import { revalidateLocales } from "@/services/cache";

function parseLocaleForm(formData: FormData) {
  return localeConfigSchema.parse({
    code: formData.get("code"),
    urlPrefix: formData.get("urlPrefix"),
    label: formData.get("label"),
    htmlLang: formData.get("htmlLang") || formData.get("urlPrefix"),
    dir: formData.get("dir") ?? "ltr",
    flag: formData.get("flag") || "🌐",
    dateLocale: formData.get("dateLocale") || "en-US",
    currency: formData.get("currency") || "USD",
    numberLocale: formData.get("numberLocale") || "en-US",
    isEnabled: formData.get("isEnabled") === "true",
    isDefault: formData.get("isDefault") === "true",
    sortOrder: formData.get("sortOrder") ?? 0,
  });
}

export type UpsertLocaleResult = {
  success: boolean;
  messageFileCreated?: boolean;
  messageFileWarning?: string;
};

export async function upsertLocaleAction(formData: FormData): Promise<UpsertLocaleResult> {
  await requireAdmin();
  const id = (formData.get("id") as string) || undefined;
  const parsed = parseLocaleForm(formData);

  if (parsed.isDefault) {
    await prisma.localeConfig.updateMany({ data: { isDefault: false } });
  }

  const isCreate = !id;

  if (id) {
    await prisma.localeConfig.update({
      where: { id },
      data: parsed,
    });
  } else {
    await prisma.localeConfig.create({ data: parsed });
  }

  let messageFileCreated = false;
  let messageFileWarning: string | undefined;

  const hasMessages = await messageFileExists(parsed.code);
  if (!hasMessages) {
    if (isCreate) {
      const scaffold = await scaffoldMessageFile(parsed.code);
      messageFileCreated = scaffold.created;
      if (!scaffold.created) {
        messageFileWarning = `messages/${parsed.code}.json is missing. Add UI strings for this language.`;
      }
    } else {
      messageFileWarning = `messages/${parsed.code}.json is missing. Add UI strings for this language.`;
    }
  }

  revalidateLocales();
  revalidatePath("/admin/languages");

  return {
    success: true,
    messageFileCreated,
    messageFileWarning,
  };
}

export async function deleteLocaleAction(id: string) {
  await requireAdmin();
  const row = await prisma.localeConfig.findUnique({ where: { id } });
  if (!row) throw new Error("Locale not found");
  if (row.isDefault) throw new Error("Cannot delete the default locale");

  await prisma.localeConfig.delete({ where: { id } });
  revalidateLocales();
  revalidatePath("/admin/languages");
  return { success: true };
}

export async function setDefaultLocaleAction(id: string) {
  await requireAdmin();
  await prisma.localeConfig.updateMany({ data: { isDefault: false } });
  await prisma.localeConfig.update({ where: { id }, data: { isDefault: true, isEnabled: true } });
  revalidateLocales();
  revalidatePath("/admin/languages");
  return { success: true };
}

export async function toggleLocaleAction(id: string, isEnabled: boolean) {
  await requireAdmin();
  const row = await prisma.localeConfig.findUnique({ where: { id } });
  if (!row) throw new Error("Locale not found");
  if (row.isDefault && !isEnabled) throw new Error("Cannot disable the default locale");

  await prisma.localeConfig.update({ where: { id }, data: { isEnabled } });
  revalidateLocales();
  revalidatePath("/admin/languages");
  return { success: true };
}

export async function reorderLocalesAction(orderedIds: string[]) {
  await requireAdmin();
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.localeConfig.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  revalidateLocales();
  revalidatePath("/admin/languages");
  return { success: true };
}
