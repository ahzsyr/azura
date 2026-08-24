export * from "@/features/builder/blocks/contact/schemas/common";
export * from "@/features/builder/blocks/contact/schemas/map";
export * from "@/features/builder/blocks/contact/schemas/location";
export * from "@/features/builder/blocks/contact/schemas/phone";
export * from "@/features/builder/blocks/contact/schemas/social";
export * from "@/features/builder/blocks/contact/schemas/section";
export * from "@/features/builder/blocks/contact/fields";
export * from "@/features/builder/blocks/contact/views";
export * from "@/features/builder/blocks/contact/renderers";
export {
  ensureContactBlocksRegistered,
  getContactBlock,
  isContactBlock,
  registerContactBlock,
} from "@/features/builder/blocks/contact/contact-block-registry";
export { CONTACT_BLOCK_TYPES } from "@/features/builder/blocks/contact/contact-block-ids";
export type { ContactBlockType } from "@/features/builder/blocks/contact/contact-block-ids";
