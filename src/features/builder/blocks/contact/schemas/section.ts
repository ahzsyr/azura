import { z } from "zod";
import { contactThemeSchema } from "./common";

const columnRatioEnum = z.enum(["50/50", "40/60", "60/40", "30/70", "70/30", "stacked"]);

/**
 * Composition block — children live in `block.children`.
 * `leftSlotIds` / `rightSlotIds` route child block IDs into columns.
 */
export const contactSectionPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  desktopLayout: columnRatioEnum.default("60/40"),
  tabletLayout: z.enum(["stacked", "sideBySide"]).default("sideBySide"),
  leftSlotIds: z.array(z.string()).default([]),
  rightSlotIds: z.array(z.string()).default([]),
  theme: contactThemeSchema.default({}),
});

export type ContactSectionProps = z.infer<typeof contactSectionPropsSchema>;
