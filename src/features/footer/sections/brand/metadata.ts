import type { FooterSectionMetadata } from "../types";

export const brandMetadata: FooterSectionMetadata = {
  type: "brand",
  version: 1,
  label: "Brand",
  description: "Site name and tagline from Theme identity, with optional body text.",
  icon: "Building2",
  fields: { body: true, visibility: true },
};
