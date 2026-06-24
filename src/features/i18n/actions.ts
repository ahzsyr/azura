"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { requireAdmin } from "@/features/auth/guards";
import { prisma } from "@/lib/prisma";
import { localeConfigSchema } from "@/schemas/locale";
import { revalidateLocales } from "@/services/cache";
import { scaffoldLocaleTranslationsAction } from "@/features/translation/actions";
import { scaffoldMessageFile } from "@/i18n/message-files";
import { refreshMiddlewareManifestBestEffort } from "@/features/setup/refresh-middleware-manifest.server";

function debugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
) {
}

function formatLocaleFormError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(" ");
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(", ")
      : String(error.meta?.target ?? "field");
    if (target.includes("code")) {
      return "A language with this code already exists. Edit the existing language instead of creating a new one.";
    }
    if (target.includes("urlPrefix")) {
      return "This URL prefix is already in use by another language.";
    }
    return "A language with these settings already exists.";
  }
  if (error instanceof Error) return error.message;
  return "Failed to save locale";
}

function parseLocaleForm(formData: FormData) {
  const urlPrefix = String(formData.get("urlPrefix") ?? "").trim();
  const htmlLangRaw = String(formData.get("htmlLang") ?? "").trim();

  const parsed = localeConfigSchema.safeParse({
    code: formData.get("code"),
    urlPrefix,
    label: formData.get("label"),
    htmlLang: htmlLangRaw || urlPrefix,
    dir: formData.get("dir") ?? "ltr",
    flag: formData.get("flag") || "🌐",
    dateLocale: formData.get("dateLocale") || "en-US",
    currency: formData.get("currency") || "USD",
    numberLocale: formData.get("numberLocale") || "en-US",
    isEnabled: formData.get("isEnabled") === "true",
    isDefault: formData.get("isDefault") === "true",
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data;
}

export type UpsertLocaleResult = {
  success: boolean;
  error?: string;
};

export async function upsertLocaleAction(formData: FormData): Promise<UpsertLocaleResult> {
  const actionStartedAt = Date.now();
  try {
    await requireAdmin();
    const id = (formData.get("id") as string) || undefined;
    const parsed = parseLocaleForm(formData);
    debugLog("H2", "actions.ts:upsertLocaleAction", "Action started", {
      id: id ?? null,
      code: parsed.code,
      urlPrefix: parsed.urlPrefix,
      isCreate: !id,
    });

    if (parsed.isDefault) {
      await prisma.localeConfig.updateMany({ data: { isDefault: false } });
    }

    const isCreate = !id;

    if (isCreate) {
      const [existingCode, existingPrefix] = await Promise.all([
        prisma.localeConfig.findUnique({ where: { code: parsed.code } }),
        prisma.localeConfig.findUnique({ where: { urlPrefix: parsed.urlPrefix } }),
      ]);

      debugLog("H1", "actions.ts:upsertLocaleAction", "Create pre-check", {
        id: id ?? null,
        code: parsed.code,
        urlPrefix: parsed.urlPrefix,
        existingCodeId: existingCode?.id ?? null,
        existingPrefixId: existingPrefix?.id ?? null,
      });

      if (existingCode) {
        return {
          success: false,
          error: `Language code "${parsed.code}" already exists (${existingCode.label}). Edit the existing entry instead.`,
        };
      }
      if (existingPrefix) {
        return {
          success: false,
          error: `URL prefix "${parsed.urlPrefix}" is already used by ${existingPrefix.label} (${existingPrefix.code}).`,
        };
      }
    }

    if (id) {
      await prisma.localeConfig.update({
        where: { id },
        data: parsed,
      });
    } else {
      await prisma.localeConfig.create({ data: parsed });
      try {
        await scaffoldMessageFile(parsed.code);
      } catch (error) {
        debugLog("H2", "actions.ts:upsertLocaleAction", "Message file scaffold failed", {
          code: parsed.code,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (isCreate && parsed.code !== "en") {
      const scaffoldStartedAt = Date.now();
      try {
        const scaffoldResult = await scaffoldLocaleTranslationsAction(parsed.code);
        debugLog("H2", "actions.ts:upsertLocaleAction", "Auto-scaffold completed", {
          code: parsed.code,
          scaffoldMs: Date.now() - scaffoldStartedAt,
          scaffoldCount: scaffoldResult.count,
        });
      } catch (error) {
        debugLog("H2", "actions.ts:upsertLocaleAction", "Auto-scaffold failed", {
          code: parsed.code,
          scaffoldMs: Date.now() - scaffoldStartedAt,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    revalidateLocales();
    await refreshMiddlewareManifestBestEffort("locale upsert");
    revalidatePath("/admin/languages");
    revalidatePath("/admin/translations");

    debugLog("H2", "actions.ts:upsertLocaleAction", "Action completed", {
      code: parsed.code,
      totalMs: Date.now() - actionStartedAt,
      isCreate,
    });

    return { success: true };
  } catch (error) {
    debugLog("H3", "actions.ts:upsertLocaleAction", "Upsert failed", {
      error: error instanceof Error ? error.message : String(error),
      prismaCode: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null,
    });
    return { success: false, error: formatLocaleFormError(error) };
  }
}

export async function deleteLocaleAction(id: string) {
  await requireAdmin();
  const row = await prisma.localeConfig.findUnique({ where: { id } });
  if (!row) throw new Error("Locale not found");
  if (row.isDefault) throw new Error("Cannot delete the default locale");

  await prisma.localeConfig.delete({ where: { id } });
  revalidateLocales();
  await refreshMiddlewareManifestBestEffort("locale delete");
  revalidatePath("/admin/languages");
  return { success: true };
}

export async function setDefaultLocaleAction(id: string) {
  await requireAdmin();
  await prisma.localeConfig.updateMany({ data: { isDefault: false } });
  await prisma.localeConfig.update({ where: { id }, data: { isDefault: true, isEnabled: true } });
  revalidateLocales();
  await refreshMiddlewareManifestBestEffort("default locale change");
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
  await refreshMiddlewareManifestBestEffort("locale toggle");
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
  await refreshMiddlewareManifestBestEffort("locale reorder");
  revalidatePath("/admin/languages");
  return { success: true };
}
