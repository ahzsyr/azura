"use client";

import type { ComponentType } from "react";
import type { BlockNode, BlockType } from "@/types/builder";
import { ContactMapBlockFields } from "@/features/builder/blocks/contact/admin/contact-map-fields";
import { ContactLocationBlockFields } from "@/features/builder/blocks/contact/admin/contact-location-fields";
import { ContactPhoneBlockFields } from "@/features/builder/blocks/contact/admin/contact-phone-fields";
import { ContactSocialBlockFields } from "@/features/builder/blocks/contact/admin/contact-social-fields";
import { ContactSectionBlockFields } from "@/features/builder/blocks/contact/admin/contact-section-fields";
import {
  CONTACT_BLOCK_TYPES,
  isContactBlock,
  type ContactBlockType,
} from "@/features/builder/blocks/contact/contact-block-ids";

type EditorProps = { block: BlockNode; onChange: (block: BlockNode) => void };

export type ContactBlockRegistryEntry = {
  editor: ComponentType<EditorProps>;
};

const contactBlockRegistry = new Map<BlockType, ContactBlockRegistryEntry>();

export function registerContactBlock(type: BlockType, entry: ContactBlockRegistryEntry) {
  contactBlockRegistry.set(type, entry);
}

export function getContactBlock(type: BlockType): ContactBlockRegistryEntry | undefined {
  return contactBlockRegistry.get(type);
}

export { isContactBlock, CONTACT_BLOCK_TYPES };
export type { ContactBlockType };

/** Register all implemented contact editors (client-only). */
export function ensureContactBlocksRegistered() {
  if (contactBlockRegistry.size > 0) return;

  registerContactBlock("contactMap", { editor: ContactMapBlockFields });
  registerContactBlock("contactLocation", { editor: ContactLocationBlockFields });
  registerContactBlock("contactPhone", { editor: ContactPhoneBlockFields });
  registerContactBlock("contactSocial", { editor: ContactSocialBlockFields });
  registerContactBlock("contactSection", { editor: ContactSectionBlockFields });
}

ensureContactBlocksRegistered();
