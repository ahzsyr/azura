import type { FooterColumn } from "../../types";
import { newSectionId } from "../shared";

export function createSocialDefault(partial?: Partial<FooterColumn>): FooterColumn {
  return {
    id: newSectionId(),
    type: "social",
    enabled: true,
    title: "Follow us",
    socialSource: "company",
    socialStyle: "icons",
    socialIconSize: "md",
    socialLayout: "horizontal",
    links: [],
    ...partial,
  };
}
