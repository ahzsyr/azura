import type { FooterSectionMetadata } from "../types";

export const legalMetadata: FooterSectionMetadata = {
  type: "legal",
  version: 1,
  label: "Legal links",
  description: "Privacy, terms, and policy links.",
  icon: "Scale",
  fields: { heading: true, links: true, visibility: true },
};
