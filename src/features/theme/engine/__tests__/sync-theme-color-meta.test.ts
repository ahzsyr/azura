import { describe, it, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

type FakeMeta = {
  name: string;
  content: string;
  id?: string;
  style?: { backgroundColor: string };
  getAttribute: (name: string) => string | null;
  setAttribute: (name: string, value: string) => void;
  remove: () => void;
};

function installMinimalDocument() {
  const metas: FakeMeta[] = [];
  const styleProps: Record<string, string> = {};
  const bodyChildren: FakeMeta[] = [];

  const head = {
    appendChild(node: FakeMeta) {
      metas.push(node);
      return node;
    },
    querySelectorAll(selector: string) {
      if (selector !== 'meta[name="theme-color"]') return [];
      return metas.slice();
    },
  };

  const documentElement = {
    style: {
      getPropertyValue(name: string) {
        return styleProps[name] ?? "";
      },
      setProperty(name: string, value: string) {
        styleProps[name] = value;
      },
    },
  };

  const body = {
    style: {
      getPropertyValue() {
        return "";
      },
    },
    appendChild(node: FakeMeta) {
      bodyChildren.push(node);
      return node;
    },
  };

  const documentMock = {
    head,
    body,
    documentElement,
    getElementById() {
      return null;
    },
    createElement(tag: string): FakeMeta {
      if (tag !== "meta" && tag !== "div") throw new Error(`unexpected tag: ${tag}`);
      const attrs: Record<string, string> = {};
      const stylePropsLocal: Record<string, string> = {};
      const meta: FakeMeta = {
        name: "",
        content: "",
        id: "",
        style: {
          get backgroundColor() {
            return stylePropsLocal.backgroundColor ?? "";
          },
          set backgroundColor(value: string) {
            stylePropsLocal.backgroundColor = value;
          },
        },
        getAttribute(name: string) {
          return attrs[name] ?? null;
        },
        setAttribute(name: string, value: string) {
          attrs[name] = value;
          if (name === "content") meta.content = value;
          if (name === "id") meta.id = value;
        },
        remove() {
          const idx = metas.indexOf(meta);
          if (idx >= 0) metas.splice(idx, 1);
        },
      };
      return meta;
    },
    querySelectorAll(selector: string) {
      return head.querySelectorAll(selector);
    },
  };

  (globalThis as { document?: typeof documentMock }).document = documentMock;
  return { metas, documentMock, styleProps };
}

describe("syncThemeColorMeta", () => {
  let metas: FakeMeta[];
  let styleProps: Record<string, string>;

  before(() => {
    const installed = installMinimalDocument();
    metas = installed.metas;
    styleProps = installed.styleProps;
  });

  beforeEach(() => {
    metas.splice(0, metas.length);
    for (const key of Object.keys(styleProps)) delete styleProps[key];
  });

  afterEach(() => {
    metas.splice(0, metas.length);
  });

  it("forced dark writes the same color to all existing metas in place", async () => {
    const { syncThemeColorMeta } = await import("@/features/theme/engine/appearance");
    const light = document.createElement("meta");
    light.name = "theme-color";
    light.content = "#fafafa";
    light.setAttribute("media", "(prefers-color-scheme: light)");
    document.head.appendChild(light);

    const dark = document.createElement("meta");
    dark.name = "theme-color";
    dark.content = "#020408";
    dark.setAttribute("media", "(prefers-color-scheme: dark)");
    document.head.appendChild(dark);

    syncThemeColorMeta("dark", {
      mode: "dark",
      color: "#111111",
      lightColor: "#fafafa",
      darkColor: "#020408",
    });

    assert.equal(light.content, "#111111");
    assert.equal(dark.content, "#111111");
    assert.equal(metas.length, 2, "must not remove or recreate Next-owned metas");
    assert.equal(styleProps["--az-browser-chrome-tint"], "#111111");
  });

  it("system mode restores media-scoped light and dark colors", async () => {
    const { syncThemeColorMeta } = await import("@/features/theme/engine/appearance");
    const light = document.createElement("meta");
    light.name = "theme-color";
    light.content = "#111111";
    light.setAttribute("media", "(prefers-color-scheme: light)");
    document.head.appendChild(light);

    const dark = document.createElement("meta");
    dark.name = "theme-color";
    dark.content = "#111111";
    dark.setAttribute("media", "(prefers-color-scheme: dark)");
    document.head.appendChild(dark);

    syncThemeColorMeta("dark", {
      mode: "system",
      color: "#111111",
      lightColor: "#fafafa",
      darkColor: "#020408",
    });

    assert.equal(light.content, "#fafafa");
    assert.equal(dark.content, "#020408");
    assert.equal(styleProps["--az-browser-chrome-tint"], "#111111");
  });

  it("prefers explicit projection color over missing computed style", async () => {
    const { syncThemeColorMeta } = await import("@/features/theme/engine/appearance");
    const light = document.createElement("meta");
    light.name = "theme-color";
    light.content = "#fafafa";
    light.setAttribute("media", "(prefers-color-scheme: light)");
    document.head.appendChild(light);

    syncThemeColorMeta("dark", {
      mode: "dark",
      color: "#0a0a0a",
      lightColor: "#fafafa",
      darkColor: "#020408",
    });

    assert.equal(light.content, "#0a0a0a");
    assert.equal(styleProps["--az-browser-chrome-tint"], "#0a0a0a");
  });
});
