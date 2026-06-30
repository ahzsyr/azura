import { z } from "zod";
import {
  normalizePopupItem,
  popupItemSchema,
  type PopupItem,
} from "@/features/popups/popup.schema";

export const sitePopupsSchema = z.object({
  enabled: z.boolean().default(false),
  items: z.array(popupItemSchema).default([]),
});

export type SitePopupsSettings = z.infer<typeof sitePopupsSchema>;

export const DEFAULT_SITE_POPUPS: SitePopupsSettings = {
  enabled: false,
  items: [],
};

export function normalizeSitePopupsItems(raw: unknown): PopupItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => normalizePopupItem(item, index))
    .filter((item): item is PopupItem => item !== null);
}

export function parseSitePopupsSettings(raw: unknown): SitePopupsSettings {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_SITE_POPUPS;
  }

  const record = raw as Record<string, unknown>;
  const items = normalizeSitePopupsItems(record.items);

  const parsed = sitePopupsSchema.safeParse({
    enabled: record.enabled === true,
    items,
  });

  return parsed.success ? parsed.data : DEFAULT_SITE_POPUPS;
}
