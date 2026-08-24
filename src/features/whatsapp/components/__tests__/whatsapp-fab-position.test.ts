import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_WHATSAPP_SETTINGS } from "@/features/whatsapp/whatsapp.schema";
import {
  getFabPositionStyle,
  resolveFabPhysicalSide,
} from "@/features/whatsapp/components/whatsapp-styles";

describe("resolveFabPhysicalSide", () => {
  it("maps bottom-end to the right in LTR and the left in RTL", () => {
    assert.equal(resolveFabPhysicalSide("bottom-end", "ltr"), "right");
    assert.equal(resolveFabPhysicalSide("bottom-end", "rtl"), "left");
  });

  it("maps bottom-start to the left in LTR and the right in RTL", () => {
    assert.equal(resolveFabPhysicalSide("bottom-start", "ltr"), "left");
    assert.equal(resolveFabPhysicalSide("bottom-start", "rtl"), "right");
  });
});

describe("getFabPositionStyle", () => {
  const settings = {
    ...DEFAULT_WHATSAPP_SETTINGS.fab,
    position: "bottom-end" as const,
    offsetBottom: 28,
    offsetSide: 28,
  };

  it("anchors bottom-end with physical right in LTR", () => {
    const style = getFabPositionStyle(settings, "ltr");
    assert.equal(style.left, "auto");
    assert.match(String(style.right), /--wa-offset-side/);
    assert.equal(style.insetInlineStart, "auto");
    assert.equal(style.insetInlineEnd, "auto");
  });

  it("mirrors bottom-end to physical left when dir is RTL", () => {
    const style = getFabPositionStyle(settings, "rtl");
    assert.equal(style.right, "auto");
    assert.match(String(style.left), /--wa-offset-side/);
  });

  it("clears the opposite physical side when switching LTR to RTL", () => {
    const ltr = getFabPositionStyle(settings, "ltr");
    const rtl = getFabPositionStyle(settings, "rtl");
    assert.notEqual(ltr.left, rtl.left);
    assert.notEqual(ltr.right, rtl.right);
    assert.equal(rtl.right, "auto");
    assert.equal(ltr.left, "auto");
  });
});
