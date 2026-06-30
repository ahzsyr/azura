import { z } from "zod";
import { RESERVED_URL_PREFIXES } from "@/i18n/reserved-slugs";

export const localeConfigSchema = z.object({
  code: z.string().min(2).max(16).regex(/^[a-z0-9-]+$/),
  urlPrefix: z
    .string()
    .min(2)
    .max(16)
    .regex(/^[a-z0-9-]+$/)
    .refine((val) => !RESERVED_URL_PREFIXES.has(val), {
      message: "URL prefix conflicts with a site route or reserved slug",
    }),
  label: z.string().min(1).max(64),
  htmlLang: z.string().min(2).max(10).default("en"),
  dir: z.enum(["ltr", "rtl"]).default("ltr"),
  flag: z.string().max(8).default("🌐"),
  dateLocale: z.string().min(2).max(16).default("en-US"),
  currency: z.string().length(3).default("USD"),
  numberLocale: z.string().min(2).max(16).default("en-US"),
  isEnabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
});

export type LocaleConfigInput = z.infer<typeof localeConfigSchema>;
