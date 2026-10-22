import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyBrowserTint } from "@/lib/theme/browser-tint/apply";
import type { TintAttrs } from "@/lib/theme/browser-tint/resolve";

describe("applyBrowserTint", () => {
  it("writes attributes and variables and no element backgrounds", () => {
    const vars: Record<string, string> = {};
    const attrs: Record<string, string> = {};
    const documentMock = {
      documentElement: {
        getAttribute(name: string) {
          return attrs[name] ?? null;
        },
        setAttribute(name: string, value: string) {
          attrs[name] = value;
        },
        style: {
          getPropertyValue(name: string) {
            return vars[name] ?? "";
          },
          setProperty(name: string, value: string) {
            vars[name] = value;
          },
        },
      },
    };
    (globalThis as { document?: typeof documentMock }).document = documentMock;

    const plan: TintAttrs = {
      top: "page",
      bottom: "page",
      topColor: "#fafafa",
      bottomColor: "#fafafa",
      gradient: "linear-gradient(to bottom, #fafafa 0%, transparent 100%)",
      htmlBackground: "transparent",
      pad: "off",
    };
    applyBrowserTint(plan);

    assert.equal(attrs["data-tint-top"], "page");
    assert.equal(attrs["data-tint-bottom"], "page");
    assert.equal(attrs["data-tint-pad"], "off");
    assert.equal(vars["--az-tint-top-color"], "#fafafa");
    assert.equal(vars["--az-tint-bottom-color"], "#fafafa");
    assert.equal(vars["--az-tint-html-bg"], "transparent");
    assert.equal("backgroundColor" in documentMock.documentElement.style, false);
  });
});