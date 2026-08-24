import { cmsPageSchema } from "@/schemas/cms";
import type { ContentStatus } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { getDefaultLocaleFieldFromForm } from "@/features/translation/form-fields";

type PageFormFields = {
  slug: string;
  templateKey: string;
  status: ContentStatus;
};

const FIELD_LABELS: Record<string, string> = {
  slug: "Slug",
  templateKey: "Template key",
  status: "Status",
  title: "Title",
};

function friendlyMessage(path: string, issue: { message: string; code: string }): string {
  const label = FIELD_LABELS[path] ?? path;
  if (path === "title" && issue.code === "too_small") return "Title is required for the default language.";
  if (path === "slug" && issue.code === "too_small") return "Slug is required.";
  if (path === "slug" && issue.code === "invalid_string") {
    return "Slug must be lowercase alphanumeric with hyphens.";
  }
  return `${label}: ${issue.message}`;
}

export function toPageFormPayload(fields: PageFormFields) {
  return {
    slug: fields.slug.trim(),
    templateKey: fields.templateKey.trim() || undefined,
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

  const result = cmsPageSchema.safeParse({
    slug: textField("slug"),
    templateKey: textField("templateKey") || undefined,
    status: (formData.get("status") as string | null) ?? "DRAFT",
  });

  if (!result.success) {
    const messages = result.error.issues.map((issue) => {
      const path = issue.path[0]?.toString() ?? "form";
      return friendlyMessage(path, issue);
    });
    throw new Error(messages.join(" "));
  }

  const defaultTitle = locales.length
    ? getDefaultLocaleFieldFromForm(formData, locales, "title")
    : textField("titleEn") || textField("title");
  if (!defaultTitle) {
    throw new Error("Title is required for the default language.");
  }

  return result.data;
}
