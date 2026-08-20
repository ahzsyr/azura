import type { MegaMenuPanelLayout, MenuLayoutType } from "@/features/navigation/types";

export const FLYOUT_LAYOUT_OPTIONS: {
  value: MenuLayoutType | "";
  label: string;
  description: string;
}[] = [
  { value: "", label: "Dropdown", description: "Standard list" },
  { value: "dropdown", label: "Dropdown", description: "Standard list" },
  { value: "grid", label: "Grid mega", description: "Card / link grid" },
  { value: "mixed", label: "Mixed", description: "Panels + links" },
  { value: "columns", label: "Columns", description: "Multi-column" },
  { value: "tabbed", label: "Tabbed", description: "Tabbed mega" },
  { value: "icon", label: "Icon Layout", description: "Icon navigation" },
  { value: "sidebar", label: "Sidebar", description: "Left rail + panels" },
  { value: "panel", label: "Panel", description: "Rich panel without rail" },
];

/** Unique cards for UI (collapse empty + dropdown into one "Dropdown" card). */
export const FLYOUT_LAYOUT_CARDS = [
  { value: "dropdown" as const, label: "Dropdown", description: "Standard list" },
  { value: "grid" as const, label: "Grid mega", description: "Card / link grid" },
  { value: "mixed" as const, label: "Mixed", description: "Panels + links" },
  { value: "columns" as const, label: "Columns", description: "Multi-column" },
  { value: "tabbed" as const, label: "Tabbed", description: "Tabbed mega" },
  { value: "icon" as const, label: "Icon Layout", description: "Icon navigation" },
  { value: "sidebar" as const, label: "Sidebar", description: "Left rail + panels" },
  { value: "panel" as const, label: "Panel", description: "Rich panel without rail" },
];

export const MEGA_PANEL_LAYOUT_OPTIONS: {
  value: MegaMenuPanelLayout;
  label: string;
}[] = [
  { value: "links", label: "Links" },
  { value: "cards", label: "Cards" },
  { value: "featured", label: "Featured" },
  { value: "columns", label: "Columns" },
  { value: "iconGrid", label: "Icon Grid" },
  { value: "productGrid", label: "Product Grid" },
  { value: "mixed", label: "Mixed" },
];

export function layoutLabel(type: MenuLayoutType | "" | undefined): string {
  if (!type || type === "dropdown") return "Dropdown";
  if (type === "icon") return "Icon Layout";
  return FLYOUT_LAYOUT_CARDS.find((c) => c.value === type)?.label ?? type;
}
