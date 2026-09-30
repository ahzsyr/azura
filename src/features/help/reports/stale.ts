import type {
  HelpEntityDefinition,
  HelpEntityKind,
  HelpInventoryBundle,
  HelpStaleReport,
} from "@/features/help/inventory/types";

export function getHelpStaleReport(
  inventory: HelpInventoryBundle,
  definitions: Map<string, HelpEntityDefinition>
): HelpStaleReport {
  const items: HelpStaleReport["items"] = [];

  const check = (
    id: string,
    kind: HelpEntityKind,
    inventoryVersion: number,
    childIds: string[] = []
  ) => {
    const def = definitions.get(id);
    if (!def) return;
    if (def.reviewedAgainstInventoryVersion !== inventoryVersion) {
      items.push({
        id,
        kind,
        reason: `Inventory version ${inventoryVersion} does not match reviewedAgainstInventoryVersion ${def.reviewedAgainstInventoryVersion}.`,
      });
    }
    for (const childId of childIds) {
      if (!definitions.has(childId)) {
        items.push({
          id,
          kind,
          reason: `Referenced entity "${childId}" has no help definition.`,
        });
      }
    }
  };

  for (const page of inventory.pages) {
    check(page.id, "page", page.version, [
      ...(page.componentIds ?? []),
      ...(page.sectionIds ?? []),
      ...(page.fieldIds ?? []),
      ...(page.tableIds ?? []),
      ...(page.actionIds ?? []),
      ...(page.tabIds ?? []),
      ...(page.dialogIds ?? []),
    ]);
  }
  for (const component of inventory.components) {
    check(component.id, "component", component.version, component.fieldIds ?? []);
  }
  for (const section of inventory.sections) {
    check(section.id, "section", section.version, [
      ...(section.componentIds ?? []),
      ...(section.fieldIds ?? []),
    ]);
  }
  for (const field of inventory.fields) check(field.id, "field", field.version);
  for (const table of inventory.tables) check(table.id, "table", table.version);
  for (const action of inventory.actions) check(action.id, "action", action.version);
  for (const dialog of inventory.dialogs) check(dialog.id, "dialog", dialog.version);
  for (const tab of inventory.tabs) check(tab.id, "tab", tab.version);

  return { items };
}
