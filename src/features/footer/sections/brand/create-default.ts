import type { FooterColumn } from "../../types";
import { newSectionId } from "../shared";

export function createBrandDefault(partial?: Partial<FooterColumn>): FooterColumn {
  return {
    id: newSectionId(),
    type: "brand",
    enabled: true,
    title: "",
    links: [],
    ...partial,
  };
}
