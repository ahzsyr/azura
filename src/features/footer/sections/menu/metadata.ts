import type { FooterSectionMetadata } from "../types";

export const menuMetadata: FooterSectionMetadata = {
  type: "menu",
  version: 1,
  label: "Navigation",
  description: "Custom links or links pulled from header menus and catalog.",
  icon: "Menu",
  fields: { heading: true, links: true, menuSource: true, visibility: true },
};
