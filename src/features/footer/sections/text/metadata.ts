import type { FooterSectionMetadata } from "../types";

export const textMetadata: FooterSectionMetadata = {
  type: "text",
  version: 1,
  label: "Text block",
  description: "Freeform heading and body text.",
  icon: "AlignLeft",
  fields: { heading: true, body: true, visibility: true },
};
