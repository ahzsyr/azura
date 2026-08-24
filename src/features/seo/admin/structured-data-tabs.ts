export const STRUCTURED_DATA_TABS = [
  { id: "settings", label: "Pipeline settings" },
  { id: "readiness", label: "Readiness" },
  { id: "pages", label: "Stored JSON-LD" },
  { id: "audit", label: "Audit & preview" },
] as const;

export type StructuredDataTabId = (typeof STRUCTURED_DATA_TABS)[number]["id"];

export function isValidStructuredDataTab(id: string | null): id is StructuredDataTabId {
  return STRUCTURED_DATA_TABS.some((t) => t.id === id);
}
