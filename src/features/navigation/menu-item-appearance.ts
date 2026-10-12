import type { MegaMenuChildDisplayType, MenuItem } from "./types";

/** Builder choices for how a child appears inside a mega menu. */
export type ChildMediaChoice = "none" | "icon" | "photo";

function normalizeDisplay(value: string | undefined): MegaMenuChildDisplayType {
  if (value === "link") return "list";
  if (value === "featured" || value === "product") return "card";
  if (value === "list" || value === "icon" || value === "image" || value === "card" || value === "automatic") {
    return value;
  }
  return "automatic";
}

export function readChildMediaChoice(
  item: Pick<MenuItem, "megaMenuChildDisplayType" | "megaMenuCardMedia">,
): ChildMediaChoice {
  const display = normalizeDisplay(item.megaMenuChildDisplayType);
  if (display === "icon") return "icon";
  if (display === "card" && item.megaMenuCardMedia === "icon") return "icon";
  if (display === "image" || display === "card") return "photo";
  return "none";
}

export function childMediaChoicePatch(
  choice: ChildMediaChoice,
): Pick<MenuItem, "megaMenuChildDisplayType" | "megaMenuCardMedia"> {
  switch (choice) {
    case "none":
      return { megaMenuChildDisplayType: "list", megaMenuCardMedia: undefined };
    case "icon":
      return { megaMenuChildDisplayType: "icon", megaMenuCardMedia: undefined };
    case "photo":
      return { megaMenuChildDisplayType: "image", megaMenuCardMedia: "image" };
  }
}

export function childMediaChoiceShowsImagePicker(choice: ChildMediaChoice): boolean {
  return choice === "photo";
}
