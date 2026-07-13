import type { FooterColumn } from "../../types";
import { newSectionId } from "../shared";

export function createMenuDefault(partial?: Partial<FooterColumn>): FooterColumn {
  return {
    id: newSectionId(),
    type: "menu",
    enabled: true,
    title: "Quick links",
    menuSource: "custom",
    links: [
      { label: "Home", href: "/" },
      { label: "Products", href: "/products" },
      { label: "Contact", href: "/contact" },
    ],
    ...partial,
  };
}
