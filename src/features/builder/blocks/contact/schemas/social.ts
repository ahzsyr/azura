import { z } from "zod";
import { contactCardBaseSchema, newContactId } from "./common";

export const socialItemSchema = z.object({
  id: z.string(),
  icon: z.string().default(""),
  platform: z.string().default(""),
  url: z.string().default(""),
  label: z.string().default(""),
});

export type SocialItem = z.infer<typeof socialItemSchema>;

export const contactSocialPropsSchema = contactCardBaseSchema.extend({
  layout: z.enum(["row", "grid", "vertical"]).default("row"),
  iconShape: z.enum(["circle", "rounded", "square"]).default("circle"),
  iconSize: z.enum(["sm", "md", "lg"]).default("md"),
  gap: z.enum(["sm", "md", "lg"]).default("md"),
  hoverEffect: z.enum(["none", "scale", "fill", "color"]).default("scale"),
  showLabels: z.boolean().default(false),
  showFollowBtn: z.boolean().default(false),
  responseNote: z.string().default(""),
  items: z.array(socialItemSchema).default([]),
});

export type ContactSocialProps = z.infer<typeof contactSocialPropsSchema>;

export function emptySocialItem(): SocialItem {
  return {
    id: newContactId("cs"),
    icon: "globe",
    platform: "",
    url: "",
    label: "",
  };
}
