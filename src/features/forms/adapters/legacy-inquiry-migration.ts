/**
 * Legacy inquiryForm block migration helper.
 * Creates a CONTACT FormTemplate definition equivalent to the hardcoded InquiryForm fields.
 */
import type { FormTemplateDefinition } from "@/features/forms/types";
import { formDefinitionToSchemaDocument, wrapSchemaAsFormDefinition } from "@/features/forms/adapters/schema-document.adapter";

export const LEGACY_INQUIRY_FORM_DEFINITION: FormTemplateDefinition = {
  fields: [
    { id: "name", type: "text", label: "Name", required: true },
    { id: "email", type: "email", label: "Email", required: true },
    { id: "phone", type: "phone", label: "Phone", required: false },
    { id: "message", type: "textarea", label: "Message", required: true },
  ],
  notifications: { receiverEmails: [], sendToSubmitter: true },
};

export function legacyInquiryToSchemaDocument() {
  return formDefinitionToSchemaDocument(LEGACY_INQUIRY_FORM_DEFINITION);
}

export function legacyInquiryToStoredDefinition(): Record<string, unknown> {
  const schema = legacyInquiryToSchemaDocument();
  return wrapSchemaAsFormDefinition(schema, {
    notifications: LEGACY_INQUIRY_FORM_DEFINITION.notifications,
  });
}

/** @deprecated Use contactFormBuilder block with FormTemplate instead of inquiryForm */
export const INQUIRY_FORM_MIGRATION_NOTE =
  "Replace inquiryForm blocks with contactFormBuilder + a CONTACT FormTemplate using legacyInquiryToStoredDefinition() as the starting definition.";
