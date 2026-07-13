import type { FooterSectionMetadata } from "../types";

export const socialMetadata: FooterSectionMetadata = {
  type: "social",
  version: 1,
  label: "Social",
  description: "Social profile links from company settings.",
  icon: "Share2",
  fields: { heading: true, visibility: true, links: true },
};
