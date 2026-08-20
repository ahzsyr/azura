import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { clearVisitorThemeDomOverrides } from "@/features/theme/engine/visitor-dom-cleanup";

function createStyleMap() {
  const props = new Map<string, string>();
  return {
    props,
    setProperty(key: string, value: string) {
      props.set(key, value);
    },
    removeProperty(key: string) {
      props.delete(key);
    },
  };
}

describe("clearVisitorThemeDomOverrides", () => {
  beforeEach(() => {
    const htmlStyle = createStyleMap();
    const html = {
      style: htmlStyle,
      dataset: {} as Record<string, string | undefined>,
    };
    const body = {
      dataset: {} as Record<string, string | undefined>,
    };
    const headChildren: Array<{ id?: string; remove: () => void }> = [];
    const visitorStyle = {
      id: "az-visitor-theme",
      remove() {
        const idx = headChildren.indexOf(visitorStyle);
        if (idx >= 0) headChildren.splice(idx, 1);
      },
    };
    headChildren.push(visitorStyle);

    (globalThis as { document?: object }).document = {
      documentElement: html,
      body,
      getElementById(id: string) {
        if (id === "az-visitor-theme") {
          return headChildren.find((node) => node.id === id) ?? null;
        }
        return null;
      },
    };
  });

  it("removes injected visitor theme style and bootstrap markers", () => {
    const doc = globalThis.document as {
      documentElement: {
        style: { props: Map<string, string>; removeProperty: (key: string) => void };
        dataset: Record<string, string | undefined>;
      };
      body: { dataset: Record<string, string | undefined> };
      getElementById: (id: string) => { id?: string } | null;
    };

    doc.documentElement.style.setProperty("--primary", "#047857");
    doc.documentElement.dataset.visitorThemeBootstrapped = "true";
    doc.body.dataset.cursor = "neon-dot";
    doc.body.dataset.bgEffect = "grid";

    clearVisitorThemeDomOverrides();

    assert.equal(doc.getElementById("az-visitor-theme"), null);
    assert.equal(doc.documentElement.dataset.visitorThemeBootstrapped, undefined);
    assert.equal(doc.body.dataset.cursor, undefined);
    assert.equal(doc.body.dataset.bgEffect, undefined);
    assert.equal(doc.documentElement.style.props.has("--primary"), false);
  });
});
