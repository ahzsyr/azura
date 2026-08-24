import type { FooterColumn } from "../../types";
import { newSectionId } from "../shared";

export function createContactDefault(partial?: Partial<FooterColumn>): FooterColumn {
  return {
    id: newSectionId(),
    type: "contact",
    enabled: true,
    title: "Contact",
    showEmail: true,
    showPhone: true,
    showAddress: false,
    links: [],
    ...partial,
  };
}
