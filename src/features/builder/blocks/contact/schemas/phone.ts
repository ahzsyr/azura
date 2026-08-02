import { z } from "zod";
import { contactCardBaseSchema, newContactId } from "./common";

export const contactPhoneItemSchema = z.object({
  id: z.string(),
  icon: z.string().default(""),
  itemTitle: z.string().default(""),
  subtitle: z.string().default(""),
  value: z.string().default(""),
  url: z.string().default(""),
  openNewTab: z.boolean().default(false),
  showCopyBtn: z.boolean().default(false),
  badge: z.string().default(""),
});

export type ContactPhoneItem = z.infer<typeof contactPhoneItemSchema>;

export const contactPhonePropsSchema = contactCardBaseSchema.extend({
  items: z.array(contactPhoneItemSchema).default([]),
});

export type ContactPhoneProps = z.infer<typeof contactPhonePropsSchema>;

export function emptyContactPhoneItem(): ContactPhoneItem {
  return {
    id: newContactId("cp"),
    icon: "headphones",
    itemTitle: "",
    subtitle: "",
    value: "",
    url: "",
    openNewTab: false,
    showCopyBtn: false,
    badge: "",
  };
}
