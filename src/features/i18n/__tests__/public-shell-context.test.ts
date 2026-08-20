import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  if (request === "next/font/google") {
    const font = () => ({ className: "test-font", variable: "test-font-variable" });
    return {
      Amiri: font,
      Inter: font,
      Noto_Sans_Arabic: font,
      Plus_Jakarta_Sans: font,
    };
  }
  return originalLoad.call(this, request, ...args);
};

async function loadPublicShellContextModule() {
  return import("@/features/i18n/public-shell-context");
}

async function loadNavigationServiceModule() {
  return import("@/features/navigation/navigation.service");
}

describe("public shell fallbacks", () => {
  it("creates a renderable fallback shell context", async () => {
    const { createFallbackPublicShellContext } = await loadPublicShellContextModule();

    const shell = createFallbackPublicShellContext("en");

    assert.equal(shell.company, null);
    assert.equal(shell.direction, "ltr");
    assert.equal(shell.localeEntry?.urlPrefix, "en");
    assert.equal(shell.enabledLocales.length > 0, true);
    assert.equal(shell.headerWorkspace.activeMenuKey, "mainMenu");
    assert.equal(shell.headerWorkspace.menusDatabase.mainMenu.items.length, 0);
    assert.equal(shell.footerWorkspace.version, 1);
    assert.equal(shell.resolvedFooter.columns.length > 0, true);
    assert.equal(typeof shell.siteIdentity.brandName, "string");
  });

  it("uses safe-shell empty workspace when header load times out", async (t) => {
    const { loadHeaderWorkspaceForPublicShell } = await loadPublicShellContextModule();
    const { navigationService } = await loadNavigationServiceModule();
    t.mock.method(console, "error", () => {});
    t.mock.method(navigationService, "getWorkspaceForSite", async () => {
      throw new Error("headerWorkspace timed out after 2500ms");
    });

    const workspace = await loadHeaderWorkspaceForPublicShell({
      locale: "zz-timeout",
      theme: null,
      siteIdentity: { brandName: "BRT", tagline: "" },
    });

    assert.equal(workspace.menusDatabase.mainMenu.items.length, 0);
  });

  it("returns exact workspace from navigation service when load succeeds", async (t) => {
    const { loadHeaderWorkspaceForPublicShell } = await loadPublicShellContextModule();
    const { navigationService } = await loadNavigationServiceModule();
    const expectedWorkspace = {
      version: 1,
      activeMenuKey: "mainMenu",
      menusDatabase: {
        mainMenu: {
          name: "Main Menu",
          globalApply: "Both" as const,
          items: [{ id: "custom-1", type: "link", label: "Custom", placement: "both", url: "/custom", children: [] }],
        },
      },
      branding: {
        logoMode: "text" as const,
        logoText: "BRT",
        logoImageLightUrl: "",
        logoImageDarkUrl: "",
        brandName: "BRT",
        tagline: "",
        showTagline: false,
      },
      headerActions: [],
      settings: {
        headerStyle: "normal-compact" as const,
        headerBorderRadius: "lg" as const,
        menuType: "dropdown" as const,
        mobileType: "hamburger" as const,
        headerDesktopMode: "sticky" as const,
      },
    };
    t.mock.method(console, "info", () => {});
    t.mock.method(navigationService, "getWorkspaceForSite", async () => expectedWorkspace as never);

    const workspace = await loadHeaderWorkspaceForPublicShell({
      locale: "en-success",
      theme: null,
      siteIdentity: { brandName: "BRT", tagline: "" },
    });

    assert.deepEqual(workspace, expectedWorkspace);
  });

  it("falls back to the default tagline when locale resolution fails", async (t) => {
    const { resolveLocalizedSiteTagline } = await loadPublicShellContextModule();
    t.mock.method(console, "error", () => {});

    const tagline = await resolveLocalizedSiteTagline("en", "Default tagline", {
      resolvePrefixToCode: async () => {
        throw new Error("locale lookup unavailable");
      },
    });

    assert.equal(tagline, "Default tagline");
  });

  it("falls back to the default tagline when translation lookup fails", async (t) => {
    const { resolveLocalizedSiteTagline } = await loadPublicShellContextModule();
    t.mock.method(console, "error", () => {});

    const tagline = await resolveLocalizedSiteTagline("en", "Default tagline", {
      resolvePrefixToCode: async () => "en",
      resolveField: async () => {
        throw new Error("translation lookup unavailable");
      },
    });

    assert.equal(tagline, "Default tagline");
  });
});
