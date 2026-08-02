import type { FooterColumn } from "../../types";
import { newSectionId } from "../shared";

export function createLegalDefault(partial?: Partial<FooterColumn>): FooterColumn {
  return {
    id: newSectionId(),
    type: "legal",
    enabled: true,
    title: "Legal",
    menuSource: "custom",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
    ...partial,
  };
}
