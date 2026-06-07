import { resolveComparisonForType } from "@/features/comparison/comparison-schema-resolver";
import type { ContentFieldDefinition } from "@/features/content/types";

export type CompareCardProps = {
  contentTypeSlug: string;
  maxItems: number;
  label?: string;
};

export function getComparePropsForType(input: {
  slug: string;
  fieldSchema: ContentFieldDefinition[];
  adminConfig: Record<string, unknown>;
  locale?: string;
}): CompareCardProps | undefined {
  const { comparable, config } = resolveComparisonForType({
    fieldSchema: input.fieldSchema,
    adminConfig: input.adminConfig,
  });
  if (!comparable) return undefined;
  const locale = input.locale ?? "en";
  return {
    contentTypeSlug: input.slug,
    maxItems: config.comparisonSettings.maxItems,
    label: locale.startsWith("ar") ? "قارن" : "Compare",
  };
}
