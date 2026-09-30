export type IconSource = "BUILTIN" | "CUSTOM" | "FONT";
export type IconType = "COMPONENT" | "SVG" | "FONT";

export type BuiltinIconId =
  | "arrow-left"
  | "arrow-right"
  | "chevron-left"
  | "chevron-right"
  | "menu"
  | "x"
  | "plus"
  | "minus"
  | "check"
  | "search"
  | "home"
  | "user"
  | "settings"
  | "edit"
  | "trash"
  | "upload"
  | "download"
  | "external-link"
  | "link"
  | "info"
  | "help"
  | "alert-circle"
  | "mail"
  | "phone"
  | "calendar"
  | "globe";

export type IconLibraryId = string;
export type IconAssetId = string;

export type IconPickResult = {
  type: "icon";
  iconId: IconAssetId;
  // This matches the unified picker convention and is stable in storage.
  source: "builtin" | "custom" | "font";
};

export type IconListItem = {
  id: string;
  name: string;
  slug: string;
  source: "builtin" | "custom" | "font";
  category?: string | null;
  type?: string;
};

