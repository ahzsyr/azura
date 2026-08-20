import type { FooterSectionMetadata } from "../types";

export const contactMetadata: FooterSectionMetadata = {
  type: "contact",
  version: 1,
  label: "Contact",
  description: "Phone, email, and address from company settings.",
  icon: "Phone",
  fields: { heading: true, visibility: true, companyData: true },
};
