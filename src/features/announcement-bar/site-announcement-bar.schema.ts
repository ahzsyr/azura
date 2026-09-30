import { z } from "zod";
import {
  announcementBarPropsSchema,
  DEFAULT_ANNOUNCEMENT_BAR_PROPS,
} from "@/features/announcement-bar/announcement-bar.schema";

export const siteAnnouncementBarSchema = z
  .object({
    enabled: z.boolean().default(false),
    suppressOnPagesWithBlock: z.boolean().default(true),
    dismissKey: z.string().default("announcement-bar-global"),
  })
  .merge(announcementBarPropsSchema);

export type SiteAnnouncementBarSettings = z.infer<typeof siteAnnouncementBarSchema>;

export const DEFAULT_SITE_ANNOUNCEMENT_BAR: SiteAnnouncementBarSettings =
  siteAnnouncementBarSchema.parse({
    enabled: false,
    suppressOnPagesWithBlock: true,
    dismissKey: "announcement-bar-global",
    ...DEFAULT_ANNOUNCEMENT_BAR_PROPS,
  });

export function parseSiteAnnouncementBarSettings(raw: unknown): SiteAnnouncementBarSettings {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_SITE_ANNOUNCEMENT_BAR;
  }
  const parsed = siteAnnouncementBarSchema.safeParse({
    ...DEFAULT_SITE_ANNOUNCEMENT_BAR,
    ...raw,
  });
  return parsed.success ? parsed.data : DEFAULT_SITE_ANNOUNCEMENT_BAR;
}
