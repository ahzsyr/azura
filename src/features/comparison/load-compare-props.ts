import { getComparePropsForType } from "@/features/comparison/get-compare-props";
import type { CompareCardProps } from "@/features/comparison/get-compare-props";
import { resolveFieldSchema } from "@/features/content/content-type.registry";
import type { ContentTypeView } from "@/features/content/content-public.types";
import type { ContentFieldDefinition } from "@/features/content/types";

export type ComparePropsInput = {
  slug: string;
  fieldSchema: ContentFieldDefinition[] | unknown;
  adminConfig: Record<string, unknown> | unknown;
  locale?: string;
};

function parseAdminConfig(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export function loadComparePropsForContentType(
  input: ComparePropsInput
): CompareCardProps | undefined {
  const fieldSchema = resolveFieldSchema({ fieldSchema: input.fieldSchema }, input.slug);
  return getComparePropsForType({
    slug: input.slug,
    fieldSchema,
    adminConfig: parseAdminConfig(input.adminConfig),
    locale: input.locale,
  });
}

export function loadComparePropsFromContentTypeView(
  contentType: Pick<ContentTypeView, "slug" | "fieldSchema" | "adminConfig">,
  locale?: string
): CompareCardProps | undefined {
  return loadComparePropsForContentType({
    slug: contentType.slug,
    fieldSchema: contentType.fieldSchema,
    adminConfig: contentType.adminConfig,
    locale,
  });
}
