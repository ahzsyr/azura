import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyWorkspace,
  mergeWorkspaceImport,
} from "@/features/navigation/defaults";

describe("navigation runtime purity", () => {
  it("keeps legacy-shaped workspace data as persisted during merge", () => {
    const merged = mergeWorkspaceImport({
      version: 1,
      activeMenuKey: "mainMenu",
      menusDatabase: {
        mainMenu: {
          name: "Main",
          globalApply: "Both",
          items: [
            { id: "legacy-1", type: "link", label: "Packages", placement: "both", url: "/packages", children: [] },
            { id: "legacy-2", type: "link", label: "Visa", placement: "both", url: "/visa", children: [] },
          ],
        },
      },
      branding: {
        logoMode: "text",
        logoText: "AZ",
        logoImageLightUrl: "",
        logoImageDarkUrl: "",
        brandName: "AZURA",
        tagline: "solutions",
        showTagline: true,
      },
    });

    assert.equal(merged.branding.brandName, "AZURA");
    assert.equal(merged.menusDatabase.mainMenu.items[0]?.url, "/packages");
    assert.equal(merged.menusDatabase.mainMenu.items[1]?.url, "/visa");
  });

  it("creates safe empty workspace without starter menu links", () => {
    const workspace = createEmptyWorkspace();
    assert.equal(workspace.menusDatabase.mainMenu.items.length, 0);
  });
});
