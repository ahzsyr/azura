import type { HelpInventoryDialog } from "@/features/help/inventory/types";

export const INVENTORY_DIALOGS: HelpInventoryDialog[] = [
  {
    id: "dialog-reset-setup-wizard",
    kind: "dialog",
    version: 1,
    label: "Reset setup wizard",
    description: "Confirmation dialog on Site Access to reset the setup wizard.",
    actionIds: ["action-save"],
  },
  {
    id: "dialog-translations-import",
    kind: "dialog",
    version: 1,
    label: "Import translations",
    description: "TranslationsImportDialog on the Translations editor.",
  },
  {
    id: "dialog-header-menu-item",
    kind: "dialog",
    version: 1,
    label: "Menu item",
    description: "Add / edit header menu item modal.",
  },
  {
    id: "dialog-footer-section",
    kind: "dialog",
    version: 1,
    label: "Add footer section",
    description: "Choose footer section type when adding a section.",
  },
];
