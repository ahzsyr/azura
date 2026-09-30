import type { FooterColumn } from "../../types";
import { newSectionId } from "../shared";

export function createTextDefault(partial?: Partial<FooterColumn>): FooterColumn {
  return {
    id: newSectionId(),
    type: "text",
    enabled: true,
    title: "New section",
    body: "",
    links: [],
    ...partial,
  };
}
