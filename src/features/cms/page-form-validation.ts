import { cmsPageSchema } from "@/schemas/cms";
import type { ContentStatus } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { extractLegacyColumns } from "@/features/translation/form-fields";

type PageFormFields = {
  slug: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string;
  excerptAr: string;
  templateKey: string;
  status: ContentStatus;
};

const FIELD_LABELS: Record<string, string> = {
  slug: "Slug",
  titleEn: "English title",
  titleAr: "Arabic title",
  excerptEn: "English excerpt",
  excerptAr: "Arabic excerpt",
  templateKey: "Template key",
  status: "Status",
};

function friendlyMessage(path: string, issue: { message: string; code: string }): string {
  const label = FIELD_LABELS[path] ?? path;
  if (path === "titleEn" && issue.code === "too_small") return "English title is required.";
  if (path === "titleAr" && issue.code === "too_small") return "Arabic title is required.";
  if (path === "slug" && issue.code === "too_small") return "Slug is required.";
  if (path === "slug" && issue.code === "invalid_string") {
    return "Slug must be lowercase alphanumeric with hyphens.";
  }
  return `${label}: ${issue.message}`;
}

export function toPageFormPayload(fields: PageFormFields) {
  const excerptEn = fields.excerptEn.trim();
  const excerptAr = fields.excerptAr.trim();
  const templateKey = fields.templateKey.trim();

  return {
    slug: fields.slug.trim(),
    titleEn: fields.titleEn.trim(),
    titleAr: fields.titleAr.trim(),
    excerptEn: excerptEn || undefined,
    excerptAr: excerptAr || undefined,
    templateKey: templateKey || undefined,
    status: fields.status,
  };
}

export function getPageFormValidationError(fields: PageFormFields): string | null {
  const result = cmsPageSchema.safeParse(toPageFormPayload(fields));
  if (result.success) return null;
  const first = result.error.issues[0];
  const path = first.path[0]?.toString() ?? "form";
  return friendlyMessage(path, first);
}

export function parseCmsPageFormData(formData: FormData, locales: PublicLocale[] = []) {
  const textField = (key: string) => String(formData.get(key) ?? "").trim();

  const titleLegacy =
    locales.length > 0 ? extractLegacyColumns(formData, locales, "title") : {};
  const excerptLegacy =
    locales.length > 0 ? extractLegacyColumns(formData, locales, "excerpt") : {};

  const payload = {
    slug: textField("slug"),
    titleEn: titleLegacy.titleEn ?? textField("titleEn"),
    titleAr: titleLegacy.titleAr ?? textField("titleAr"),
    excerptEn: (excerptLegacy.excerptEn ?? textField("excerptEn")) || undefined,
    excerptAr: (excerptLegacy.excerptAr ?? textField("excerptAr")) || undefined,
    templateKey: textField("templateKey") || undefined,
    status: (formData.get("status") as string | null) ?? "DRAFT",
  };

  const result = cmsPageSchema.safeParse(payload);
  if (!result.success) {
    const messages = result.error.issues.map((issue) => {
      const path = issue.path[0]?.toString() ?? "form";
      return friendlyMessage(path, issue);
    });
    throw new Error(messages.join(" "));
  }

  return result.data;
}
