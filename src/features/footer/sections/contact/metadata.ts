import type { FooterSectionMetadata } from "../types";

export const contactMetadata: FooterSectionMetadata = {
  type: "contact",
  version: 1,
  label: "Contact",
  description: "Company contact details plus extra phones, emails, text, and rich text.",
  icon: "Phone",
  fields: { heading: true, visibility: true, companyData: true },
};
