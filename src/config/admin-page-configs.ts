/**
 * Shared admin page configs (runtime contracts).
 * Inventory references these by key — expectedActions live here only.
 */

import type { AdminPageConfig } from "@/config/admin-page-config";
import { ACTIONLESS_DASHBOARD, ACTIONLESS_READONLY } from "@/config/admin-page-config";

export const ADMIN_PAGE_CONFIGS = {
  dashboard: ACTIONLESS_DASHBOARD,
  readOnly: ACTIONLESS_READONLY,
  list: {
    mode: "list",
    expectedActions: {},
  },
  cmsPageEditor: {
    mode: "editor",
    expectedActions: {
      save: "required",
      cancel: "required",
      preview: "optional",
      publish: "conditional",
    },
  },
  cmsPostEditor: {
    mode: "editor",
    expectedActions: {
      save: "required",
      cancel: "required",
      preview: "optional",
      publish: "conditional",
    },
  },
  contentItemEditor: {
    mode: "editor",
    expectedActions: {
      save: "required",
      cancel: "required",
      preview: "optional",
      publish: "conditional",
    },
  },
  productEditor: {
    mode: "editor",
    expectedActions: {
      save: "required",
      cancel: "required",
    },
  },
  collectionsEditor: {
    mode: "editor",
    expectedActions: {
      save: "required",
      cancel: "required",
      publish: "conditional",
      update: "conditional",
    },
  },
  formDesigner: {
    mode: "editor",
    expectedActions: {
      save: "required",
      cancel: "required",
      publish: "conditional",
    },
  },
  themeStudio: {
    mode: "editor",
    expectedActions: {
      save: "required",
      cancel: "required",
      publish: "required",
      preview: "optional",
      undo: "optional",
      redo: "optional",
    },
  },
  settingsSaveCancel: {
    mode: "settings",
    expectedActions: {
      save: "required",
      cancel: "required",
    },
  },
  settingsSaveOnly: {
    mode: "settings",
    expectedActions: {
      save: "required",
      cancel: "optional",
    },
  },
  settingsSavePublish: {
    mode: "settings",
    expectedActions: {
      save: "required",
      cancel: "required",
      publish: "conditional",
    },
  },
  searchSettings: {
    mode: "settings",
    expectedActions: {
      save: "required",
      cancel: "required",
      publish: "conditional",
      rebuildIndex: "optional",
    },
  },
  mediaLibrary: {
    mode: "editor",
    expectedActions: {
      save: "conditional",
      cancel: "conditional",
    },
  },
  entityEditor: {
    mode: "editor",
    expectedActions: {
      save: "required",
      cancel: "required",
      publish: "conditional",
    },
  },
  utility: {
    mode: "utility",
    expectedActions: {
      save: "optional",
    },
  },
} as const satisfies Record<string, AdminPageConfig>;

export type AdminPageConfigKey = keyof typeof ADMIN_PAGE_CONFIGS;
