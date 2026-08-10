import type { BlockType } from "@/types/builder";

export const CONTACT_BLOCK_TYPES = [
  "contactMap",
  "contactLocation",
  "contactPhone",
  "contactSocial",
  "contactSection",
] as const;

export type ContactBlockType = (typeof CONTACT_BLOCK_TYPES)[number];

export function isContactBlock(type: string): type is ContactBlockType {
  return (CONTACT_BLOCK_TYPES as readonly string[]).includes(type);
}

export function isContactLeafBlock(
  type: string,
): type is Exclude<ContactBlockType, "contactSection"> {
  return isContactBlock(type) && type !== "contactSection";
}
