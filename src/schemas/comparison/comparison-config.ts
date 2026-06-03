import { z } from "zod";

export const comparisonAttributeOverrideSchema = z.object({
  key: z.string().min(1),
  labelEn: z.string().optional(),
  labelAr: z.string().optional(),
  compareOrder: z.coerce.number().optional(),
  compareGroup: z.string().optional(),
  highlightDifferences: z.boolean().optional(),
});

export const comparisonSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  maxItems: z.coerce.number().min(2).max(12).default(4),
  comparisonMode: z.enum(["table", "cards", "hybrid"]).default("hybrid"),
  attributes: z.array(comparisonAttributeOverrideSchema).optional(),
});

export const contentTypeComparisonConfigSchema = z.object({
  isComparable: z.boolean().default(false),
  comparisonGroup: z.string().optional(),
  comparisonPriority: z.coerce.number().optional(),
  comparisonSettings: comparisonSettingsSchema.default({
    enabled: true,
    maxItems: 4,
    comparisonMode: "hybrid",
  }),
});

export type ComparisonSettingsInput = z.infer<typeof comparisonSettingsSchema>;
export type ContentTypeComparisonConfigInput = z.infer<typeof contentTypeComparisonConfigSchema>;
