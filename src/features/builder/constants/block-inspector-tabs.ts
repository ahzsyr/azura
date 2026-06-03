export const BLOCK_INSPECTOR_TABS = [
  { id: "content", label: "Content" },
  { id: "lookAndFeel", label: "Look & Feel" },
  { id: "style", label: "Style" },
  { id: "responsive", label: "Responsive" },
  { id: "animation", label: "Animation" },
  { id: "visibility", label: "Visibility" },
  { id: "advanced", label: "Advanced" },
] as const;

export type BlockInspectorTabId = (typeof BLOCK_INSPECTOR_TABS)[number]["id"];

export const BLOCK_INSPECTOR_STORAGE_KEY = "block-inspector-active-tab";

export function readSavedInspectorTab(): BlockInspectorTabId {
  try {
    const v = localStorage.getItem(BLOCK_INSPECTOR_STORAGE_KEY);
    if (v && BLOCK_INSPECTOR_TABS.some((t) => t.id === v)) {
      return v as BlockInspectorTabId;
    }
  } catch {
    /* ignore */
  }
  return "content";
}
