import type { MegaMenuChildDisplayType, MegaMenuCardMedia, MenuItem } from "./types";

/** Builder choices for how a child appears inside a mega menu. */
export type ChildMediaChoice = "automatic" | "list" | "card-image" | "card-icon" | "icon-only";

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
  if (display === "automatic") return "automatic";
  if (display === "list") return "list";
  if (display === "icon") return "icon-only";
  if (display === "card" && item.megaMenuCardMedia === "icon") return "card-icon";
  return "card-image";
}

export function childMediaChoicePatch(
  choice: ChildMediaChoice,
  previousDisplay?: MegaMenuChildDisplayType | string,
): Pick<MenuItem, "megaMenuChildDisplayType" | "megaMenuCardMedia"> {
  const previous = normalizeDisplay(previousDisplay);
  switch (choice) {
    case "automatic":
      return { megaMenuChildDisplayType: undefined, megaMenuCardMedia: undefined };
    case "list":
      return { megaMenuChildDisplayType: "list", megaMenuCardMedia: undefined };
    case "card-icon":
      return { megaMenuChildDisplayType: "card", megaMenuCardMedia: "icon" };
    case "icon-only":
      return { megaMenuChildDisplayType: "icon", megaMenuCardMedia: undefined };
    case "card-image": {
      const media: MegaMenuCardMedia = "image";
      return {
        megaMenuChildDisplayType: previous === "image" ? "image" : "card",
        megaMenuCardMedia: media,
      };
    }
  }
}

export function childMediaChoiceShowsImagePicker(choice: ChildMediaChoice): boolean {
  return choice === "card-image";
}
